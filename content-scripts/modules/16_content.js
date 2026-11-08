 通信。
 */
(() => {
  'use strict';

  if (window.__FaloStoreBridgeInstalled) return;
  window.__FaloStoreBridgeInstalled = true;

  const EVENT_CMD = 'WAContactExport:cmd';
  const EVENT_RESULT = 'WAContactExport:result';
  const EVENT_PROGRESS = 'WAContactExport:progress';
  const BRIDGE_SOURCE = 'falo';

  let stopCollect = false;
  let storeCache = null;
  let countryTable = [];
  let busy = false;

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function emit(eventName, detail) {
    const type = String(eventName || '');
    const payload = detail === undefined ? null : detail;
    const requestId = payload && payload.reqId != null ? String(payload.reqId) : undefined;
    try {
      window.postMessage({
        source: BRIDGE_SOURCE,
        dir: 'p2c',
        type,
        requestId,
        payload
      }, '*');
    } catch (_) {}
    try {
      document.dispatchEvent(new CustomEvent(type, { detail: payload }));
    } catch (_) {}
  }

  function reply(reqId, ok, data, error) {
    emit(EVENT_RESULT, { reqId, ok: !!ok, data, error: error || null });
  }

  function progress(reqId, current, total, message) {
    emit(EVENT_PROGRESS, { reqId, current, total, message: message || '' });
  }

  function tryPageRequire(id) {
    try {
      const req = window.require || self.require;
      if (typeof req === 'function') return req(id);
    } catch (_) {}
    return null;
  }

  function unwrapModule(mod, preferKeys) {
    if (!mod) return null;
    if (preferKeys && preferKeys.length) {
      for (let i = 0; i < preferKeys.length; i++) {
        const k = preferKeys[i];
        if (mod[k]) return mod[k];
      }
    }
    if (mod.default) return mod.default;
    return mod;
  }

  function pickCollection(mod, nameHints) {
    if (!mod) return null;
    const hints = nameHints || [];
    const candidates = [];
    const push = (obj) => {
      if (obj && isCollection(obj) && candidates.indexOf(obj) < 0) candidates.push(obj);
    };
    for (let i = 0; i < hints.length; i++) push(mod[hints[i]]);
    push(mod);
    push(mod.default);
    try {
      const keys = Object.keys(mod);
      for (let i = 0; i < keys.length; i++) {
        if (/Collection/i.test(keys[i])) push(mod[keys[i]]);
      }
    } catch (_) {}
    // 优先已有数据的实例
    for (let i = 0; i < candidates.length; i++) {
      try {
        if (modelsOf(candidates[i]).length > 0) return candidates[i];
      } catch (_) {}
    }
    return candidates[0] || null;
  }

  function getWebpackRequire() {
    // 新版 WA：Metro require 已挂到 window.require，且带 .m 模块表
    if (typeof window.require === 'function') {
      try {
        if (window.require.m || window.require.cache) return window.require;
      } catch (_) {}
    }
    const chunkName = Object.keys(window).find((k) => k.startsWith('webpackChunk'));
    if (!chunkName || !Array.isArray(window[chunkName])) return null;
    let webpackRequire = null;
    try {
      window[chunkName].push([
        ['FaloStoreBridge' + Date.now()],
        {},
        (req) => {
          webpackRequire = req;
        }
      ]);
    } catch (_) {
      return null;
    }
    return webpackRequire;
  }

  function findExport(mod, predicate) {
    if (!mod) return null;
    if (predicate(mod)) return mod;
    if (mod.default && predicate(mod.default)) return mod.default;
    try {
      for (const key of Object.keys(mod)) {
        const v = mod[key];
        if (v && predicate(v)) return v;
      }
    } catch (_) {}
    return null;
  }

  function scanModules(predicate, limit) {
    const req = getWebpackRequire();
    if (!req || !req.m) return null;
    const ids = Object.keys(req.m);
    const max = typeof limit === 'number' ? Math.min(ids.length, limit) : ids.length;
    for (let i = 0; i < max; i++) {
      let mod;
      try {
        mod = req(ids[i]);
      } catch (_) {
        continue;
      }
      const hit = findExport(mod, predicate);
      if (hit) return hit;
    }
    return null;
  }

  function isCollection(obj) {
    return !!(
      obj &&
      typeof obj === 'object' &&
      (typeof obj.getModelsArray === 'function' ||
        typeof obj.get === 'function' ||
        Array.isArray(obj.models) ||
        typeof obj.find === 'function')
    );
  }

  function modelsOf(collection) {
    if (!collection) return [];
    try {
      if (typeof collection.getModelsArray === 'function') {
        const arr = collection.getModelsArray();
        return Array.isArray(arr) ? arr.slice() : [];
      }
    } catch (_) {}
    if (Array.isArray(collection.models)) return collection.models.slice();
    if (collection._models && Array.isArray(collection._models)) return collection._models.slice();
    return [];
  }

  function discoverStoreViaRequire() {
    // WhatsApp >= 2.3000：Metro 风格 require('WAWeb*')
    const contact =
      pickCollection(tryPageRequire('WAWebContactCollection'), [
        'ContactCollection',
        'ContactCollectionImpl',
        'default'
      ]) ||
      pickCollection(tryPageRequire('WAWebCollections'), ['ContactCollection', 'ContactStore']) ||
      findCollectionByModuleId(/ContactCollection/i, ['ContactCollection', 'ContactCollectionImpl', 'default']);

    const chat =
      pickCollection(tryPageRequire('WAWebChatCollection'), [
        'ChatCollection',
        'ChatCollectionImpl',
        'default'
      ]) ||
      pickCollection(tryPageRequire('WAWebCollections'), ['ChatCollection', 'ChatStore']) ||
      findCollectionByModuleId(/ChatCollection/i, ['ChatCollection', 'ChatCollectionImpl', 'default']);

    const label =
      pickCollection(tryPageRequire('WAWebLabelCollection'), [
        'LabelCollection',
        'LabelCollectionImpl',
        'default'
      ]) ||
      pickCollection(tryPageRequire('WAWebCollections'), ['LabelCollection', 'LabelStore']) ||
      findCollectionByModuleId(/LabelCollection/i, ['LabelCollection', 'LabelCollectionImpl', 'default']);

    const groupMeta =
      pickCollection(tryPageRequire('WAWebGroupMetadataCollection'), [
        'GroupMetadataCollection',
        'GroupMetadataCollectionImpl',
        'default'
      ]) ||
      pickCollection(tryPageRequire('WAWebCollections'), [
        'GroupMetadataCollection',
        'GroupMetadataStore'
      ]) ||
      findCollectionByModuleId(/GroupMetadataCollection/i, [
        'GroupMetadataCollection',
        'GroupMetadataCollectionImpl',
        'default'
      ]);

    let conn = null;
    const connMod =
      tryPageRequire('WAWebConnModel') ||
      tryPageRequire('WAWebConn') ||
      tryPageRequire('WAWebSocketModel') ||
      findModuleById(/WAWebConnModel/i);
    if (connMod) {
      conn =
        unwrapModule(connMod, ['Conn', 'default', 'ConnImpl']) ||
        (connMod.isAuthenticated !== undefined ? connMod : null);
    }

    const participantsMod =
      tryPageRequire('WAWebGroupParticipants') ||
      tryPageRequire('WAWebGroupParticipantCollection') ||
      tryPageRequire('WAWebGroupsParticipants');
    const participants =
      (participantsMod && typeof participantsMod.getParticipants === 'function' && participantsMod) ||
      (participantsMod &&
        participantsMod.default &&
        typeof participantsMod.default.getParticipants === 'function' &&
        participantsMod.default) ||
      null;

    const contactMethodsMod =
      tryPageRequire('WAWebContactGetters') ||
      tryPageRequire('WAWebApiContact') ||
      tryPageRequire('WAWebLidPnBridge');
    let contactMethods = null;
    if (contactMethodsMod) {
      contactMethods =
        (typeof contactMethodsMod.getPnLidEntry === 'function' && contactMethodsMod) ||
        (contactMethodsMod.default &&
          typeof contactMethodsMod.default.getPnLidEntry === 'function' &&
          contactMethodsMod.default) ||
        findExport(contactMethodsMod, (m) => m && typeof m.getPnLidEntry === 'function');
    }

    if (contact || chat) {
      return {
        Contact: contact,
        Chat: chat,
        Conn: conn,
        Label: label,
        GroupMetadata: groupMeta,
        Participants: participants,
        WidFactory: null,
        ContactMethods: contactMethods,
        via: 'require'
      };
    }
    return null;
  }

  function findModuleById(re) {
    const req = typeof window.require === 'function' ? window.require : null;
    if (!req || !req.m) return null;
    const ids = Object.keys(req.m);
    for (let i = 0; i < ids.length; i++) {
      if (!re.test(String(ids[i]))) continue;
      try {
        return req(ids[i]);
      } catch (_) {}
    }
    return null;
  }

  function findCollectionByModuleId(re, hints) {
    const req = typeof window.require === 'function' ? window.require : null;
    if (!req || !req.m) return null;
    const ids = Object.keys(req.m);
    for (let i = 0; i < ids.length; i++) {
      if (!re.test(String(ids[i]))) continue;
      try {
        const col = pickCollection(req(ids[i]), hints);
        if (col) return col;
      } catch (_) {}
    }
    return null;
  }

  function discoverStoreViaScan() {
    const Contact = scanModules(
      (m) =>
        isCollection(m) &&
        modelsOf(m).some((c) => c && (typeof c.isMyContact !== 'undefined' || c.formattedName || c.pushname)),
      4000
    );

    const Chat = scanModules(
      (m) =>
        isCollection(m) &&
        modelsOf(m).some((c) => c && c.id && (c.t || c.isGroup !== undefined || c.presence)),
      4000
    );

    const Conn =
      scanModules(
        (m) =>
          m &&
          (typeof m.isAuthenticated === 'boolean' || typeof m.isMainReady === 'boolean') &&
          (m.ref || m.wid || m.me),
        3000
      ) ||
      scanModules((m) => m && m.default && typeof m.default.isAuthenticated === 'boolean', 3000);

    const Label = scanModules(
      (m) => isCollection(m) && modelsOf(m).some((l) => l && (l.name || l.hexColor) && l.id !== undefined),
      3000
    );

    const GroupMetadata = scanModules(
      (m) =>
        isCollection(m) &&
        (typeof m.find === 'function' || typeof m.get === 'function') &&
        modelsOf(m).some((g) => g && (g.participants || g.groupType !== undefined || g.announce)),
      3000
    );

    const Participants = scanModules((m) => m && typeof m.getParticipants === 'function', 2000);
    const ContactMethods = scanModules(
      (m) => m && (typeof m.getPnLidEntry === 'function' || typeof m.queryExists === 'function'),
      2000
    );

    return {
      Contact,
      Chat,
      Conn: Conn && Conn.isAuthenticated !== undefined ? Conn : Conn && Conn.default ? Conn.default : Conn,
      Label,
      GroupMetadata,
      Participants,
      WidFactory: null,
      ContactMethods,
      via: 'scan'
    };
  }

  function discoverStore(force) {
    if (!force && storeCache && storeCache.Contact && storeCache.Chat) return storeCache;

    let found = null;
    try {
      found = discoverStoreViaRequire();
    } catch (_) {
      found = null;
    }
    if (!found || !found.Contact || !found.Chat) {
      try {
        const scanned = discoverStoreViaScan();
        found = {
          ...(found || {}),
          ...scanned,
          Contact: (found && found.Contact) || scanned.Contact,
          Chat: (found && found.Chat) || scanned.Chat,
          Conn: (found && found.Conn) || scanned.Conn,
          Label: (found && found.Label) || scanned.Label,
          GroupMetadata: (found && found.GroupMetadata) || scanned.GroupMetadata,
          Participants: (found && found.Participants) || scanned.Participants,
          ContactMethods: (found && found.ContactMethods) || scanned.ContactMethods,
          via: found && found.Contact ? found.via + '+scan' : scanned.via
        };
      } catch (_) {}
    }

    storeCache = found || {
      Contact: null,
      Chat: null,
      Conn: null,
      Label: null,
      GroupMetadata: null,
      Participants: null,
      WidFactory: null,
      ContactMethods: null,
      via: 'none'
    };
    return storeCache;
  }

  function isStoreReady() {
    try {
      const s = discoverStore(true);
      if (!s || !s.Contact || !s.Chat) return false;
      const conn = s.Conn;
      if (conn) {
        if (conn.isAuthenticated === false) return false;
        if (conn.isMainReady === false) return false;
      }
      // 登录后集合可能短暂为空，只要对象可用即视为就绪
      return true;
    } catch (_) {
      return false;
    }
  }

  function idUser(id) {
    if (!id) return '';
    if (typeof id === 'string') {
      const at = id.indexOf('@');
      return at >= 0 ? id.slice(0, at) : id;
    }
    if (id.user) return String(id.user);
    if (id._serialized) {
      const s = String(id._serialized);
      const at = s.indexOf('@');
      return at >= 0 ? s.slice(0, at) : s;
    }
    return '';
  }

  function idServer(id) {
    if (!id) return '';
    if (typeof id === 'string') {
      const at = id.indexOf('@');
      return at >= 0 ? id.slice(at + 1) : '';
    }
    if (id.server) return String(id.server);
    if (id._serialized) {
      const s = String(id._serialized);
      const at = s.indexOf('@');
      return at >= 0 ? s.slice(at + 1) : '';
    }
    return '';
  }

  function serializedId(id) {
    if (!id) return '';
    if (typeof id === 'string') return id;
    if (id._serialized) return String(id._serialized);
    const u = idUser(id);
    const s = idServer(id) || 'c.us';
    return u ? `${u}@${s}` : '';
  }

  function isGroupId(id) {
    const s = idServer(id) || serializedId(id);
    return s.includes('g.us') || s.endsWith('g.us');
  }

  function isLidId(id) {
    const s = idServer(id) || serializedId(id);
    return s.includes('lid');
  }

  async function resolvePhoneFromLid(lidId) {
    const s = discoverStore();
    const lid = serializedId(lidId);
    if (!lid) return '';
    try {
      if (s.ContactMethods && typeof s.ContactMethods.getPnLidEntry === 'function') {
        const entry = await s.ContactMethods.getPnLidEntry(lid);
        if (entry) {
          const pn = entry.phoneNumber || entry.pn || entry.wid || entry;
          const phone = idUser(pn);
          if (phone && /^\d+$/.test(phone)) return phone;
        }
      }
    } catch (_) {}
    try {
      const contact = s.Contact && (s.Contact.get(lid) || s.Contact.get(lidId));
      if (contact) {
        const phone =
          idUser(contact.phoneNumber) ||
          idUser(contact.pnjid) ||
          (contact.id && !isLidId(contact.id) ? idUser(contact.id) : '');
        if (phone && /^\d+$/.test(phone)) return phone;
      }
    } catch (_) {}
    return '';
  }

  function digitsFromPhoneLike(value) {
    if (value == null || value === '') return '';
    if (typeof value === 'object') {
      const serialized = value._serialized || value.user || '';
      return String(serialized).replace(/\D/g, '');
    }
    return String(value).replace(/\D/g, '');
  }

  function isPlausibleE164Digits(digits) {
    return /^\d{7,15}$/.test(String(digits || ''));
  }

  async function getPhoneNumber(contactOrId) {
    const id = contactOrId && contactOrId.id ? contactOrId.id : contactOrId;
    let user = idUser(id);
    const server = idServer(id);
    if (server === 'c.us' || server === 's.whatsapp.net') {
      if (/^\d+$/.test(user)) return user;
    }
    const lidLike = isLidId(id) || (contactOrId && isLidId(contactOrId.id));
    if (lidLike) {
      const resolved = await resolvePhoneFromLid(id);
      if (resolved && isPlausibleE164Digits(resolved)) return resolved;
      if (contactOrId && typeof contactOrId === 'object') {
        const fromFields = digitsFromPhoneLike(
          contactOrId.formattedPhone || contactOrId.phoneNumber || contactOrId.__x_phoneNumber
        );
        if (isPlausibleE164Digits(fromFields)) return fromFields;
      }
      return '';
    }
    if (contactOrId && typeof contactOrId === 'object') {
      const formatted = contactOrId.formattedPhone || contactOrId.phoneNumber;
      if (formatted) {
        const digits = digitsFromPhoneLike(formatted);
        if (isPlausibleE164Digits(digits)) return digits;
      }
      if (contactOrId.id && !isLidId(contactOrId.id) && /^\d+$/.test(idUser(contactOrId.id))) {
        return idUser(contactOrId.id);
      }
    }
    if (/^\d+$/.test(user)) return user;
    return user || '';
  }

  function getContactUsername(contact) {
    if (!contact || typeof contact !== 'object') return '';
    return String(contact.username || contact.__x_username || '').trim();
  }

  function getUsernameCountryCode(contact) {
    if (!contact || typeof contact !== 'object') return '';
    const raw = contact.usernameCountryCode || contact.__x_usernameCountryCode || '';
    const iso = String(raw || '').trim().toUpperCase();
    return /^[A-Z]{2}$/.test(iso) ? iso : '';
  }

  function matchDialCode(phone, table) {
    if (!phone || !table || !table.length) return { code: '', name: '', iso: '' };
    const digits = String(phone).replace(/\D/g, '');
    let best = null;
    for (let i = 0; i < table.length; i++) {
      const row = table[i];
      const dial = String(row[2] || '');
      if (!dial) continue;
      if (digits.startsWith(dial)) {
        if (!best || dial.length > String(best[2]).length) best = row;
      }
    }
    if (!best) return { code: '', name: '', iso: '' };
    return { code: String(best[2]), name: String(best[0] || ''), iso: String(best[1] || '') };
  }

  function matchCountryByIso(iso, table) {
    const code = String(iso || '').trim().toUpperCase();
    if (!code || !/^[A-Z]{2}$/.test(code)) return { code: '', name: '', iso: '' };
    if (!table || !table.length) return { code: '', name: '', iso: code };
    for (let i = 0; i < table.length; i++) {
      const row = table[i];
      if (String(row[1] || '').toUpperCase() === code) {
        return { code: String(row[2] || ''), name: String(row[0] || ''), iso: code };
      }
    }
    return { code: '', name: '', iso: code };
  }

  async function resolveCountryForContact(contact) {
    const phone = await getPhoneNumber(contact);
    const dial = matchDialCode(phone, countryTable);
    if (dial.code) {
      return { code: dial.code, name: dial.name, iso: dial.iso, phone, source: 'phone' };
    }
    const iso = getUsernameCountryCode(contact);
    if (iso) {
      const byIso = matchCountryByIso(iso, countryTable);
      return {
        code: byIso.code || '',
        name: byIso.name || '',
        iso: byIso.iso || iso,
        phone: phone || '',
        source: 'username'
      };
    }
    return { code: '', name: '', iso: '', phone: phone || '', source: '' };
  }

  function labelNamesForContact(contact, labelCollection) {
    const ids = (contact && contact.labels) || [];
    if (!ids || !ids.length || !labelCollection) return '';
    const names = [];
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      try {
        const lab = typeof labelCollection.get === 'function' ? labelCollection.get(id) : null;
        if (lab && lab.name) names.push(lab.name);
        else names.push(String(id));
      } catch (_) {
        names.push(String(id));
      }
    }
    return names.join('; ');
  }

  function lastMsgInfo(chat) {
    const empty = { text: '', date: '', type: '', status: '' };
    if (!chat) return empty;
    try {
      let msg = null;
      if (chat.msgs && typeof chat.msgs.last === 'function') msg = chat.msgs.last();
      else if (chat.lastReceivedKey && chat.msgs && typeof chat.msgs.get === 'function') {
        msg = chat.msgs.get(chat.lastReceivedKey);
      } else if (Array.isArray(chat.msgs) && chat.msgs.length) {
        msg = chat.msgs[chat.msgs.length - 1];
      }
      if (!msg) return empty;
      const text = msg.body || msg.caption || msg.text || '';
      let date = '';
      if (msg.t) {
        try {
          date = new Date(msg.t * 1000).toISOString();
        } catch (_) {}
      }
      return {
        text: String(text).slice(0, 500),
        date,
        type: String(msg.type || msg.subtype || ''),
        status: String(msg.ack !== undefined ? msg.ack : msg.status || '')
      };
    } catch (_) {
      return empty;
    }
  }

  async function mapContactRow(contact, extras) {
    extras = extras || {};
    const resolved = await resolveCountryForContact(contact);
    const phone = resolved.phone || '';
    const username = getContactUsername(contact);
    const s = discoverStore();
    const savedName =
      (contact && (contact.name || contact.formattedName || contact.notifyName)) || '';
    const publicName =
      (contact && (contact.pushname || contact.verifiedName || contact.notifyName)) ||
      (username ? '@' + username.replace(/^@/, '') : '') ||
      '';
    const last = extras.lastMsg || { text: '', date: '', type: '', status: '' };
    return {
      'Country Code': resolved.code,
      'Country Name': resolved.name,
      'Country ISO': resolved.iso || '',
      Username: username || '',
      'Phone Number': phone,
      'Formatted Phone': phone ? `+${phone}` : '',
      'Is My Contact': !!(contact && contact.isMyContact),
      'Saved Name': savedName || '',
      'Public Name': publicName || '',
      'Group Name': extras.groupName || '',
      'Is Business': !!(contact && (contact.isBusiness || contact.isEnterprise)),
      'Is Blocked': !!(contact && contact.isContactBlocked),
      Labels: labelNamesForContact(contact, s.Label),
      Note: extractNoteFromModel(await getNoteForChatJid(contact && contact.id)).note ||
        extractContactNote(contact).note,
      'Last Msg Text': last.text || '',
      'Last Msg Date': last.date || '',
      'Last Msg Type': last.type || '',
      'Last Msg Status': last.status || ''
    };
  }

  function getContactById(id) {
    const s = discoverStore();
    if (!s.Contact) return null;
    const sid = serializedId(id);
    try {
      if (typeof s.Contact.get === 'function') {
        return s.Contact.get(id) || s.Contact.get(sid) || null;
      }
    } catch (_) {}
    const all = modelsOf(s.Contact);
    return all.find((c) => serializedId(c.id) === sid) || null;
  }

  function readModelField(model, keys) {
    if (!model || !keys || !keys.length) return undefined;
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      try {
        if (typeof model.get === 'function') {
          const viaGet = model.get(key);
          if (viaGet != null && viaGet !== '') return viaGet;
        }
      } catch (_) {}
      try {
        const direct = model[key];
        if (direct != null && direct !== '') return direct;
      } catch (_) {}
      try {
        const xKey = '__x_' + key;
        const viaX = model[xKey];
        if (viaX != null && viaX !== '') return viaX;
      } catch (_) {}
    }
    return undefined;
  }

  function pickNoteActionsFromMod(mod) {
    if (!mod) return null;
    if (typeof mod.retrieveOnlyNoteForChatJid === 'function') return mod;
    if (mod.default && typeof mod.default.retrieveOnlyNoteForChatJid === 'function') return mod.default;
    if (
      typeof mod.addOrEditNoteAction === 'function' ||
      typeof mod.noteEditAction === 'function' ||
      typeof mod.noteAddAction === 'function'
    ) {
      return mod;
    }
    if (
      mod.default &&
      (typeof mod.default.addOrEditNoteAction === 'function' ||
        typeof mod.default.noteEditAction === 'function' ||
        typeof mod.default.noteAddAction === 'function')
    ) {
      return mod.default;
    }
    return null;
  }

  function getNoteCollection() {
    let mod = tryPageRequire('WAWebNoteCollection');
    if (!mod) {
      try {
        mod = findModuleById(/WAWebNoteCollection/i);
      } catch (_) {}
    }
    if (!mod) return null;
    return mod.NoteCollection || mod.NoteCollectionImpl || mod.default || null;
  }

  function getNoteActions() {
    let mod = tryPageRequire('WAWebNoteAction');
    let actions = pickNoteActionsFromMod(mod);
    if (actions) return actions;
    try {
      mod = findModuleById(/WAWebNoteAction/i);
      actions = pickNoteActionsFromMod(mod);
      if (actions) return actions;
    } catch (_) {}
    // 非 Chrome / 模块 id 变动：扫描导出里的备注写入函数
    try {
      actions = scanModules(
        (m) =>
          m &&
          (typeof m.addOrEditNoteAction === 'function' ||
            typeof m.noteEditAction === 'function' ||
            typeof m.noteAddAction === 'function' ||
            typeof m.retrieveOnlyNoteForChatJid === 'function'),
        5000
      );
      if (actions) return actions;
    } catch (_) {}
    return null;
  }

  function readBoolField(obj, keys) {
    if (!obj) return null;
    for (let i = 0; i < keys.length; i++) {
      try {
        const v = obj[keys[i]];
        if (typeof v === 'boolean') return v;
      } catch (_) {}
    }
    try {
      if (typeof obj.get === 'function') {
        for (let i = 0; i < keys.length; i++) {
          const v = obj.get(keys[i]);
          if (typeof v === 'boolean') return v;
        }
      }
    } catch (_) {}
    return null;
  }

  /** 官方 Notes 门控：个人版对任意 wid 均为 false */
  function shouldEnableNativeNotesForWid(widLike) {
    try {
      const mod = tryPageRequire('WAWebNotesUtils');
      if (!mod || typeof mod.shouldEnableNotesForWid !== 'function') return null;
      if (!widLike) return null;
      return !!mod.shouldEnableNotesForWid(widLike);
    } catch (_) {
      return null;
    }
  }

  /** 当前登录账号是否 WhatsApp Business（个人版官方不支持备注） */
  function getSelfIsBusinessApp() {
    try {
      const s = discoverStore();
      const Conn = s && s.Conn;
      const fromConn = readBoolField(Conn, [
        'isSMB',
        '__x_isSMB',
        'isBusiness',
        '__x_isBusiness',
        'isEnterprise',
        '__x_isEnterprise',
        'isSmb',
        '__x_isSmb'
      ]);
      if (typeof fromConn === 'boolean') return fromConn;
    } catch (_) {}

    // Conn 上常读不到 isSMB；用自己的 Contact 标志兜底（个人版 isBusiness=false）
    try {
      const Me = tryPageRequire('WAWebUserPrefsMeUser');
      const meWid =
        (Me && typeof Me.getMaybeMePnUser === 'function' && Me.getMaybeMePnUser()) ||
        (Me && typeof Me.getMaybeMeLidUser === 'function' && Me.getMaybeMeLidUser()) ||
        null;
      const s = discoverStore();
      const Contact = s && s.Contact;
      const selfContact =
        (meWid && Contact && typeof Contact.get === 'function' && Contact.get(meWid)) || null;
      const fromMe = readBoolField(selfContact, [
        'isBusiness',
        '__x_isBusiness',
        'isSMB',
        '__x_isSMB',
        'isSmb',
        '__x_isSmb',
        'isEnterprise',
        '__x_isEnterprise'
      ]);
      if (typeof fromMe === 'boolean') return fromMe;
    } catch (_) {}

    // 页面标题兜底：个人版 "WhatsApp"，商业版 "WhatsApp Business"
    try {
      const t = String((typeof document !== 'undefined' && document.title) || '');
      if (/whatsapp\s*business/i.test(t)) return true;
      if (/^whatsapp$/i.test(t.trim())) return false;
    } catch (_) {}

    return null;
  }

  /**
   * 个人版 WA 无原装备注；仅 Business 且 Notes 门控开启 + Note API 可用才走官方。
   * 注意：个人版也会加载 NoteCollection/NoteAction，不能仅凭模块存在判定。
   */
  function isNativeNoteSupported() {
    const smb = getSelfIsBusinessApp();
    if (smb === false) return false;
    if (!isStoreReady()) return null;

    let notesGate = null;
    try {
      const chat = getActiveChat();
      if (chat && chat.id) notesGate = shouldEnableNativeNotesForWid(chat.id);
      if (notesGate == null) {
        const Me = tryPageRequire('WAWebUserPrefsMeUser');
        const meWid =
          (Me && typeof Me.getMaybeMePnUser === 'function' && Me.getMaybeMePnUser()) ||
          (Me && typeof Me.getMaybeMeLidUser === 'function' && Me.getMaybeMeLidUser()) ||
          null;
        if (meWid) notesGate = shouldEnableNativeNotesForWid(meWid);
      }
    } catch (_) {}
    if (notesGate === false) return false;

    const NC = getNoteCollection();
    const actions = getNoteActions();
    if (!actions) {
      if (smb === true || notesGate === true) return null;
      return false;
    }
    const canWrite =
      typeof actions.addOrEditNoteAction === 'function' ||
      typeof actions.noteEditAction === 'function' ||
      typeof actions.noteAddAction === 'function';
    const canRead =
      typeof actions.retrieveOnlyNoteForChatJid === 'function' ||
      !!(NC && typeof NC.maybeGetNoteByChatJid === 'function');
    if (!(canWrite && canRead)) {
      if (smb === true || notesGate === true) return null;
      return false;
    }
    // 模块齐全仍不够：必须是商业号或 Notes 门控明确开启
    if (smb === true || notesGate === true) return true;
    return false;
  }

  function getNoteCapabilityPayload() {
    const smb = getSelfIsBusinessApp();
    const supported = isNativeNoteSupported();
    const pending = supported === null;
    return {
      supported: pending ? null : !!supported,
      pending,
      isBusinessApp: smb,
      hasNoteCollection: !!getNoteCollection(),
      hasNoteActions: !!getNoteActions(),
      storeReady: isStoreReady(),
      mode: pending ? 'pending' : supported ? 'wa' : 'local'
    };
  }

  function extractNoteFromModel(noteModel) {
    if (!noteModel) return { note: '', updatedAt: 0 };
    const raw = readModelField(noteModel, ['content', 'note', 'text']);
    const note = String(raw == null ? '' : raw).trim();
    let updatedAt = 0;
    const ts = readModelField(noteModel, ['modifiedAt', 'createdAt', 'noteTimestamp']);
    if (ts != null) {
      const n = Number(ts);
      if (Number.isFinite(n) && n > 0) {
        // WhatsApp 多为秒级时间戳
        updatedAt = n < 1e12 ? Math.floor(n * 1000) : Math.floor(n);
      }
    }
    return { note, updatedAt };
  }

  /** 兼容旧 contact.note；主流 WA 备注在独立 NoteCollection，字段为 content */
  function extractContactNote(contact) {
    const raw = readModelField(contact, ['note', 'Note', 'contactNote', 'content']);
    const note = String(raw == null ? '' : raw).trim();
    let updatedAt = 0;
    const ts = readModelField(contact, ['noteTimestamp', 'noteTs', 'notesTimestamp', 'modifiedAt']);
    if (ts != null) {
      const n = Number(ts);
      if (Number.isFinite(n) && n > 0) {
        updatedAt = n < 1e12 ? Math.floor(n * 1000) : Math.floor(n);
      }
    }
    return { note, updatedAt };
  }

  async function getNoteForChatJid(chatJidLike) {
    const sid = serializedId(chatJidLike);
    if (!sid) return null;
    const NC = getNoteCollection();

    // maybeGetNoteByChatJid 内部用 === 比较，chatJid 存的是序列化字符串
    if (NC && typeof NC.maybeGetNoteByChatJid === 'function') {
      try {
        const cached = NC.maybeGetNoteByChatJid(sid);
        if (cached) return cached;
      } catch (_) {}
    }

    const actions = getNoteActions();
    if (actions && typeof actions.retrieveOnlyNoteForChatJid === 'function') {
      try {
        // IndexedDB 查询需要字符串 key，传 Wid 对象会 DataError
        const note = await actions.retrieveOnlyNoteForChatJid(sid);
        if (note) return note;
      } catch (_) {}
    }

    if (NC && typeof NC.maybeGetNoteByChatJid === 'function') {
      try {
        return NC.maybeGetNoteByChatJid(sid) || null;
      } catch (_) {}
    }
    return null;
  }

  function getActiveChat() {
    const s = discoverStore();
    if (!s.Chat) return null;
    try {
      if (typeof s.Chat.getActive === 'function') {
        const active = s.Chat.getActive();
        if (active) return active;
      }
    } catch (_) {}
    try {
      if (s.Chat.active) return s.Chat.active;
    } catch (_) {}
    try {
      const cmdMod =
        tryPageRequire('WAWebCmd') ||
        tryPageRequire('WAWebCommandImpl') ||
        findModuleById(/WAWebCmd/i);
      const Cmd = unwrapModule(cmdMod, ['Cmd', 'CmdImpl', 'default']) || cmdMod;
      if (Cmd && typeof Cmd.getActiveChat === 'function') {
        const active = Cmd.getActiveChat();
        if (active) return active;
      }
    } catch (_) {}
    try {
      const models = modelsOf(s.Chat);
      for (let i = 0; i < models.length; i++) {
        const chat = models[i];
        if (!chat) continue;
        if (chat.active || chat.__x_active) return chat;
        try {
          if (typeof chat.get === 'function' && chat.get('active')) return chat;
        } catch (_) {}
      }
    } catch (_) {}
    return null;
  }

  async function getActiveContactNotePayload() {
    const nativeSupported = isNativeNoteSupported();
    const chat = getActiveChat();
    if (!chat) {
      return {
        note: '',
        updatedAt: 0,
        chatId: '',
        isGroup: false,
        found: false,
        nativeNotesSupported: nativeSupported
      };
    }
    const chatId = serializedId(chat.id);
    const isGroup = !!(chat.isGroup || isGroupId(chat.id));
    if (isGroup) {
      return {
        note: '',
        updatedAt: 0,
        chatId,
        isGroup: true,
        found: true,
        nativeNotesSupported: nativeSupported
      };
    }
    if (nativeSupported === false) {
      return {
        note: '',
        updatedAt: 0,
        chatId,
        isGroup: false,
        found: true,
        nativeNotesSupported: false,
        via: 'unsupported'
      };
    }
    if (nativeSupported == null) {
      return {
        note: '',
        updatedAt: 0,
        chatId,
        isGroup: false,
        found: true,
        nativeNotesSupported: null,
        pending: true,
        via: 'pending'
      };
    }
    let contact = chat.contact || null;
    if (!contact && chat.id) contact = getContactById(chat.id);
    if (!contact && chat.contact && chat.contact.id) contact = getContactById(chat.contact.id);

    let extracted = extractNoteFromModel(await getNoteForChatJid(chat.id || chatId));
    // 回退：极少数版本仍挂在 contact 上
    if (!extracted.note) extracted = extractContactNote(contact);

    return {
      note: extracted.note,
      updatedAt: extracted.updatedAt,
      chatId,
      isGroup: false,
      found: true,
      hasContact: !!contact,
      nativeNotesSupported: true,
      via: extracted.note ? 'note_collection' : 'empty'
    };
  }

  function contactIsBusiness(contact) {
    return !!(contact && (contact.isBusiness || contact.isEnterprise
      || contact.__x_isBusiness || contact.__x_isEnterprise));
  }

  /** 当前会话真实电话（E.164）+ username 国家 ISO，供顶栏国家/语言/当地时间使用 */
  async function getActiveContactPhonePayload() {
    const chat = getActiveChat();
    if (!chat) {
      return {
        phone: '',
        chatId: '',
        isGroup: false,
        found: false,
        isBusiness: false,
        countryIso: '',
        username: ''
      };
    }
    const chatId = serializedId(chat.id);
    const isGroup = !!(chat.isGroup || isGroupId(chat.id));
    if (isGroup) {
      return {
        phone: '',
        chatId,
        isGroup: true,
        found: true,
        isBusiness: false,
        countryIso: '',
        username: ''
      };
    }
    let contact = chat.contact || null;
    if (!contact && chat.id) contact = getContactById(chat.id);
    if (!contact && chat.contact && chat.contact.id) contact = getContactById(chat.contact.id);
    const isBusiness = contactIsBusiness(contact);
    const username = getContactUsername(contact);
    const countryIso = getUsernameCountryCode(contact);

    let digits = '';
    try {
      digits = await getPhoneNumber(contact || chat);
    } catch (_) {}
    digits = String(digits || '').replace(/\D/g, '');
    if (!digits || digits.length < 7 || digits.length > 15) {
      return {
        phone: '',
        chatId,
        isGroup: false,
        found: true,
        hasContact: !!contact,
        isBusiness,
        countryIso: countryIso || '',
        username: username || ''
      };
    }
    return {
      phone: '+' + digits,
      chatId,
      isGroup: false,
      found: true,
      hasContact: !!contact,
      isBusiness,
      countryIso: countryIso || '',
      username: username || ''
    };
  }

  async function setNoteForChatJid(chatJidLike, content) {
    const sid = serializedId(chatJidLike);
    if (!sid) throw new Error('invalid_chat_jid');
    const text = String(content == null ? '' : content);
    const actions = getNoteActions();
    if (!actions) throw new Error('no_note_actions');

    const existing = await getNoteForChatJid(sid);
    const existingId = existing && (existing.id || readModelField(existing, ['id']));
    const chatJid =
      (existing && (existing.chatJid || readModelField(existing, ['chatJid']))) || sid;
    const noteType =
      (existing && (existing.type || readModelField(existing, ['type']))) || 'unstructured';
    const createdAt = (() => {
      const raw = existing && (existing.createdAt || readModelField(existing, ['createdAt']));
      const n = Number(raw);
      if (Number.isFinite(n) && n > 0) return n < 1e12 ? Math.floor(n) : Math.floor(n / 1000);
      return Math.floor(Date.now() / 1000);
    })();

    if (existing && existingId) {
      // 与官方 UI 一致：noteEditAction({ chatJid, content, createdAt, id, type })
      // content 为空即删除备注（FAQ / WAWebCustomerProfileNotesField）
      const editPayload = {
        chatJid,
        content: text,
        createdAt,
        id: existingId,
        type: noteType
      };
      if (typeof actions.noteEditAction === 'function') {
        await actions.noteEditAction(editPayload);
      } else if (typeof actions.addOrEditNoteAction === 'function') {
        await actions.addOrEditNoteAction({
          ...editPayload,
          actionType: 'edit',
          noteType
        });
      } else {
        throw new Error('no_note_edit');
      }
    } else if (text.trim()) {
      const addPayload = {
        chatJid: sid,
        content: text,
        type: 'unstructured'
      };
      if (typeof actions.noteAddAction === 'function') {
        await actions.noteAddAction(addPayload);
      } else if (typeof actions.addOrEditNoteAction === 'function') {
        await actions.addOrEditNoteAction({
          ...addPayload,
          actionType: 'add',
          noteType: 'unstructured',
          createdAt: Math.floor(Date.now() / 1000)
        });
      } else {
        throw new Error('no_note_add');
      }
    }
    // 无已有备注且内容为空：无需调用，视为已删除

    const fresh = await getNoteForChatJid(chatJid);
    const extracted = extractNoteFromModel(fresh);
    // 空内容时以调用方为准，避免偶发读到旧缓存
    if (!text.trim()) return { note: '', updatedAt: extracted.updatedAt || 0 };
    return extracted;
  }

  async function setActiveContactNote(content) {
    const supported = isNativeNoteSupported();
    if (supported === false) throw new Error('native_notes_unsupported');
    if (supported == null) throw new Error('not_ready');
    const chat = getActiveChat();
    if (!chat) throw new Error('no_active_chat');
    const chatId = serializedId(chat.id);
    if (chat.isGroup || isGroupId(chat.id)) throw new Error('group_not_supported');
    const extracted = await setNoteForChatJid(chat.id || chatId, content);
    return {
      note: extracted.note,
      updatedAt: extracted.updatedAt,
      chatId,
      isGroup: false,
      found: true,
      nativeNotesSupported: true,
      via: 'note_collection'
    };
  }

  function syncPhoneHint(contactOrChat) {
    if (!contactOrChat) return '';
    try {
      const formatted = contactOrChat.formattedPhone || contactOrChat.phoneNumber;
      if (formatted) {
        const digits = String(formatted).replace(/\D/g, '');
        if (digits) return digits;
      }
    } catch (_) {}
    try {
      const id = contactOrChat.id;
      const server = idServer(id);
      const user = idUser(id);
      if ((server === 'c.us' || server === 's.whatsapp.net') && /^\d+$/.test(user)) return user;
    } catch (_) {}
    return '';
  }

  /** 与 content-quick-remark normalizeKey 对齐：电话标题会变成 +纯数字 / 纯数字；兼容 @username */
  function expandLookupKeyVariants(raw) {
    const s = String(raw || '').trim();
    if (!s) return [];
    const out = [];
    const push = (v) => {
      const t = String(v || '').trim();
      if (!t || out.indexOf(t) >= 0) return;
      out.push(t);
    };
    push(s.slice(0, 80));
    if (s.charAt(0) === '@' && s.length > 1) {
      push(s.slice(1, 81));
    } else if (/^[A-Za-z0-9._]{3,35}$/.test(s)) {
      push(('@' + s).slice(0, 80));
    }
    const plusMatch = s.match(/\+[\d\s\-\(\)]+/);
    if (plusMatch) {
      const compact = plusMatch[0].replace(/[\s\-\(\)]/g, '');
      const digits = compact.replace(/\D/g, '');
      if (digits.length >= 7) {
        push(compact);
        push(digits);
      }
    } else if (/^\+?[\d\s\-\(\)]{8,}$/.test(s)) {
      const digits = s.replace(/\D/g, '');
      if (digits.length >= 7) {
        push(digits);
        push('+' + digits);
      }
    }
    return out;
  }

  function putNoteAlias(map, rawKey, noteText) {
    if (!map || !noteText) return;
    const variants = expandLookupKeyVariants(rawKey);
    for (let i = 0; i < variants.length; i++) {
      map[variants[i]] = noteText;
    }
  }

  function indexNoteAgainstChat(noteText, chat, byChatId, byPhone, byName) {
    if (!noteText || !chat) return;
    const sid = serializedId(chat.id);
    if (sid) byChatId[sid] = noteText;
    const contact = chat.contact || getContactById(chat.id);
    const phone = syncPhoneHint(contact) || syncPhoneHint(chat);
    if (phone) putNoteAlias(byPhone, phone, noteText);
    const names = [
      contact && contact.name,
      contact && contact.formattedName,
      contact && contact.notifyName,
      contact && contact.pushname,
      contact && contact.verifiedName,
      chat.formattedTitle,
      chat.name
    ];
    for (let i = 0; i < names.length; i++) {
      const name = String(names[i] || '').trim();
      if (!name) continue;
      putNoteAlias(byName, name, noteText);
      // 标题里的电话也写入 byPhone，供列表 normalizeKey 命中
      const phoneFromName = expandLookupKeyVariants(name).find((k) => /^\+?\d{7,}$/.test(k));
      if (phoneFromName) putNoteAlias(byPhone, phoneFromName, noteText);
    }
  }

  async function mapPool(items, concurrency, worker) {
    const list = Array.isArray(items) ? items : [];
    if (!list.length) return [];
    const limit = Math.max(1, Math.min(Number(concurrency) || 8, 20));
    const out = new Array(list.length);
    let cursor = 0;
    async function run() {
      while (cursor < list.length) {
        const i = cursor++;
        try {
          out[i] = await worker(list[i], i);
        } catch (_) {
          out[i] = null;
        }
      }
    }
    const runners = [];
    for (let i = 0; i < Math.min(limit, list.length); i++) runners.push(run());
    await Promise.all(runners);
    return out;
  }

  function collectChatLookupKeys(chat) {
    const keys = [];
    const pushAll = (raw) => {
      const variants = expandLookupKeyVariants(raw);
      for (let i = 0; i < variants.length; i++) {
        if (keys.indexOf(variants[i]) < 0) keys.push(variants[i]);
      }
    };
    if (!chat) return keys;
    const contact = chat.contact || getContactById(chat.id);
    pushAll(syncPhoneHint(contact) || syncPhoneHint(chat));
    const username = getContactUsername(contact);
    if (username) {
      pushAll(username);
      pushAll('@' + username.replace(/^@/, ''));
    }
    pushAll(contact && (contact.displayNameLID || contact.__x_displayNameLID));
    const names = [
      contact && contact.name,
      contact && contact.formattedName,
      contact && contact.notifyName,
      contact && contact.pushname,
      contact && contact.verifiedName,
      chat.formattedTitle,
      chat.name
    ];
    for (let i = 0; i < names.length; i++) pushAll(names[i]);
    return keys;
  }

  function chatMatchesLookupKeySet(chat, keySet) {
    if (!keySet || !keySet.size) return true;
    const keys = collectChatLookupKeys(chat);
    for (let i = 0; i < keys.length; i++) {
      if (keySet.has(keys[i])) return true;
    }
    return false;
  }

  async function buildNotesLookup(options) {
    const byChatId = {};
    const byPhone = {};
    const byName = {};
    const nativeSupported = isNativeNoteSupported();
    if (nativeSupported === false) {
      return {
        byChatId,
        byPhone,
        byName,
        count: 0,
        cached: 0,
        retrieved: 0,
        nativeNotesSupported: false
      };
    }
    if (nativeSupported == null) {
      return {
        byChatId,
        byPhone,
        byName,
        count: 0,
        cached: 0,
        retrieved: 0,
        nativeNotesSupported: null,
        pending: true
      };
    }
    const retrieveMissing = !!(options && options.retrieveMissing);
    const limit = Math.max(1, Math.min(Number(options && options.limit) || 80, 200));
    const concurrency = Math.max(1, Math.min(Number(options && options.concurrency) || 8, 20));
    const chatIdsFilter = Array.isArray(options && options.chatIds)
      ? options.chatIds.map((x) => serializedId(x)).filter(Boolean)
      : null;
    const lookupKeySet = (() => {
      if (!Array.isArray(options && options.lookupKeys)) return null;
      const set = new Set();
      for (let i = 0; i < options.lookupKeys.length; i++) {
        const variants = expandLookupKeyVariants(options.lookupKeys[i]);
        for (let j = 0; j < variants.length; j++) set.add(variants[j]);
      }
      return set.size ? set : null;
    })();
    const s = discoverStore();
    if (!s.Chat) {
      return { byChatId, byPhone, byName, count: 0, cached: 0, retrieved: 0, nativeNotesSupported: true };
    }

    const NC = getNoteCollection();

    // 1) 内存中已有 Note：立刻建索引（几乎零成本，方便滚动回看）
    let cached = 0;
    try {
      const noteModels = modelsOf(NC);
      for (let i = 0; i < noteModels.length; i++) {
        const noteModel = noteModels[i];
        const extracted = extractNoteFromModel(noteModel);
        if (!extracted.note) continue;
        const chatJid = serializedId(
          readModelField(noteModel, ['chatJid']) || noteModel.chatJid || noteModel.__x_chatJid
        );
        if (!chatJid) continue;
        if (chatIdsFilter && chatIdsFilter.indexOf(chatJid) < 0) continue;
        byChatId[chatJid] = extracted.note;
        cached += 1;
        let chat = null;
        try {
          chat =
            (typeof s.Chat.get === 'function' && (s.Chat.get(chatJid) || s.Chat.get(noteModel.chatJid))) ||
            null;
        } catch (_) {}
        if (chat) indexNoteAgainstChat(extracted.note, chat, byChatId, byPhone, byName);
        else {
          const contact = getContactById(chatJid);
          if (contact) {
            const phone = syncPhoneHint(contact);
            if (phone) putNoteAlias(byPhone, phone, extracted.note);
            const name = String(
              contact.name ||
                contact.formattedName ||
                contact.notifyName ||
                contact.pushname ||
                contact.verifiedName ||
                ''
            ).trim();
            if (name) putNoteAlias(byName, name, extracted.note);
          }
        }
      }
    } catch (_) {}

    // 2) 仅处理目标会话：可见 lookupKeys / chatIds；否则才退回最近会话
    let chats = modelsOf(s.Chat).filter((c) => c && !c.isGroup && !isGroupId(c.id));
    chats.sort((a, b) => (Number(b.t) || 0) - (Number(a.t) || 0));
    if (chatIdsFilter && chatIdsFilter.length) {
      const want = new Set(chatIdsFilter);
      chats = chats.filter((c) => want.has(serializedId(c.id)));
    }
    if (lookupKeySet && lookupKeySet.size) {
      chats = chats.filter((c) => chatMatchesLookupKeySet(c, lookupKeySet));
    }
    // 有可见 key 时只取匹配项；否则限制最近会话数量
    if (!(lookupKeySet && lookupKeySet.size) && !(chatIdsFilter && chatIdsFilter.length)) {
      chats = chats.slice(0, limit);
    } else {
      chats = chats.slice(0, Math.min(chats.length, Math.max(limit, lookupKeySet ? lookupKeySet.size : 40)));
    }

    const missing = [];
    for (let i = 0; i < chats.length; i++) {
      const chat = chats[i];
      const sid = serializedId(chat.id);
      if (!sid) continue;
      if (byChatId[sid]) {
        indexNoteAgainstChat(byChatId[sid], chat, byChatId, byPhone, byName);
        continue;
      }
      let noteModel = null;
      if (NC && typeof NC.maybeGetNoteByChatJid === 'function') {
        try {
          noteModel = NC.maybeGetNoteByChatJid(sid);
        } catch (_) {}
      }
      if (noteModel) {
        const extracted = extractNoteFromModel(noteModel);
        if (extracted.note) {
          indexNoteAgainstChat(extracted.note, chat, byChatId, byPhone, byName);
          cached += 1;
          continue;
        }
      }
      if (retrieveMissing) missing.push(chat);
    }

    let retrieved = 0;
    if (retrieveMissing && missing.length) {
      await mapPool(missing, concurrency, async (chat) => {
        const sid = serializedId(chat.id);
        if (!sid || byChatId[sid]) return null;
        let noteModel = null;
        try {
          noteModel = await getNoteForChatJid(sid);
        } catch (_) {}
        const extracted = extractNoteFromModel(noteModel);
        if (!extracted.note) return null;
        indexNoteAgainstChat(extracted.note, chat, byChatId, byPhone, byName);
        retrieved += 1;
        return extracted.note;
      });
    }

    return {
      byChatId,
      byPhone,
      byName,
      count: Object.keys(byChatId).length,
      cached,
      retrieved,
      nativeNotesSupported: true
    };
  }

  /** 可见列表标题/姓名 → E.164 电话 + username 国家 ISO（无号时也能显示国家） */
  async function buildPhoneLookup(options) {
    const limit = Math.max(1, Math.min(Number(options && options.limit) || 40, 120));
    const concurrency = Math.max(1, Math.min(Number(options && options.concurrency) || 8, 16));
    const lookupKeySet = (() => {
      if (!Array.isArray(options && options.lookupKeys)) return null;
      const set = new Set();
      for (let i = 0; i < options.lookupKeys.length; i++) {
        const variants = expandLookupKeyVariants(options.lookupKeys[i]);
        for (let j = 0; j < variants.length; j++) set.add(variants[j]);
      }
      return set.size ? set : null;
    })();

    const s = discoverStore();
    const byKey = {};
    const byKeyIso = {};
    if (!s.Chat) return { byKey, byKeyIso, count: 0 };

    let chats = modelsOf(s.Chat).filter((c) => c && !c.isGroup && !isGroupId(c.id));
    chats.sort((a, b) => (Number(b.t) || 0) - (Number(a.t) || 0));
    if (lookupKeySet && lookupKeySet.size) {
      chats = chats.filter((c) => chatMatchesLookupKeySet(c, lookupKeySet));
    } else {
      chats = chats.slice(0, limit);
    }
    chats = chats.slice(0, Math.min(chats.length, Math.max(limit, lookupKeySet ? lookupKeySet.size : limit)));

    await mapPool(chats, concurrency, async (chat) => {
      const contact = chat.contact || getContactById(chat.id);
      let digits = '';
      try {
        digits = await getPhoneNumber(contact || chat);
      } catch (_) {}
      digits = String(digits || '').replace(/\D/g, '');
      const iso = getUsernameCountryCode(contact);
      const keys = collectChatLookupKeys(chat);
      let e164 = '';
      if (digits && digits.length >= 7 && digits.length <= 15) {
        e164 = '+' + digits;
        for (let i = 0; i < keys.length; i++) {
          byKey[keys[i]] = e164;
        }
      }
      if (iso) {
        for (let i = 0; i < keys.length; i++) {
          byKeyIso[keys[i]] = iso;
        }
      }
      return e164 || iso || null;
    });

    return {
      byKey,
      byKeyIso,
      count: Object.keys(byKey).length + Object.keys(byKeyIso).length
    };
  }

  async function getGroupParticipants(groupId) {
    const s = discoverStore();
    const sid = serializedId(groupId);
    const participants = [];

    try {
      if (s.GroupMetadata) {
        let meta = null;
        if (typeof s.GroupMetadata.get === 'function') meta = s.GroupMetadata.get(sid) || s.GroupMetadata.get(groupId);
        if (!meta && typeof s.GroupMetadata.find === 'function') {
          try {
            meta = await s.GroupMetadata.find(sid);
          } catch (_) {}
        }
        if (meta) {
          let list = [];
          if (meta.participants) {
            if (typeof meta.participants.getModelsArray === 'function') list = meta.participants.getModelsArray();
            else if (Array.isArray(meta.participants)) list = meta.participants;
            else if (Array.isArray(meta.participants.models)) list = meta.participants.models;
          }
          for (let i = 0; i < list.length; i++) {
            const p = list[i];
            participants.push({
              id: p.id || p,
              isAdmin: !!(p.isAdmin || p.isSuperAdmin),
              isSuperAdmin: !!p.isSuperAdmin
            });
          }
        }
      }
    } catch (_) {}

    if (!participants.length && s.Participants && typeof s.Participants.getParticipants === 'function') {
      try {
        const list = await s.Participants.getParticipants(sid);
        if (Array.isArray(list)) {
          for (let i = 0; i < list.length; i++) {
            const p = list[i];
            participants.push({
              id: p.id || p,
              isAdmin: !!(p.isAdmin || p.isSuperAdmin),
              isSuperAdmin: !!p.isSuperAdmin
            });
          }
        }
      } catch (_) {}
    }

    return participants;
  }

  function groupDisplayName(chatOrMeta) {
    if (!chatOrMeta) return '';
    return (
      chatOrMeta.formattedTitle ||
      chatOrMeta.name ||
      chatOrMeta.contact?.name ||
      chatOrMeta.contact?.formattedName ||
      idUser(chatOrMeta.id) ||
      ''
    );
  }

  function dedupeRows(rows) {
    const seen = new Set();
    const out = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const key = `${r['Phone Number']}|${r['Saved Name']}|${r['Group Name']}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(r);
    }
    return out;
  }

  async function buildMeta() {
    const s = discoverStore();
    const chats = modelsOf(s.Chat);
    const contacts = modelsOf(s.Contact);
    const groups = [];
    for (let i = 0; i < chats.length; i++) {
      const c = chats[i];
      if (!c || !isGroupId(c.id)) continue;
      // 列表阶段不做逐群拉成员（避免长时间 busy）；导出时再取
      let count = 0;
      try {
        const meta =
          s.GroupMetadata && typeof s.GroupMetadata.get === 'function'
            ? s.GroupMetadata.get(serializedId(c.id)) || s.GroupMetadata.get(c.id)
            : null;
        if (meta && meta.participants) {
          if (typeof meta.participants.getModelsArray === 'function') {
            count = meta.participants.getModelsArray().length;
          } else if (Array.isArray(meta.participants)) {
            count = meta.participants.length;
          } else if (typeof meta.participants.length === 'number') {
            count = meta.participants.length;
          }
        }
        if (!count && typeof c.groupMetadata?.participants?.length === 'number') {
          count = c.groupMetadata.participants.length;
        }
      } catch (_) {
        count = 0;
      }
      groups.push({
        id: serializedId(c.id),
        name: groupDisplayName(c),
        participantsCount: count
      });
    }

    const labels = modelsOf(s.Label).map((l) => ({
      id: String(l.id),
      name: l.name || String(l.id),
      count: Array.isArray(l.labelItemCollection)
        ? l.labelItemCollection.length
        : modelsOf(l.labelItemCollection || {}).length || 0
    }));

    let chatsLength = 0;
    let contactsLength = 0;
    for (let i = 0; i < chats.length; i++) {
      const c = chats[i];
      if (!c || isGroupId(c.id)) continue;
      if (idServer(c.id) === 'c.us' || idServer(c.id) === 's.whatsapp.net' || isLidId(c.id)) chatsLength++;
    }
    for (let i = 0; i < contacts.length; i++) {
      if (contacts[i] && contacts[i].isMyContact) contactsLength++;
    }

    // 国家统计：号码前缀优先；无号时用 usernameCountryCode（同步，不拖慢刷新）
    const countryCount = {};
    for (let i = 0; i < contacts.length; i++) {
      if (stopCollect) break;
      const c = contacts[i];
      let phone = '';
      try {
        const id = c && c.id;
        const user = idUser(id);
        const server = idServer(id);
        if ((server === 'c.us' || server === 's.whatsapp.net') && /^\d+$/.test(user)) phone = user;
        else if (c && c.phoneNumber) phone = digitsFromPhoneLike(c.phoneNumber);
      } catch (_) {}
      let dial = matchDialCode(phone, countryTable);
      if (!dial.code) {
        const iso = getUsernameCountryCode(c);
        if (iso) dial = matchCountryByIso(iso, countryTable);
      }
      if (!dial.code) continue;
      countryCount[dial.code] = (countryCount[dial.code] || 0) + 1;
    }

    const countryData = (countryTable || [])
      .map((row) => ({
        name: row[0],
        iso: row[1],
        dialCode: String(row[2]),
        count: countryCount[String(row[2])] || 0
      }))
      .filter((c) => c.count > 0)
      .sort((a, b) => b.count - a.count);

    return {
      ready: true,
      groupList: groups,
      labelList: labels,
      chatData: { chatsLength, contactsLength },
      countryData,
      storeVia: (discoverStore() && discoverStore().via) || ''
    };
  }

  async function exportGroups(groupIds, hasAdmin, reqId) {
    const rows = [];
    const ids = groupIds || [];
    const total = Math.max(ids.length, 1);
    for (let i = 0; i < ids.length; i++) {
      if (stopCollect) break;
      progress(reqId, i, total, 'groups');
      const gid = ids[i];
      const chat = (() => {
        const s = discoverStore();
        try {
          return s.Chat && s.Chat.get ? s.Chat.get(gid) : null;
        } catch (_) {
          return null;
        }
      })();
      const gName = groupDisplayName(chat) || idUser(gid);
      let parts = await getGroupParticipants(gid);
      if (!hasAdmin) {
        // hasAdmin=true means include all; when filtering admins only use isAdmin
        // Reference: hasAdmin switch = "Include admin" - when true include everyone (with admin info),
        // actually in reference "Include admin" means whether to include admin members when exporting.
        // Looking at plan: 可选仅管理员 - the UI says include admin. When unchecked, exclude admins? 
        // Reference UI: "Include admin" switch - typically when ON, include admins in export (always true for all members).
        // Actually re-read: "Include admin" - when exporting group, include admin flag / include admin users.
        // From analysis: hasAdmin passed to A(groupIds, hasAdmin) - filter participants to admins only when? 
        // Common pattern: hasAdmin true = include all members; false = only non-admins OR only admins.
        // WASBB: "Include admin" switch - usually means include group admins in the export list (default on = all members).
        // When off, export only non-admin members. We'll treat hasAdmin=false as exclude admins.
        parts = parts.filter((p) => !p.isAdmin && !p.isSuperAdmin);
      }
      for (let j = 0; j < parts.length; j++) {
        if (stopCollect) break;
        const p = parts[j];
        let contact = getContactById(p.id);
        if (!contact) {
          contact = { id: p.id, isMyContact: false, pushname: '', name: '' };
        }
        rows.push(await mapContactRow(contact, { groupName: gName }));
      }
      await sleep(0);
    }
    progress(reqId, total, total, 'groups');
    return dedupeRows(rows);
  }

  async function exportChats(mode, reqId) {
    const s = discoverStore();
    const rows = [];
    if (mode === 'contacts') {
      const contacts = modelsOf(s.Contact).filter((c) => c && c.isMyContact);
      const total = Math.max(contacts.length, 1);
      for (let i = 0; i < contacts.length; i++) {
        if (stopCollect) break;
        if (i % 20 === 0) progress(reqId, i, total, 'contacts');
        rows.push(await mapContactRow(contacts[i]));
      }
      progress(reqId, total, total, 'contacts');
    } else {
      const chats = modelsOf(s.Chat).filter((c) => c && !isGroupId(c.id));
      const total = Math.max(chats.length, 1);
      for (let i = 0; i < chats.length; i++) {
        if (stopCollect) break;
        if (i % 20 === 0) progress(reqId, i, total, 'chats');
        const chat = chats[i];
        let contact = chat.contact || getContactById(chat.id);
        if (!contact) contact = { id: chat.id, isMyContact: false };
        const last = lastMsgInfo(chat);
        rows.push(await mapContactRow(contact, { lastMsg: last }));
      }
      progress(reqId, total, total, 'chats');
    }
    return dedupeRows(rows);
  }

  async function exportLabels(labelIds, reqId) {
    const s = discoverStore();
    const set = new Set((labelIds || []).map(String));
    const contacts = modelsOf(s.Contact).filter((c) => {
      if (!c || !c.labels) return false;
      return c.labels.some((id) => set.has(String(id)));
    });
    const rows = [];
    const total = Math.max(contacts.length, 1);
    for (let i = 0; i < contacts.length; i++) {
      if (stopCollect) break;
      if (i % 20 === 0) progress(reqId, i, total, 'labels');
      rows.push(await mapContactRow(contacts[i]));
    }
    progress(reqId, total, total, 'labels');
    return dedupeRows(rows);
  }

  async function exportCountries(dialCodes, reqId) {
    const s = discoverStore();
    const set = new Set((dialCodes || []).map(String));
    const contacts = modelsOf(s.Contact);
    const rows = [];
    const total = Math.max(contacts.length, 1);
    for (let i = 0; i < contacts.length; i++) {
      if (stopCollect) break;
      if (i % 30 === 0) progress(reqId, i, total, 'countries');
      const resolved = await resolveCountryForContact(contacts[i]);
      if (!resolved.code || !set.has(resolved.code)) continue;
      rows.push(await mapContactRow(contacts[i]));
    }
    progress(reqId, total, total, 'countries');
    return dedupeRows(rows);
  }

  async function handleCommand(detail) {
    const reqId = detail && detail.reqId;
    const action = detail && detail.action;
    const payload = (detail && detail.payload) || {};
    if (!reqId || !action) return;

    if (action === 'PING') {
      storeCache = null;
      const ready = isStoreReady();
      const s = storeCache || {};
      reply(reqId, true, {
        ready,
        bridge: true,
        hasRequire: typeof window.require === 'function',
        via: s.via || '',
        hasContact: !!s.Contact,
        hasChat: !!s.Chat
      });
      return;
    }

    if (action === 'STOP_COLLECT') {
      stopCollect = true;
      reply(reqId, true, { stopped: true });
      return;
    }

    if (action === 'SET_COUNTRY_TABLE') {
      countryTable = Array.isArray(payload.table) ? payload.table : [];
      reply(reqId, true, { count: countryTable.length });
      return;
    }

    // 轻量备注读写：不占用导出 busy，避免打断正在进行的备份
    if (
      action === 'GET_ACTIVE_NOTE' ||
      action === 'GET_ACTIVE_PHONE' ||
      action === 'SET_ACTIVE_NOTE' ||
      action === 'GET_NOTE_CAPABILITY' ||
      action === 'GET_NOTES_LOOKUP' ||
      action === 'GET_PHONE_LOOKUP'
    ) {
      try {
        if (!isStoreReady()) {
          // 轻量查询尽快失败重试，避免 UI 长时间空白
          const deadline = Date.now() + 1200;
          while (Date.now() < deadline && !isStoreReady()) {
            storeCache = null;
            await sleep(100);
          }
        }
        if (!isStoreReady()) {
          reply(reqId, false, null, 'not_ready');
          return;
        }
        if (action === 'GET_NOTE_CAPABILITY') {
          reply(reqId, true, getNoteCapabilityPayload());
          return;
        }
        if (action === 'GET_ACTIVE_NOTE') {
          reply(reqId, true, await getActiveContactNotePayload());
          return;
        }
        if (action === 'GET_ACTIVE_PHONE') {
          reply(reqId, true, await getActiveContactPhonePayload());
          return;
        }
        if (action === 'SET_ACTIVE_NOTE') {
          reply(reqId, true, await setActiveContactNote(payload.content));
          return;
        }
        if (action === 'GET_PHONE_LOOKUP') {
          reply(
            reqId,
            true,
            await buildPhoneLookup({
              lookupKeys: payload.lookupKeys,
              limit: payload.limit,
              concurrency: payload.concurrency
            })
          );
          return;
        }
        reply(
          reqId,
          true,
          await buildNotesLookup({
            retrieveMissing: !!payload.retrieveMissing,
            limit: payload.limit,
            concurrency: payload.concurrency,
            chatIds: payload.chatIds,
            lookupKeys: payload.lookupKeys
          })
        );
      } catch (err) {
        reply(reqId, false, null, (err && err.message) || String(err));
      }
      return;
    }

    // 刷新/新导出：打断旧任务，避免长期 busy
    if (busy) {
      stopCollect = true;
      const waitUntil = Date.now() + 2500;
      while (busy && Date.now() < waitUntil) {
        await sleep(50);
      }
      busy = false;
    }

    busy = true;
    stopCollect = false;
    try {
      if (!isStoreReady()) {
        const deadline = Date.now() + 10000;
        while (Date.now() < deadline && !isStoreReady()) {
          storeCache = null;
          await sleep(400);
        }
      }
      if (!isStoreReady()) {
        const s = storeCache || {};
        reply(reqId, false, null, 'not_ready:' + (s.via || 'no_store') + ':req=' + (typeof window.require === 'function'));
        return;
      }

      if (action === 'GET_META') {
        if (Array.isArray(payload.countryTable)) countryTable = payload.countryTable;
        const meta = await buildMeta();
        reply(reqId, true, meta);
        return;
      }

      if (action === 'EXPORT_GROUP') {
        const rows = await exportGroups(payload.groupIds || [], payload.hasAdmin !== false, reqId);
        reply(reqId, true, { rows, stopped: stopCollect });
        return;
      }

      if (action === 'EXPORT_CHAT') {
        const rows = await exportChats(payload.chatsName === 'contacts' ? 'contacts' : 'chats', reqId);
        reply(reqId, true, { rows, stopped: stopCollect });
        return;
      }

      if (action === 'EXPORT_LABEL') {
        const rows = await exportLabels(payload.labelIds || [], reqId);
        reply(reqId, true, { rows, stopped: stopCollect });
        return;
      }

      if (action === 'EXPORT_COUNTRY') {
        const rows = await exportCountries(payload.coutryIds || payload.countryIds || [], reqId);
        reply(reqId, true, { rows, stopped: stopCollect });
        return;
      }

      reply(reqId, false, null, 'unknown_action');
    } catch (err) {
      reply(reqId, false, null, (err && err.message) || String(err));
    } finally {
      busy = false;
    }
  }

  // postMessage 单通道：content → MAIN
  try {
    window.addEventListener('message', (event) => {
      try {
        if (event.source !== window) return;
        const data = event.data;
        if (!data || data.source !== BRIDGE_SOURCE || data.dir !== 'c2p' || !data.type) return;
        if (String(data.type) === EVENT_CMD) handleCommand(data.payload);
      } catch (_) {}
    });
  } catch (_) {}

  function normalizeOpenChatQuery(raw) {
    const s = String(raw == null ? '' : raw).trim().replace(/\s+/g, '');
    if (!s) return { kind: 'empty' };
    // WhatsApp JID：45648678645634@c.us / @lid / @s.whatsapp.net
    const jidMatch = s.match(/^(\d+)@(c\.us|lid|s\.whatsapp\.net)$/i);
    if (jidMatch) {
      const server = jidMatch[2].toLowerCase() === 's.whatsapp.net' ? 'c.us' : jidMatch[2].toLowerCase();
      return { kind: 'jid', jid: jidMatch[1] + '@' + server, user: jidMatch[1], server };
    }
    if (s.startsWith('@')) {
      const username = s.slice(1).replace(/^@+/, '');
      if (!username) return { kind: 'empty' };
      return { kind: 'username', username };
    }
    const digits = s.replace(/\D/g, '');
    const hasLetter = /[A-Za-z]/.test(s);
    if (hasLetter && !/^\+?\d[\d\s\-().]*$/.test(s)) {
      return { kind: 'username', username: s.replace(/^@+/, '') };
    }
    if (digits) return { kind: 'phone', digits };
    return { kind: 'empty' };
  }

  async function findChatByWid(FindChat, wid) {
    if (!FindChat || !wid) return null;
    let chat = null;
    try {
      chat = await FindChat.findExistingChat(wid, 'newChat');
    } catch (_) {}
    if (!chat) {
      try {
        chat = await FindChat.findOrCreateLatestChat(wid, 'newChat');
      } catch (_) {}
    }
    return chat;
  }

  async function openChatFromExistsResult(WidFactory, FindChat, Cmd, exists, meta) {
    if (!exists || !exists.wid) {
      return Object.assign({ ok: false, error: 'chat_not_found', code: 'not_on_whatsapp' }, meta || {});
    }
    let lidWid = null;
    try {
      lidWid = WidFactory.createWid(String(exists.wid));
    } catch (e) {
      return Object.assign({
        ok: false,
        error: String(e && e.message ? e.message : e),
        code: 'wid_failed'
      }, meta || {});
    }
    const chat = await findChatByWid(FindChat, lidWid);
    if (!chat) {
      return Object.assign({ ok: false, error: 'chat_not_found', code: 'not_on_whatsapp' }, meta || {});
    }
    try {
      Cmd.openChatBottom({ chat, chatEntryPoint: 'newChat' });
    } catch (e) {
      return Object.assign({
        ok: false,
        error: String(e && e.message ? e.message : e),
        code: 'open_failed'
      }, meta || {});
    }
    return Object.assign({
      ok: true,
      chatId: chat.id ? String(chat.id) : '',
      name: (chat.formattedTitle || chat.name || exists.username || '').trim()
    }, meta || {});
  }

  function chatDisplayTitles(chat) {
    const out = [];
    const push = (v) => {
      const s = String(v || '').trim();
      if (s && out.indexOf(s) < 0) out.push(s);
    };
    if (!chat) return out;
    try {
      push(chat.formattedTitle);
      push(chat.name);
      push(chat.verifiedName);
      const c = chat.contact;
      if (c) {
        push(c.formattedTitle);
        push(c.name);
        push(c.pushname);
        push(c.verifiedName);
        push(c.notifyName);
      }
    } catch (_) {}
    return out;
  }

  function scoreChatTitleMatch(chat, query) {
    const q = String(query || '').trim();
    if (!q) return 0;
    const qLower = q.toLowerCase();
    const qDigits = q.replace(/\D/g, '');
    const titles = chatDisplayTitles(chat);
    let best = 0;
    for (let i = 0; i < titles.length; i++) {
      const title = titles[i];
      const titleLower = title.toLowerCase();
      const titleDigits = title.replace(/\D/g, '');
      if (titleLower === qLower) best = Math.max(best, 100);
      else if (qDigits.length >= 7 && titleDigits && (titleDigits === qDigits || titleDigits.endsWith(qDigits) || qDigits.endsWith(titleDigits))) {
        best = Math.max(best, 95);
      } else if (qLower.length >= 2 && titleLower === qLower) {
        best = Math.max(best, 100);
      } else if (qLower.length >= 2 && (titleLower.indexOf(qLower) >= 0 || qLower.indexOf(titleLower) >= 0)) {
        best = Math.max(best, titleLower.length >= 2 ? 75 : 50);
      }
    }
    try {
      const sid = serializedId(chat && chat.id);
      if (sid && (sid === q || sid.toLowerCase() === qLower)) best = Math.max(best, 100);
      if (qDigits.length >= 7 && sid) {
        const user = idUser(chat.id);
        if (user && (user === qDigits || user.endsWith(qDigits) || qDigits.endsWith(user))) {
          best = Math.max(best, 98);
        }
      }
    } catch (_) {}
    return best;
  }

  function findBestChatByTitle(rawQuery) {
    const query = String(rawQuery == null ? '' : rawQuery).trim();
    if (!query) return { chat: null, score: 0 };
    const store = discoverStore(false) || discoverStore(true);
    const chats = modelsOf(store && store.Chat);
    if (!chats.length) return { chat: null, score: 0 };
    let best = null;
    let bestScore = 0;
    for (let i = 0; i < chats.length; i++) {
      const score = scoreChatTitleMatch(chats[i], query);
      if (score > bestScore) {
        bestScore = score;
        best = chats[i];
      }
    }
    if (!best || bestScore < 70) return { chat: null, score: bestScore };
    return { chat: best, score: bestScore };
  }

  /** 按会话标题反查 phone/wid（不打开聊天；仅用于修复旧待办备注名 key） */
  async function resolveIdentityByTitleInMain(rawTitle) {
    const title = String(rawTitle || '').trim();
    if (!title) return { ok: false, error: 'empty_title' };
    const hit = findBestChatByTitle(title);
    if (!hit.chat) {
      return { ok: false, error: 'chat_not_found', name: title, score: hit.score || 0 };
    }
    const chat = hit.chat;
    const chatId = serializedId(chat.id) || '';
    const isGroup = !!(chat.isGroup || isGroupId(chat.id));
    let phone = '';
    if (!isGroup) {
      try {
        const digits = String((await getPhoneNumber(chat.contact || chat)) || '').replace(/\D/g, '');
        if (digits.length >= 7 && digits.length <= 15) phone = '+' + digits;
      } catch (_) {}
    }
    const name = (chat.formattedTitle || chat.name || title).trim();
    const customerKey = phone || chatId;
    return {
      ok: !!customerKey,
      phone,
      wid: chatId,
      chatId,
      name,
      isGroup,
      customerKey,
      score: hit.score
    };
  }

  function openChatByTitleInMain(rawQuery, Cmd) {
    const query = String(rawQuery == null ? '' : rawQuery).trim();
    if (!query || !Cmd || typeof Cmd.openChatBottom !== 'function') {
      return { ok: false, error: 'empty_query' };
    }
    const hit = findBestChatByTitle(query);
    if (!hit.chat) {
      return { ok: false, error: 'chat_not_found', kind: 'title', score: hit.score || 0 };
    }
    const best = hit.chat;
    const bestScore = hit.score;
    try {
      Cmd.openChatBottom({ chat: best, chatEntryPoint: 'newChat' });
    } catch (e) {
      return {
        ok: false,
        error: String(e && e.message ? e.message : e),
        kind: 'title',
        code: 'open_failed'
      };
    }
    return {
      ok: true,
      kind: 'title',
      score: bestScore,
      chatId: best.id ? String(serializedId(best.id) || best.id) : '',
      name: (best.formattedTitle || best.name || query).trim()
    };
  }

  async function openChatByJidInMain(jid, Cmd, WidFactory, FindChat) {
    const sid = String(jid || '').trim();
    if (!sid || !Cmd || typeof Cmd.openChatBottom !== 'function') {
      return { ok: false, error: 'empty_query', kind: 'jid' };
    }

    // 已加载会话：Chat.get 最快最稳
    try {
      const store = discoverStore(false) || discoverStore(true);
      if (store && store.Chat && typeof store.Chat.get === 'function') {
        const existing =
          store.Chat.get(sid) ||
          store.Chat.get(sid.replace(/@c\.us$/i, '@s.whatsapp.net')) ||
          null;
        if (existing) {
          Cmd.openChatBottom({ chat: existing, chatEntryPoint: 'newChat' });
          return {
            ok: true,
            kind: 'jid',
            chatId: serializedId(existing.id) || sid,
            name: (existing.formattedTitle || existing.name || '').trim()
          };
        }
      }
    } catch (_) {}

    if (!WidFactory || !FindChat) {
      return { ok: false, error: 'store_unavailable', kind: 'jid', chatId: sid };
    }

    let wid = null;
    try {
      wid = WidFactory.createWid(sid);
    } catch (e) {
      return {
        ok: false,
        error: String(e && e.message ? e.message : e),
        kind: 'jid',
        code: 'wid_failed',
        chatId: sid
      };
    }
    const chat = await findChatByWid(FindChat, wid);
    if (!chat) {
      return { ok: false, error: 'chat_not_found', kind: 'jid', chatId: sid };
    }
    try {
      Cmd.openChatBottom({ chat, chatEntryPoint: 'newChat' });
    } catch (e) {
      return {
        ok: false,
        error: String(e && e.message ? e.message : e),
        kind: 'jid',
        code: 'open_failed',
        chatId: sid
      };
    }
    return {
      ok: true,
      kind: 'jid',
      chatId: serializedId(chat.id) || sid,
      name: (chat.formattedTitle || chat.name || '').trim()
    };
  }

  /** Falo 1:1 — Store API 无刷新开聊（JID / 号码 / @账号 / 会话标题） */
  async function openChatByQueryInMain(rawQuery) {
    const WidFactory = tryPageRequire('WAWebWidFactory');
    const FindChat = tryPageRequire('WAWebFindChatAction');
    const CmdMod = tryPageRequire('WAWebCmd');
    const Cmd = CmdMod && (CmdMod.Cmd || CmdMod.CmdImpl || CmdMod.default);
    const QueryExists = tryPageRequire('WAWebQueryExistsJob');
    if (!Cmd || typeof Cmd.openChatBottom !== 'function') {
      return { ok: false, error: 'store_unavailable' };
    }

    const raw = String(rawQuery == null ? '' : rawQuery).trim();
    const parsed = normalizeOpenChatQuery(rawQuery);

    // 0) WhatsApp JID（最稳：456…@c.us / @lid）
    if (parsed.kind === 'jid') {
      const opened = await openChatByJidInMain(parsed.jid, Cmd, WidFactory, FindChat);
      if (opened && opened.ok) return opened;
      // lid 打不开时，再试同数字的 @c.us
      if (parsed.server === 'lid') {
        const pnOpened = await openChatByJidInMain(parsed.user + '@c.us', Cmd, WidFactory, FindChat);
        if (pnOpened && pnOpened.ok) return pnOpened;
      }
      const byTitleJid = openChatByTitleInMain(raw, Cmd);
      if (byTitleJid && byTitleJid.ok) return byTitleJid;
      return opened || { ok: false, error: 'chat_not_found', kind: 'jid' };
    }

    // 1) @账号
    if (parsed.kind === 'username' && WidFactory && FindChat) {
      const username = parsed.username;
      if (QueryExists && typeof QueryExists.queryUsernameExists === 'function') {
        let exists = null;
        try {
          exists = await QueryExists.queryUsernameExists(username);
        } catch (_) {
          exists = null;
        }
        if (exists && exists.wid) {
          const opened = await openChatFromExistsResult(WidFactory, FindChat, Cmd, exists, {
            username,
            kind: 'username'
          });
          if (opened && opened.ok) return opened;
        }
      }
      // 可能是普通显示名被误判为 username，继续走标题匹配
      const byTitleUser = openChatByTitleInMain(raw, Cmd);
      if (byTitleUser && byTitleUser.ok) return byTitleUser;
      return { ok: false, error: 'chat_not_found', username, kind: 'username' };
    }

    // 2) 手机号
    if (parsed.kind === 'phone' && WidFactory && FindChat) {
      const digits = parsed.digits;
      let chat = null;
      const pnWid = WidFactory.createWid(digits + '@c.us');

      try {
        chat = await FindChat.findExistingChat(pnWid, 'newChat');
      } catch (_) {}

      if (!chat && QueryExists && typeof QueryExists.queryPhoneExists === 'function') {
        let exists = null;
        try {
          exists = await QueryExists.queryPhoneExists(digits);
        } catch (_) {}
        if (exists && exists.wid) {
          const opened = await openChatFromExistsResult(WidFactory, FindChat, Cmd, exists, {
            digits,
            kind: 'phone'
          });
          if (opened && opened.ok) return opened;
        }
      }

      if (!chat) {
        try {
          chat = await FindChat.findOrCreateLatestChat(pnWid, 'newChat');
        } catch (_) {
          chat = null;
        }
      }

      if (chat) {
        try {
          Cmd.openChatBottom({ chat, chatEntryPoint: 'newChat' });
          return {
            ok: true,
            digits,
            kind: 'phone',
            chatId: chat.id ? String(chat.id) : '',
            name: (chat.formattedTitle || chat.name || '').trim()
          };
        } catch (e) {
          return {
            ok: false,
            error: String(e && e.message ? e.message : e),
            digits,
            kind: 'phone',
            code: 'open_failed'
          };
        }
      }

      // 号码路径失败时，再按标题/号码片段匹配已有会话
      const byTitlePhone = openChatByTitleInMain(raw, Cmd);
      if (byTitlePhone && byTitlePhone.ok) return byTitlePhone;
      return { ok: false, error: 'chat_not_found', digits, kind: 'phone', code: 'not_on_whatsapp' };
    }

    // 3) 联系人显示名 / 其它文本：在已有 Chat 集合中匹配
    const byTitle = openChatByTitleInMain(raw, Cmd);
    if (byTitle && byTitle.ok) return byTitle;
    return { ok: false, error: raw ? 'chat_not_found' : 'empty_query', kind: 'title' };
  }

  function tauriInvoke(cmd, args) {
    try {
      const inv =
        (window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke) ||
        (window.__TAURI_INTERNALS__ && window.__TAURI_INTERNALS__.invoke);
      if (typeof inv === 'function') return inv(cmd, args);
    } catch (_) {}
    return Promise.resolve();
  }

  function replyToDesktop(reqId, ok, data, error) {
    return tauriInvoke('contacts_backup_reply', {
      reqId: String(reqId || ''),
      ok: !!ok,
      data: data === undefined ? null : data,
      error: error || null
    }).catch(function () {});
  }

  function progressToDesktop(reqId, current, total, message) {
    return tauriInvoke('contacts_backup_progress', {
      reqId: String(reqId || ''),
      current: Number(current) || 0,
      total: Number(total) || 0,
      message: String(message || '')
    }).catch(function () {});
  }

  /**
   * Desktop Settings RPC: eval'd from Rust into each account webview.
   * Uses the same WAContactExport cmd/result channel as the browser extension.
   */
  function contactExportRpc(reqId, action, payload) {
    const id = String(reqId || '');
    const act = String(action || '');
    const body = payload && typeof payload === 'object' ? payload : {};

    if (!id || !act) {
      replyToDesktop(id || 'missing', false, null, 'bad_args');
      return;
    }

    // Page-local storage (per-account profile) — no Store required.
    if (act === 'PAGE_DATA_GET') {
      const keys = Array.isArray(body.keys) ? body.keys : [];
      const out = {};
      for (let i = 0; i < keys.length; i++) {
        const k = String(keys[i] || '');
        if (!k) continue;
        try {
          out[k] = localStorage.getItem(k);
        } catch (_) {
          out[k] = null;
        }
      }
      replyToDesktop(id, true, { values: out });
      return;
    }

    if (act === 'PAGE_DATA_SET') {
      const values = body.values && typeof body.values === 'object' ? body.values : {};
      const written = [];
      Object.keys(values).forEach((k) => {
        try {
          const v = values[k];
          if (v == null) localStorage.removeItem(k);
          else localStorage.setItem(k, String(v));
          written.push(k);
        } catch (_) {}
      });
      replyToDesktop(id, true, { written });
      return;
    }

    const ms =
      act === 'PING' || act.indexOf('PAGE_DATA') === 0
        ? 12000
        : act === 'GET_META'
          ? 180000
          : act === 'STOP_COLLECT'
            ? 8000
            : 600000;

    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      replyToDesktop(id, false, null, 'timeout');
    }, ms);

    function cleanup() {
      try {
        window.removeEventListener('message', onMsg);
      } catch (_) {}
      try {
        document.removeEventListener(EVENT_RESULT, onDoc);
      } catch (_) {}
      try {
        document.removeEventListener(EVENT_PROGRESS, onProg);
      } catch (_) {}
    }

    function finish(ok, data, error) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      cleanup();
      replyToDesktop(id, ok, data, error);
    }

    function onMsg(event) {
      try {
        if (event.source !== window) return;
        const data = event.data;
        if (!data || data.source !== BRIDGE_SOURCE || data.dir !== 'p2c') return;
        if (String(data.type) === EVENT_PROGRESS) {
          const detail = data.payload;
          if (!detail || String(detail.reqId) !== id) return;
          progressToDesktop(id, detail.current, detail.total, detail.message);
          return;
        }
        if (String(data.type) !== EVENT_RESULT) return;
        const detail = data.payload;
        if (!detail || String(detail.reqId) !== id) return;
        finish(!!detail.ok, detail.data, detail.error || null);
      } catch (_) {}
    }

    function onDoc(ev) {
      const detail = ev && ev.detail;
      if (!detail || String(detail.reqId) !== id) return;
      finish(!!detail.ok, detail.data, detail.error || null);
    }

    function onProg(ev) {
      const detail = ev && ev.detail;
      if (!detail || String(detail.reqId) !== id) return;
      progressToDesktop(id, detail.current, detail.total, detail.message);
    }

    window.addEventListener('message', onMsg);
    document.addEventListener(EVENT_RESULT, onDoc);
    document.addEventListener(EVENT_PROGRESS, onProg);

    try {
      window.postMessage(
        {
          source: BRIDGE_SOURCE,
          dir: 'c2p',
          type: EVENT_CMD,
          requestId: id,
          payload: { reqId: id, action: act, payload: body }
        },
        '*'
      );
    } catch (e) {
      finish(false, null, (e && e.message) || String(e));
    }
  }

  // 自检：暴露调试钩子
  try {
    window.__faloStorePhone = {
      isReady: isStoreReady,
      discoverStore,
      getActiveChat,
      getActiveContactNote: getActiveContactNotePayload,
      getActiveContactPhone: getActiveContactPhonePayload,
      resolveIdentityByTitle: resolveIdentityByTitleInMain,
      getNoteCapability: getNoteCapabilityPayload,
      setActiveContactNote,
      buildNotesLookup,
      buildPhoneLookup
    };
    window.__faloOpenChatByQuery = openChatByQueryInMain;
    window.__faloOpenChatByPhoneStore = function (phone) {
      return openChatByQueryInMain(phone);
    };
    // Falo extension parity: followup-todos / NumberTextInput use __waext.*
    try {
      const waext = window.__waext || (window.__waext = {});
      waext.openChatByQueryMain = openChatByQueryInMain;
      waext.openChatByPhoneMain = openChatByQueryInMain;
      window.__waextOpenChatByQueryMain = openChatByQueryInMain;
      window.__waextOpenChatByPhoneMain = openChatByQueryInMain;
    } catch (_) {}
    window.__faloContactExportRpc = contactExportRpc;
  } catch (_) {}

  // Aggressive warm-up: WhatsApp webpack modules appear after login/hydration.
  // Poll discover so name→phone lookup is ready as soon as Store exists.
  (function warmStoreDiscover() {
    let n = 0;
    const tick = () => {
      try {
        if (isStoreReady()) return;
        discoverStore(true);
      } catch (_) {}
      n += 1;
      if (n < 240) setTimeout(tick, n < 40 ? 50 : 150);
    };
    setTimeout(tick, 30);
  })();
})();