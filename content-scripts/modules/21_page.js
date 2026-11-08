 + content-voice-stt.js.
 * Same-world: localStorage cache + Tauri ai_proxy(/api/proxy/audio/transcribe).
 * Sole author provenance: WATransChat by @benedictusrey; STT logic from WATransChat.
 */
(() => {
	if (window.__WhatsNowVoiceSttInstalled) return;
	window.__WhatsNowVoiceSttInstalled = true;

	try {
		if (!document.getElementById('whatsnow-voice-stt-style')) {
			const st = document.createElement('style');
			st.id = 'whatsnow-voice-stt-style';
			st.textContent =
				'.wa-audio-to-text-ui{position:relative;z-index:0;box-sizing:border-box;}' +
				'.wa-audio-to-text-ui.wa-audio-to-text-ui--has-text{padding-bottom:26px!important;}';
			(document.head || document.documentElement).appendChild(st);
		}
	} catch (_) {}

	const BUTTON_ID_PREFIX = 'AudioToTextRecognizeButton-';
	const TEXT_ID_PREFIX = 'AudioToTextTranscription-';
	/** page.js(MAIN) 与 content.js(隔离环境) 通过 document 上的 CustomEvent 通信 */
	const AudioBus = document;
	let Msg = null;
	let getOrCreateURL = null;
	let isInitialized = false;
	/** 近期确认无缓存的 ID → 可重试时间戳，避免一次超时后永久不再加载 */
	const cacheMissUntil = new Map();
	const CACHE_MISS_COOLDOWN_MS = 12000;
	/** 正在转录中的 ID，此期间禁止缓存查询抢占结果监听 */
	const pendingTranscriptionIds = new Set();
	let voiceUiStrings = {
		recognize: '识别',
		recognizing: '识别中...',
		proOnly: '此功能仅专业版会员可用，请升级到专业版会员。',
		noTranscription: '(无转录文本)',
		audioFetchFailed: '获取音频数据失败: {detail}',
	};

	function cacheReplyEventName(id) {
		return `AudioToText:cacheReply:${id}`;
	}

	function resultEventName(id) {
		return `AudioToText:result:${id}`;
	}

	function buttonIdFor(msgId) {
		return BUTTON_ID_PREFIX + msgId;
	}

	function textIdFor(msgId) {
		return TEXT_ID_PREFIX + msgId;
	}

	function isCacheMissCooling(id) {
		if (!id) return false;
		const until = cacheMissUntil.get(id);
		if (!until) return false;
		if (Date.now() >= until) {
			cacheMissUntil.delete(id);
			return false;
		}
		return true;
	}

	function markCacheMiss(id) {
		if (!id) return;
		cacheMissUntil.set(id, Date.now() + CACHE_MISS_COOLDOWN_MS);
	}

	function clearCacheMiss(id) {
		if (id) cacheMissUntil.delete(id);
	}

	const AUDIO_TX_KEY_PREFIX = 'wa_audio_tx:';

	function invokeHost(cmd, args) {
		try {
			var inv =
				(window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke) ||
				(window.__TAURI_INTERNALS__ && window.__TAURI_INTERNALS__.invoke);
			if (typeof inv === 'function') return inv(cmd, args || {});
		} catch (_) {}
		return Promise.reject(new Error('invoke_unavailable'));
	}

	function emitBridgeEvent(eventName, detail) {
		if (!eventName) return;
		try {
			AudioBus.dispatchEvent(new CustomEvent(eventName, { detail }));
		} catch (_) {}
	}

	function audioTxStorageKeys(id) {
		const sid = String(id || '').trim();
		if (!sid) return [];
		const keys = [AUDIO_TX_KEY_PREFIX + sid, sid];
		try {
			const hex = sid.match(/[0-9A-Fa-f]{16,64}/);
			if (hex && hex[0]) {
				const h = hex[0];
				keys.push(AUDIO_TX_KEY_PREFIX + h, h);
				const u = h.toUpperCase();
				const l = h.toLowerCase();
				if (u !== h) keys.push(AUDIO_TX_KEY_PREFIX + u, u);
				if (l !== h && l !== u) keys.push(AUDIO_TX_KEY_PREFIX + l, l);
			}
		} catch (_) {}
		return Array.from(new Set(keys));
	}

	function isProOnlyErrorText(t) {
		return /专业版|Pro members only|pro only|upgrade to Pro|仅限专业|仅专业版/i.test(String(t || ''));
	}

	function readAudioTxCache(id) {
		const keys = audioTxStorageKeys(id);
		for (let i = 0; i < keys.length; i++) {
			try {
				const raw = localStorage.getItem(keys[i]);
				if (!raw) continue;
				const rec = JSON.parse(raw);
				if (rec && typeof rec === 'object' && (rec.transcription != null || rec.error)) {
					if (rec.error && isProOnlyErrorText(rec.transcription)) {
						removeAudioTxCache(id);
						return null;
					}
					return rec;
				}
			} catch (_) {}
		}
		return null;
	}

	function writeAudioTxCache(id, record) {
		if (!id || !record) return;
		try {
			if (record.error && isProOnlyErrorText(record.transcription)) {
				removeAudioTxCache(id);
				return;
			}
		} catch (_) {}
		const keys = audioTxStorageKeys(id);
		const payload = JSON.stringify(record);
		for (let i = 0; i < keys.length; i++) {
			try {
				localStorage.setItem(keys[i], payload);
			} catch (_) {}
		}
	}

	function removeAudioTxCache(id) {
		if (!id) return;
		const keys = audioTxStorageKeys(id);
		for (let i = 0; i < keys.length; i++) {
			try {
				localStorage.removeItem(keys[i]);
			} catch (_) {}
		}
	}

	function showNoPermissionNotice() {
		const msg = (voiceUiStrings && voiceUiStrings.proOnly) ||
			'此功能仅专业版会员可用，请升级到专业版会员。';
		try {
			if (typeof window.__whatsnowShowNotice === 'function') {
				window.__whatsnowShowNotice(msg);
				return;
			}
		} catch (_) {}
		try { if (window.__whatsnowNotice) window.__whatsnowNotice(msg); else if (window.__whatsnowAlert) window.__whatsnowAlert(msg); else if (window.appAlert) window.appAlert(msg); else alert(msg); } catch (_) {}
	}

	/** Extension: caps.voice_stt (or pro proxy). WATransChat: __whatsnowCan. */
	function checkPermissionOnce() {
		try {
			if (typeof window.__whatsnowCan === 'function') {
				return !!(
					window.__whatsnowCan('voice_stt') ||
					window.__whatsnowCan('ai_proxy')
				);
			}
		} catch (_) {}
		return false;
	}

	async function checkPermission() {
		let allowed = checkPermissionOnce();
		if (!allowed) {
			await new Promise((r) => setTimeout(r, 150));
			allowed = checkPermissionOnce();
		}
		return !!allowed;
	}

	async function requestCache(id) {
		return readAudioTxCache(id);
	}

	function clearCache(id) {
		clearCacheMiss(id);
		removeAudioTxCache(id);
	}

	function arrayBufferToBase64(buffer) {
		const bytes = new Uint8Array(buffer);
		const chunk = 0x8000;
		let binary = '';
		for (let i = 0; i < bytes.length; i += chunk) {
			binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
		}
		return btoa(binary);
	}

	/** Host POST api/proxy/audio/transcribe (extension PROXY_BASE_URL + /audio/transcribe). */
	async function transcribeAudioBase64(audioBase64, language) {
		const body = { audio: audioBase64 };
		if (language && typeof language === 'string' && language.trim()) {
			body.language = language.trim();
		}
		const result = await invokeHost('ai_proxy', {
			path: 'api/proxy/audio/transcribe',
			body: body,
			requireCap: 'ai_proxy',
		});
		const transcription = (
			(result && result.result && result.result.text) ||
			(result && result.text) ||
			(result && result.transcription) ||
			(result && result.result && result.result.transcription) ||
			(result && result.error && result.error.message) ||
			''
		);
		const error = !transcription || !!(result && result.error);
		return { transcription: String(transcription || ''), error: !!error };
	}

	try {
		window.__WhatsNowVoiceSttReady = true;
	} catch (_) {}

	const RECOGNIZE_BTN_COLOR = '#4b5563';
	const RECOGNIZE_ICON_SVG =
		'<svg class="icon" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="14" height="14" style="flex-shrink:0;fill:currentColor;" aria-hidden="true">' +
		'<path d="M512 153.6a51.2 51.2 0 0 1 51.063467 47.377067L563.2 204.8v614.4a51.2 51.2 0 0 1-102.263467 3.822933L460.8 819.2V204.8a51.2 51.2 0 0 1 51.2-51.2z m187.733333 128a51.2 51.2 0 0 1 51.063467 47.377067L750.933333 332.8v358.4a51.2 51.2 0 0 1-102.263466 3.822933L648.533333 691.2v-358.4a51.2 51.2 0 0 1 51.2-51.2z m-375.466666 0a51.2 51.2 0 0 1 51.063466 47.377067L375.466667 332.8v358.4a51.2 51.2 0 0 1-102.263467 3.822933L273.066667 691.2v-358.4a51.2 51.2 0 0 1 51.2-51.2zM136.533333 358.4a51.2 51.2 0 0 1 51.063467 47.377067L187.733333 409.6v204.8a51.2 51.2 0 0 1-102.263466 3.822933L85.333333 614.4V409.6a51.2 51.2 0 0 1 51.2-51.2z m750.933334 0a51.2 51.2 0 0 1 51.063466 47.377067L938.666667 409.6v204.8a51.2 51.2 0 0 1-102.263467 3.822933L836.266667 614.4V409.6a51.2 51.2 0 0 1 51.2-51.2z"></path>' +
		'</svg>';

	function refreshAllRecognizeButtonLabels() {
		try {
			const label = voiceUiStrings.recognize || '识别';
			document.querySelectorAll('[id^="' + BUTTON_ID_PREFIX + '"]').forEach((btn) => {
				if (!btn || btn.disabled) return;
				setRecognizeButtonLabel(btn, label);
			});
		} catch (_) {}
	}

	try {
		AudioBus.addEventListener('AudioToText:uiStrings', (event) => {
			const next = event && event.detail;
			if (!next || typeof next !== 'object') return;
			voiceUiStrings = Object.assign({}, voiceUiStrings, next);
			refreshAllRecognizeButtonLabels();
		});
	} catch (_) {}

	function pushVoiceUiStringsFromCfg() {
		try {
			const ui = (window.__whatsnowTranslateCfg && window.__whatsnowTranslateCfg.uiLang) || 'zh';
			if (String(ui).toLowerCase().indexOf('en') === 0) {
				voiceUiStrings = Object.assign({}, voiceUiStrings, {
					recognize: 'Transcribe',
					recognizing: 'Transcribing...',
					proOnly: 'This feature is for Pro members only. Please upgrade.',
					noTranscription: '(No transcription)',
					audioFetchFailed: 'Failed to fetch audio data: {detail}',
				});
			} else {
				voiceUiStrings = Object.assign({}, voiceUiStrings, {
					recognize: '识别',
					recognizing: '识别中...',
					proOnly: '此功能仅专业版会员可用，请升级到专业版会员。',
					noTranscription: '(无转录文本)',
					audioFetchFailed: '获取音频数据失败: {detail}',
				});
			}
			refreshAllRecognizeButtonLabels();
		} catch (_) {}
	}
	try {
		pushVoiceUiStringsFromCfg();
	} catch (_) {}

	function fillVoiceTemplate(template, vars) {
		let text = String(template || '');
		if (vars && typeof vars === 'object') {
			Object.keys(vars).forEach((k) => {
				text = text.split('{' + k + '}').join(String(vars[k] == null ? '' : vars[k]));
			});
		}
		return text;
	}

	function applyRecognizeButtonStyle(button, { loading = false } = {}) {
		if (!button) return;
		button.style.cssText =
			'margin: 4px 0; padding: 4px 8px; background: transparent; color: ' + RECOGNIZE_BTN_COLOR +
			'; border: none; border-radius: 4px; cursor: ' + (loading ? 'not-allowed' : 'pointer') +
			'; font-size: 12px; font-weight: 500; display: inline-flex; align-items: center; gap: 4px; ' +
			'max-width: 100%; box-sizing: border-box; line-height: 1; opacity: ' + (loading ? '0.7' : '1') + ';';
	}

	function setRecognizeButtonLabel(button, label) {
		if (!button) return;
		button.innerHTML = RECOGNIZE_ICON_SVG + '<span>' + label + '</span>';
	}

	function setButtonLoading(button) {
		if (!button) return;
		button.disabled = true;
		setRecognizeButtonLabel(button, voiceUiStrings.recognizing || 'Transcribing...');
		applyRecognizeButtonStyle(button, { loading: true });
	}

	function resetButton(button) {
		if (!button) return;
		button.disabled = false;
		setRecognizeButtonLabel(button, voiceUiStrings.recognize || 'Transcribe');
		applyRecognizeButtonStyle(button, { loading: false });
	}

	const VOICE_UI_WRAP_CLASS = 'wa-audio-to-text-ui';

	function insertAfterNode(referenceNode, newNode) {
		if (!referenceNode || !newNode) return;
		const parent = referenceNode.parentNode;
		if (!parent) return;
		parent.insertBefore(newNode, referenceNode.nextSibling);
	}

	/** 在语音气泡块内、绝对定位的 msg-meta 之前插入 UI；由 CSS 预留底部空间避免重叠 */
	function findVoiceUiInsertSlot(voiceBubble) {
		if (!voiceBubble || !voiceBubble.parentNode) return null;

		// 优先：插在 msg-meta 外包层之前（与播放区同级），保证转写在气泡内、时间之下由 padding 让位
		const meta = (voiceBubble.querySelector && voiceBubble.querySelector('[data-testid="msg-meta"]'))
			|| (voiceBubble.parentElement && voiceBubble.parentElement.querySelector
				? voiceBubble.parentElement.querySelector('[data-testid="msg-meta"]')
				: null);
		if (meta) {
			let metaWrap = meta;
			const scope = voiceBubble.contains(meta) ? voiceBubble : (voiceBubble.parentElement || voiceBubble);
			while (metaWrap.parentElement && metaWrap.parentElement !== scope) {
				metaWrap = metaWrap.parentElement;
			}
			if (metaWrap.parentElement === scope) {
				return { parent: scope, after: metaWrap.previousSibling || null, before: metaWrap };
			}
		}

		return { parent: voiceBubble.parentNode, after: voiceBubble };
	}

	function insertVoiceUiAtSlot(slot, wrap) {
		if (!slot || !wrap) return;
		if (slot.before && slot.before.parentNode) {
			slot.before.parentNode.insertBefore(wrap, slot.before);
			return;
		}
		if (slot.after) {
			insertAfterNode(slot.after, wrap);
			return;
		}
		if (slot.parent) slot.parent.appendChild(wrap);
	}

	function getConvMsgForId(msgId, fallbackNode) {
		if (!msgId) return null;
		try {
			const el = document.querySelector(
				'[data-testid^="conv-msg-"][data-id="' + CSS.escape(String(msgId)) + '"]'
			);
			if (el) return el;
		} catch (_) {}
		if (fallbackNode && fallbackNode.closest) {
			const near = fallbackNode.closest('[data-testid^="conv-msg-"]');
			if (near && near.getAttribute('data-id') === String(msgId)) return near;
		}
		return null;
	}

	function extractMsgIdFromUiWrap(wrap) {
		if (!wrap) return null;
		const attr = wrap.getAttribute('data-wa-voice-msg-id');
		if (attr) return attr;
		const btn = wrap.querySelector('[id^="' + BUTTON_ID_PREFIX + '"]');
		if (btn && btn.id) return btn.id.slice(BUTTON_ID_PREFIX.length);
		const txt = wrap.querySelector('[id^="' + TEXT_ID_PREFIX + '"]');
		if (txt && txt.id) return txt.id.slice(TEXT_ID_PREFIX.length);
		return null;
	}

	function convMsgHasVoiceControls(convMsg) {
		if (!convMsg || !convMsg.querySelector) return false;
		return !!convMsg.querySelector(
			"[data-testid='ptt-status'], [data-icon='ptt-status'], " +
			"[data-icon='audio-play'], [data-icon='audio-pause'], [role='slider']"
		);
	}

	function cleanupOrphanVoiceUiRoots() {
		document.querySelectorAll('.' + VOICE_UI_WRAP_CLASS).forEach((wrap) => {
			const msgId = extractMsgIdFromUiWrap(wrap);
			if (!msgId) {
				try { wrap.remove(); } catch (_) {}
				return;
			}
			const convMsg = getConvMsgForId(msgId);
			if (!convMsg || !convMsg.contains(wrap) || !convMsgHasVoiceControls(convMsg)) {
				try { wrap.remove(); } catch (_) {}
			}
		});
	}

	function repositionVoiceUiRoot(wrap, voiceBubble, msgId) {
		if (!wrap || !voiceBubble || !msgId) return;
		const convMsg = getConvMsgForId(msgId, voiceBubble);
		if (!convMsg || !convMsg.contains(voiceBubble)) return;
		const slot = findVoiceUiInsertSlot(voiceBubble);
		if (!slot || !slot.parent || !convMsg.contains(slot.parent)) return;
		if (slot.before) {
			if (wrap.nextSibling === slot.before && wrap.parentNode === slot.parent) return;
		} else if (slot.after) {
			if (wrap.previousSibling === slot.after && wrap.parentNode === slot.parent) return;
		}
		insertVoiceUiAtSlot(slot, wrap);
	}

	function findMetaInsertPoint(voiceBubble) {
		if (!voiceBubble || !voiceBubble.querySelector) return null;
		const meta = voiceBubble.querySelector('[data-testid="msg-meta"]');
		if (!meta) return null;
		let node = meta;
		while (node.parentElement && node.parentElement !== voiceBubble) {
			node = node.parentElement;
		}
		return node.parentElement === voiceBubble ? node : meta;
	}

	function getVoiceMessageRow(node) {
		if (!node || !node.closest) return null;
		return node.closest('[data-testid^="conv-msg-"]') ||
			node.closest('[role="row"]') ||
			node.closest('[data-testid="msg-container"]');
	}

	function dedupeVoiceUiRoots(msgRow, msgId) {
		if (!msgRow || !msgId) return null;
		const btnId = buttonIdFor(msgId);
		const textId = textIdFor(msgId);
		const roots = Array.from(msgRow.querySelectorAll('.' + VOICE_UI_WRAP_CLASS));
		if (!roots.length) return null;

		let keeper = roots.find((root) => root.querySelector('#' + CSS.escape(btnId))) ||
			roots.find((root) => root.querySelector('#' + CSS.escape(textId))) ||
			roots[0];

		roots.forEach((root) => {
			if (root === keeper) return;
			while (root.firstChild) {
				keeper.appendChild(root.firstChild);
			}
			try { root.remove(); } catch (_) {}
		});
		return keeper;
	}

	function findExistingVoiceUiRoot(msgRow, msgId) {
		if (!msgRow || !msgId) return null;
		const btn = msgRow.querySelector('#' + CSS.escape(buttonIdFor(msgId)));
		if (btn) {
			const root = btn.closest('.' + VOICE_UI_WRAP_CLASS);
			if (root) return root;
		}
		const txt = msgRow.querySelector('#' + CSS.escape(textIdFor(msgId)));
		if (txt) {
			const root = txt.closest('.' + VOICE_UI_WRAP_CLASS);
			if (root) return root;
		}
		return null;
	}

	function syncVoiceUiHasTextClass(uiRoot, msgId) {
		if (!uiRoot) return;
		const textId = msgId ? textIdFor(msgId) : null;
		const hasText = !!(
			(textId && uiRoot.querySelector('#' + CSS.escape(textId))) ||
			uiRoot.querySelector('.translated-text') ||
			uiRoot.querySelector('[id^="' + TEXT_ID_PREFIX + '"]')
		);
		uiRoot.classList.toggle('wa-audio-to-text-ui--has-text', hasText);
	}

	function ensureVoiceUiRoot(voiceBubble, msgId) {
		if (!voiceBubble || !msgId) return null;
		const convMsg = getConvMsgForId(msgId, voiceBubble);
		if (!convMsg || !convMsg.contains(voiceBubble) || !convMsgHasVoiceControls(convMsg)) {
			return null;
		}
		const msgRow = convMsg;
		dedupeVoiceUiRoots(msgRow, msgId);

		let wrap = findExistingVoiceUiRoot(msgRow, msgId);
		if (wrap) {
			wrap.setAttribute('data-wa-voice-msg-id', msgId);
			repositionVoiceUiRoot(wrap, voiceBubble, msgId);
			syncVoiceUiHasTextClass(wrap, msgId);
			return wrap;
		}

		wrap = document.createElement('div');
		wrap.className = VOICE_UI_WRAP_CLASS;
		wrap.setAttribute('data-wa-voice-msg-id', msgId);
		// 有转写/译文时由 .wa-audio-to-text-ui--has-text 加大底部 padding，避开绝对定位的时间/重译按钮
		wrap.style.cssText =
			'display:block;width:100%;clear:both;box-sizing:border-box;padding:2px 6px 4px;';

		const slot = findVoiceUiInsertSlot(voiceBubble);
		if (slot && slot.parent && convMsg.contains(slot.parent)) {
			insertVoiceUiAtSlot(slot, wrap);
		} else {
			const metaWrap = findMetaInsertPoint(voiceBubble);
			if (metaWrap && metaWrap.parentNode === voiceBubble) {
				voiceBubble.insertBefore(wrap, metaWrap);
			} else {
				voiceBubble.appendChild(wrap);
			}
		}
		syncVoiceUiHasTextClass(wrap, msgId);
		return wrap;
	}

	function appendText(voiceBubble, record, msgId) {
		if (!voiceBubble || !record || !msgId) return;
		const uiRoot = ensureVoiceUiRoot(voiceBubble, msgId);
		if (!uiRoot) return;

		const textId = textIdFor(msgId);
		const msgRow = getVoiceMessageRow(voiceBubble);
		if (msgRow) dedupeVoiceUiRoots(msgRow, msgId);
		if (uiRoot.querySelector('#' + CSS.escape(textId))) return;

		const txt = document.createElement('span');
		txt.id = textId;
		txt.setAttribute('data-testid', 'selectable-text');
		txt.classList.add('selectable-text', 'copyable-text');
		txt.innerText = record.transcription || voiceUiStrings.noTranscription || '(No transcription)';

		if (record.error) {
			txt.style.cssText = 'padding: 0 6px; color: red; font-weight: bold; display: block; white-space: pre-wrap; word-break: break-word;';
		} else {
			txt.style.cssText = 'padding: 0 6px; display: block; white-space: pre-wrap; word-break: break-word;';
		}

		const button = uiRoot.querySelector(`#${CSS.escape(buttonIdFor(msgId))}`);
		if (button) {
			insertAfterNode(button, txt);
		} else {
			uiRoot.appendChild(txt);
		}
		syncVoiceUiHasTextClass(uiRoot, msgId);
		// Kick bridge translate scan so transcription gets a .translated-text line.
		try {
			if (window.__whatsnowTranslateHelpers && typeof window.__whatsnowTranslateHelpers.scheduleScan === 'function') {
				window.__whatsnowTranslateHelpers.scheduleScan(200);
			}
		} catch (_) {}
	}

	function findLiveVoiceBubbleForId(msgId, fallbackBubble) {
		if (!msgId) return fallbackBubble || null;
		const convMsg = getConvMsgForId(msgId, fallbackBubble);
		if (!convMsg) return fallbackBubble || null;
		try {
			const wrap = convMsg.querySelector(
				'.' + VOICE_UI_WRAP_CLASS + '[data-wa-voice-msg-id="' + CSS.escape(String(msgId)) + '"]'
			);
			if (wrap && wrap.parentElement && convMsg.contains(wrap.parentElement)) {
				const fromWrap = findVoiceMessageContainer(wrap.parentElement) || findVoiceMessageContainer(wrap);
				if (fromWrap && convMsg.contains(fromWrap)) return fromWrap;
			}
		} catch (_) {}
		try {
			const anchor =
				convMsg.querySelector("[data-testid='ptt-status'], [data-icon='ptt-status']") ||
				convMsg.querySelector("[data-icon='audio-play'], [data-icon='audio-pause']") ||
				convMsg.querySelector('[role="slider"] canvas') ||
				convMsg.querySelector('[data-testid="msg-container"]');
			if (anchor) {
				const el = findVoiceMessageContainer(anchor);
				if (el && convMsg.contains(el)) return el;
			}
		} catch (_) {}
		if (fallbackBubble && convMsg.contains(fallbackBubble)) return fallbackBubble;
		return fallbackBubble || null;
	}

	async function checkAndDisplayCache(voiceBubble, id) {
		if (!voiceBubble || !id) return;
		const uiRoot = ensureVoiceUiRoot(voiceBubble, id);
		if (!uiRoot) return;
		if (uiRoot.querySelector(`#${CSS.escape(textIdFor(id))}`)) return;
		if (pendingTranscriptionIds.has(id)) return;
		if (isCacheMissCooling(id)) return;
		const record = await requestCache(id);
		// 异步等待期间 WA 虚拟列表可能重绘，必须用当前 DOM 重新定位气泡
		const liveBubble = findLiveVoiceBubbleForId(id, voiceBubble);
		if (!liveBubble) {
			if (record) clearCacheMiss(id);
			else markCacheMiss(id);
			return;
		}
		if (record) {
			clearCacheMiss(id);
			appendText(liveBubble, record, id);
		} else {
			markCacheMiss(id);
		}
	}

	/** 新版网页上行节点 data-id 常为纯十六进制，与 Msg 集合键（含 @ 的串）不一致 */
	function pickMessageIdFromVoiceNode(node) {
		if (!node) return null;
		const ids = [];
		// 优先取消息容器（conv-msg-xxxx）上的 data-id，避免拿到内部按钮/状态节点的 data-id
		try {
			const convMsg = node.closest('[data-testid^="conv-msg-"][data-id]');
			if (convMsg) {
				const v = convMsg.getAttribute('data-id');
				if (v) ids.push(v);
			}
		} catch (_) {}
		try {
			const row = node.closest('[role="row"]');
			if (row) {
				row.querySelectorAll('[data-id]').forEach((el) => {
					const v = el.getAttribute('data-id');
					if (v && ids.indexOf(v) === -1) ids.push(v);
				});
			}
		} catch (_) {}
		const nearest = node.closest('[data-id]');
		if (nearest) {
			const v = nearest.getAttribute('data-id');
			if (v && ids.indexOf(v) === -1) ids.unshift(v);
			else if (v) {
				const ix = ids.indexOf(v);
				if (ix > 0) {
					ids.splice(ix, 1);
					ids.unshift(v);
				}
			}
		}
		const legacy = ids.find(
			(s) => s && (s.indexOf('@') !== -1 || /^true_|^false_/.test(s))
		);
		return legacy || ids[0] || null;
	}

	function getMsgIdString(m) {
		if (!m) return '';
		// WA Web 常见：m.id 为字符串，或为对象（含 _serialized / id 等字段）
		try {
			if (typeof m.id === 'string') return m.id;
			if (m.id && typeof m.id._serialized === 'string') return m.id._serialized;
			if (m.id && typeof m.id.id === 'string') return m.id.id;
			if (m.id && typeof m.id.toString === 'function') {
				const s = m.id.toString();
				if (s && s !== '[object Object]') return s;
			}
		} catch (_) {}
		return '';
	}

	function getMsgModelsArray() {
		try {
			if (typeof Msg.getModelsArray === 'function') {
				const a = Msg.getModelsArray();
				if (a && a.length) return a;
			}
		} catch (_) {}
		try {
			if (Msg.models && typeof Msg.models.toArray === 'function') {
				const a = Msg.models.toArray();
				if (a && a.length) return a;
			}
		} catch (_) {}
		try {
			if (Msg.models && Msg.models.models && Msg.models.models.length) {
				return Msg.models.models;
			}
		} catch (_) {}
		return [];
	}

	/**
	 * 当 DOM 为纯 hex 时，在已加载的 Msg 模型中查找 id 字符串包含该 hex 的项（新版 WA 可能仍把 hex 嵌在完整 id 里）
	 */
	function findMsgByHexDomId(domId) {
		if (!Msg || !domId) return null;
		const idStr = String(domId);
		// 新版 WA 的 conv-msg data-id 可能是 20 位（如 2A4E...），不能只接受 24+。
		if (!/^[0-9A-Fa-f]{16,64}$/.test(idStr)) return null;
		const arr = getMsgModelsArray();
		if (!arr.length) return null;
		const u = idStr.toUpperCase();
		const l = idStr.toLowerCase();
		for (let i = arr.length - 1; i >= 0; i--) {
			const m = arr[i];
			if (!m || m.id == null) continue;
			const mid = getMsgIdString(m);
			if (!mid) continue;
			if (
				mid.indexOf(idStr) !== -1 ||
				mid.indexOf(u) !== -1 ||
				mid.indexOf(l) !== -1
			) {
				return m;
			}
			// 某些版本会把 id 存成单独字段（非 _serialized）
			try {
				const rawId = m.id && m.id.id != null ? String(m.id.id) : '';
				if (rawId && (rawId === idStr || rawId.toUpperCase() === u || rawId.toLowerCase() === l)) {
					return m;
				}
			} catch (_) {}
		}
		return null;
	}

	function resolveMessageModel(id) {
		if (!Msg || !id) return null;
		try {
			const m = Msg.get(String(id));
			if (m) return m;
		} catch (_) {}
		return findMsgByHexDomId(id);
	}

	async function onAudio(id) {
		if (!Msg || !getOrCreateURL) {
			throw new Error('内部API不可用');
		}

		let msg = resolveMessageModel(id);
		if (!msg) {
			throw new Error('无法获取音频数据：消息不存在');
		}

		await new Promise(resolve => {
			let count = 0;
			const timer = setInterval(() => {
				count++;
				if (msg.mediaData && msg.mediaData.mediaStage === 'RESOLVED') {
					clearInterval(timer);
					resolve(null);
				} else if (count > 100) { // 最多等待10秒
					clearInterval(timer);
					resolve(null);
				}
			}, 100);
		});

		if (!msg.mediaData || msg.mediaData.mediaStage !== 'RESOLVED') {
			throw new Error('媒体数据未解析');
		}

		const blobURL = getOrCreateURL(msg.filehash);
		if (!blobURL) {
			throw new Error('无法获取音频数据');
		}

		// Extension background fetches blobURL; Tauri host cannot — encode in-page.
		const response = await fetch(blobURL);
		const audioBlob = await response.blob();
		const audioBase64 = arrayBufferToBase64(await audioBlob.arrayBuffer());
		const record = await transcribeAudioBase64(audioBase64);
		if (!record.error) {
			writeAudioTxCache(id, record);
		}
		emitBridgeEvent(resultEventName(id), record);
		return record;
	}

	function addRecognizeButton(voiceBubble, id) {
		if (!voiceBubble || !id) return;

		const convMsg = getConvMsgForId(id, voiceBubble);
		if (convMsg) dedupeVoiceUiRoots(convMsg, id);

		const uiRoot = ensureVoiceUiRoot(voiceBubble, id);
		if (!uiRoot) return;

		const btnId = buttonIdFor(id);
		const existing = convMsg
			? convMsg.querySelector('#' + CSS.escape(btnId))
			: uiRoot.querySelector('#' + CSS.escape(btnId));
		if (existing) {
			// 按钮已存在：无转录文本且不在冷却期时再查缓存
			const existingRoot = existing.closest('.' + VOICE_UI_WRAP_CLASS) || uiRoot;
			if (!existingRoot.querySelector('#' + CSS.escape(textIdFor(id))) && !isCacheMissCooling(id)) {
				checkAndDisplayCache(voiceBubble, id);
			}
			return;
		}

		const button = document.createElement('button');
		button.id = btnId;
		button.type = 'button';
		setRecognizeButtonLabel(button, voiceUiStrings.recognize || 'Transcribe');
		applyRecognizeButtonStyle(button);

		button.onmouseover = function () {
			if (!this.disabled) this.style.opacity = '0.75';
		};
		button.onmouseout = function () {
			if (!this.disabled) this.style.opacity = '1';
		};

		button.onclick = async function (evt) {
			if (evt) {
				evt.preventDefault();
				evt.stopPropagation();
			}
			// 基础版会员也展示按钮，但点击时若无权限则提示并退出（仅弹窗提示，不写入气泡）
			const hasPermission = await checkPermission();
			if (!hasPermission) {
				try {
					showNoPermissionNotice();
				} catch (_) {}
				return;
			}

			setButtonLoading(button);

			// 清理旧内容
			const existingTranscription = uiRoot.querySelector(`#${CSS.escape(textIdFor(id))}`);
			if (existingTranscription) existingTranscription.remove();
			const existingTranslation = (uiRoot.querySelector && uiRoot.querySelector('.translated-text'))
				|| (voiceBubble.querySelector && voiceBubble.querySelector('.translated-text'));
			if (existingTranslation) existingTranslation.remove();
			const msgElement = voiceBubble.closest('[data-android-id]');
			if (msgElement) msgElement.removeAttribute('data-translated');
			syncVoiceUiHasTextClass(uiRoot, id);

			clearCache(id);
			pendingTranscriptionIds.add(id);
			clearCacheMiss(id);

			// 转录结果事件丢失时兜底：轮询 storage（pending 期间 checkAndDisplayCache 会直接 return）
			let pollCount = 0;
			const pollTimer = setInterval(async () => {
				if (!pendingTranscriptionIds.has(id)) {
					clearInterval(pollTimer);
					return;
				}
				pollCount++;
				clearCacheMiss(id);
				const record = await requestCache(id);
				if (record) {
					clearInterval(pollTimer);
					pendingTranscriptionIds.delete(id);
					clearCacheMiss(id);
					resetButton(button);
					const liveBubble = findLiveVoiceBubbleForId(id, voiceBubble) || voiceBubble;
					appendText(liveBubble, record, id);
				} else if (pollCount >= 30) {
					clearInterval(pollTimer);
					pendingTranscriptionIds.delete(id);
					resetButton(button);
				}
			}, 2000);

			const handleResult = (event) => {
				clearInterval(pollTimer);
				pendingTranscriptionIds.delete(id);
				resetButton(button);
				const record = event && event.detail ? event.detail : null;
				if (record) {
					clearCacheMiss(id);
					const liveBubble = findLiveVoiceBubbleForId(id, voiceBubble) || voiceBubble;
					appendText(liveBubble, record, id);
				}
			};
			AudioBus.addEventListener(resultEventName(id), handleResult, { once: true });

			onAudio(id).catch(err => {
				clearInterval(pollTimer);
				pendingTranscriptionIds.delete(id);
				resetButton(button);
				const detail = err && err.message ? err.message : err;
				appendText(voiceBubble, {
					transcription: fillVoiceTemplate(
						voiceUiStrings.audioFetchFailed || 'Failed to fetch audio data: {detail}',
						{ detail }
					),
					error: true
				}, id);
			});
		};

		uiRoot.appendChild(button);
		checkAndDisplayCache(voiceBubble, id);
	}

	/** 语音气泡结构特征：含播放/PTT 图标，且带波形或时长，不依赖 WA 内部 class 名 */
	function isVoiceBubbleWrapper(el) {
		if (!el || !el.querySelector || el.nodeType !== 1) return false;
		const hasVoiceIcon = !!el.querySelector(
			"[data-icon='audio-play'], [data-icon='audio-pause'], " +
			"[data-testid='ptt-status'], [data-icon='ptt-status']"
		) || (() => {
			const titles = el.querySelectorAll('svg title');
			for (let i = 0; i < titles.length; i++) {
				const label = (titles[i].textContent || '').trim();
				if (/ic-play-arrow|audio-play|audio-pause/i.test(label)) return true;
			}
			return false;
		})();
		const hasWaveform = !!el.querySelector('[role="slider"] canvas, canvas[width][height]');
		const hasDuration = /\b\d{1,2}:\d{2}\b/.test((el.textContent || '').replace(/\s+/g, ' '));
		return hasVoiceIcon && (hasWaveform || hasDuration);
	}

	function findVoiceBlockInContainer(container, anchor) {
		if (!container || !anchor) return null;
		let current = anchor;
		// 取最内层语音气泡，避免 msg-container 与 _ak49 同时命中时挂到外层导致重复 UI
		while (current && current !== container) {
			if (isVoiceBubbleWrapper(current)) return current;
			current = current.parentElement;
		}
		return null;
	}

	function findVoiceMessageContainer(node) {
		if (!node || !node.closest) return null;

		const msgContainer = node.closest('[data-testid="msg-container"]');
		if (msgContainer) {
			const voiceBlock = findVoiceBlockInContainer(msgContainer, node);
			if (voiceBlock) return voiceBlock;
		}

		const convMsg = node.closest('[data-testid^="conv-msg-"]');
		if (convMsg) {
			const voiceBlock = findVoiceBlockInContainer(convMsg, node);
			if (voiceBlock) return voiceBlock;
		}

		let current = node.parentElement;
		let depth = 0;
		while (current && depth < 12) {
			if (isVoiceBubbleWrapper(current)) return current;
			current = current.parentElement;
			depth++;
		}

		return null;
	}

	function isPttMessage(m) {
		if (!m) return false;
		try {
			if (m.type === 'ptt' || m.__x_type === 'ptt') return true;
			if (m.isPtt || m.isPttMessage) return true;
			const mime = m.mimetype || (m.mediaData && m.mediaData.mimetype) || '';
			if (/audio\/(ogg|opus|mpeg|mp4|webm)/i.test(String(mime))) return true;
		} catch (_) {}
		return false;
	}

	function extractDomIdFromMsg(m) {
		const mid = getMsgIdString(m);
		if (!mid) return null;
		const hex = mid.match(/[0-9A-Fa-f]{16,64}/);
		return hex ? hex[0] : mid;
	}

	/** 优先限定在会话消息区，避免扫整页（侧栏/设置里大量 SVG） */
	function getMessagesScanRoot() {
		return document.querySelector('div[data-scrolltracepolicy="wa.web.conversation.messages"]') ||
			document.querySelector('[data-testid="conversation-panel-body"]') ||
			document.querySelector('#main') ||
			null;
	}

	function collectVoiceAnchorNodes(root) {
		const scope = root && root.querySelectorAll ? root : document;
		const seen = new Set();
		const nodes = [];
		const add = (n) => {
			if (!n || n.nodeType !== 1 || seen.has(n)) return;
			seen.add(n);
			nodes.push(n);
		};

		// 图标锚点（跨语言稳定）
		try {
			scope.querySelectorAll(
				"[data-icon='audio-play'], [data-icon='audio-pause'], " +
				"[data-testid='ptt-status'], [data-icon='ptt-status']"
			).forEach(add);
		} catch (_) {}

		// 波形滑块 + canvas（新版常见）
		try {
			scope.querySelectorAll('[data-testid="msg-container"] [role="slider"] canvas, [data-testid^="conv-msg-"] [role="slider"] canvas').forEach((canvas) => {
				add(canvas.closest('[role="slider"]') || canvas);
			});
		} catch (_) {}

		// 仅在消息容器内查 SVG title（不再 document 全页扫）
		if (nodes.length === 0) {
			try {
				scope.querySelectorAll(
					'[data-testid="msg-container"] svg title, [data-testid^="conv-msg-"] svg title'
				).forEach((titleEl) => {
					const label = (titleEl.textContent || '').trim();
					if (!/ic-play-arrow|audio-play|audio-pause/i.test(label)) return;
					const btn = titleEl.closest('button');
					if (btn) add(btn);
				});
			} catch (_) {}
		}

		return nodes;
	}

	function processVoiceAnchor(node) {
		if (!node) return;
		const id = pickMessageIdFromVoiceNode(node);
		if (!id) return;
		const convMsg = getConvMsgForId(id, node);
		if (!convMsg) return;
		const el = findVoiceMessageContainer(node);
		if (!el || !convMsg.contains(el)) return;
		addRecognizeButton(el, id);
	}

	/** 当 DOM 锚点失效时，用 WA 内部 Msg 集合按 data-id 反查语音消息 */
	function scanVoiceMessagesFromApi(seenIds, root) {
		if (!Msg) return;
		const arr = getMsgModelsArray();
		if (!arr.length) return;
		const scope = root && root.querySelector ? root : document;

		// 只扫最近一批，避免长会话全量 Msg 遍历拖垮主线程
		const maxCheck = 80;
		const start = Math.max(0, arr.length - maxCheck);
		for (let i = start; i < arr.length; i++) {
			const m = arr[i];
			if (!isPttMessage(m)) continue;
			const domId = extractDomIdFromMsg(m);
			if (!domId || (seenIds && seenIds.has(domId))) continue;

			let row = null;
			try {
				row = scope.querySelector(`[data-testid^="conv-msg-"][data-id="${CSS.escape(domId)}"]`) ||
					scope.querySelector(`[data-id="${CSS.escape(domId)}"]`);
			} catch (_) {
				row = scope.querySelector(`[data-testid^="conv-msg-"][data-id="${domId}"]`) ||
					scope.querySelector(`[data-id="${domId}"]`);
			}
			if (!row) continue;

			const anchor =
				row.querySelector("[data-testid='ptt-status'], [data-icon='ptt-status'], [data-icon='audio-play'], [data-icon='audio-pause']") ||
				row.querySelector('[role="slider"] canvas') ||
				row.querySelector('[data-testid="msg-container"]') ||
				row;

			processVoiceAnchor(anchor);
		}
	}

	/**
	 * @param {{ full?: boolean }} [opts]
	 * full=false：仅 DOM 锚点（mutation 热路径）
	 * full=true：含 API 反查 + 孤儿清理（慢速兜底）
	 */
	function scanAllVoiceMessages(opts) {
		try {
			const full = !!(opts && opts.full);
			const root = getMessagesScanRoot();
			if (full) cleanupOrphanVoiceUiRoots();
			// 同一条语音常有 ptt-status、canvas、播放按钮等多个锚点，按消息 ID 去重
			const seenIds = new Set();
			collectVoiceAnchorNodes(root).forEach((node) => {
				const id = pickMessageIdFromVoiceNode(node);
				if (!id || seenIds.has(id)) return;
				seenIds.add(id);
				processVoiceAnchor(node);
			});
			if (full) scanVoiceMessagesFromApi(seenIds, root);
		} catch (_) {}
	}

	let scanTimer = null;
	let pendingFullScan = false;
	function scheduleVoiceScan(delayMs, full) {
		if (full) pendingFullScan = true;
		if (scanTimer) return;
		scanTimer = setTimeout(() => {
			scanTimer = null;
			const doFull = pendingFullScan;
			pendingFullScan = false;
			scanAllVoiceMessages({ full: doFull });
		}, delayMs == null ? 250 : delayMs);
	}

	function mutationsHandler() {
		scheduleVoiceScan(250, false);
	}

	const interval = setInterval(async () => {
		if (isInitialized) return;
		const sideElement = document.querySelector('#side');
		if (!sideElement) return;

		isInitialized = true;
		clearInterval(interval);

		// 不再以权限作为“是否注入按钮”的开关：
		// - 基础版会员也展示按钮
		// - 无权限时在点击按钮时提示
		try {
			if (typeof require !== 'undefined') {
				Msg = require('WAWebCollections').Msg;
				getOrCreateURL = require('WAWebMediaInMemoryBlobCache').InMemoryMediaBlobCache.getOrCreateURL;
			}
		} catch (_) {}

		if (!Msg || !getOrCreateURL) {
			console.warn('[AudioToText] 无法获取WhatsApp内部API，语音识别按钮将不会添加');
			return;
		}

		try {
			Msg.on('add', message => {
				// 仅语音/音频消息触发下载与补扫，避免每条文本消息都打主线程
				if (!isPttMessage(message)) return;
				try {
					message.downloadMedia({
						downloadEvenIfExpensive: true,
						isUserInitiated: true,
						rmrReason: 1
					});
				} catch (_) {}
				scheduleVoiceScan(350, true);
			});
		} catch (_) {}

		let messagesObserver = null;
		let boundMessagesRoot = null;
		let bindTimer = null;

		function bindMessagesObserver() {
			const root = getMessagesScanRoot();
			if (!root || root === boundMessagesRoot) return;
			boundMessagesRoot = root;
			try {
				if (messagesObserver) messagesObserver.disconnect();
			} catch (_) {}
			try {
				messagesObserver = new MutationObserver(mutationsHandler);
				messagesObserver.observe(root, { childList: true, subtree: true });
			} catch (_) {}
			scheduleVoiceScan(200, true);
		}

		function scheduleBindMessagesRoot() {
			if (bindTimer) return;
			bindTimer = setTimeout(() => {
				bindTimer = null;
				bindMessagesObserver();
			}, 400);
		}

		// body 仅用于发现/切换会话面板，不做全量语音扫描
		try {
			const bootObserver = new MutationObserver(() => scheduleBindMessagesRoot());
			if (document.body) {
				bootObserver.observe(document.body, { childList: true, subtree: true });
			}
		} catch (_) {}

		bindMessagesObserver();

		// 已有消息补充按钮 + 定时兜底（应对 DOM 结构变化或虚拟列表重绘）
		const RESCAN_MS = 12000;
		setTimeout(() => {
			try {
				bindMessagesObserver();
				scanAllVoiceMessages({ full: true });
			} catch (_) {}
		}, 2000);
		setInterval(() => {
			try {
				bindMessagesObserver();
				scanAllVoiceMessages({ full: true });
			} catch (_) {}
		}, RESCAN_MS);
	}, 100);
})();