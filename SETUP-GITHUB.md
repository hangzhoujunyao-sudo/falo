# 推到 GitHub

远端：`https://github.com/hangzhoujunyao-sudo/falo.git`（已建好、空仓库、public、默认分支 main）
本地：111 个文件已提交（`81a7852` + `bce684f`），工作区干净。

## 已经打通的

| 项 | 状态 |
|---|---|
| 直连 github:443 | ❌ 不通 |
| 系统代理 `127.0.0.1:10808` | ✅ 可用，已写进仓库 `http.proxy` |
| SSH over proxy | ✅ 已配 `connect.exe -S 127.0.0.1:10808`，能握手（当前 `Permission denied (publickey)` 是没加公钥，不是网络问题） |
| 本地身份 | ✅ `hangzhoujunyao-sudo <...@users.noreply.github.com>` |
| 令牌 / 凭据 | ❌ 没有 |

## 方式一：加 Deploy key（推荐，不用贴令牌）

我已经生成好密钥对：`%USERPROFILE%\.ssh\falo_ed25519`

**把下面这行贴到** 仓库 → Settings → Deploy keys → Add deploy key，**勾上 Allow write access**：

\\\
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIAuLk0q0BRxGn1YXeROX9tub6sWcf7KbpL+c87BGNhQw falo-oss@local
\\\

然后：

\\\powershell
cd wats_oss
.\push.ps1
\\\

## 方式二：个人访问令牌

Settings → Developer settings → Fine-grained token：仓库选 `falo`，权限 `Contents: Read and write`。

\\\powershell
cd wats_oss
.\push.ps1 -Token "github_pat_xxx"
\\\

## 方式三：手工上传

`..\wats_oss_snapshot.zip`（2.6 MB）已打包，网页 Upload files 拖进去即可。

## 推完建议填

- Description：`WhatsApp Web 翻译插件 WATransChat 2.6.5 的开源重建（前端资源恢复 + Tauri 2 后端）`
- Topics：`tauri` `rust` `whatsapp` `reverse-engineering` `i18n` `open-source`
