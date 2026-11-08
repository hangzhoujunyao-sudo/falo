# 推到 GitHub

仓库已经本地提交好了（109 个文件，commit `81a7852`），只差**凭据**这一步。
远端：`https://github.com/hangzhoujunyao-sudo/falo.git`（空仓库，main 分支）

## 为什么会卡住

| 检查 | 结果 |
|---|---|
| git 版本 | 2.54.0（`E:\DMiniconda3\1.2\Git\cmd\git.exe`） |
| 全局身份 | 空（已在仓库本地设成 `hangzhoujunyao-sudo`） |
| credential helper | 无 |
| `%USERPROFILE%\.git-credentials` | 不存在 |
| SSH key | 无 |
| gh CLI | 未安装 |
| 直连 github:443 | **不通** |
| 系统代理 | `127.0.0.1:10808`（已在仓库里设 `http.proxy=http://127.0.0.1:10808`，可用） |

所以：网络已经打通，缺的是 GitHub 的写入凭据。

## 方式一：个人访问令牌（最快）

1. 打开 https://github.com/settings/tokens → 生成 **Fine-grained token**
   - Repository access：`hangzhoujunyao-sudo/falo`
   - Permissions：`Contents: Read and write`
2. 把令牌贴进下面任一方式：

```powershell
$env:GITHUB_TOKEN = "github_pat_xxx"
cd wats_oss
git remote set-url origin "https://hangzhoujunyao-sudo:$env:GITHUB_TOKEN@github.com/hangzhoujunyao-sudo/falo.git"
git push -u origin main
```

或者用仓库里的 `push.ps1`：

```powershell
cd wats_oss
.\push.ps1 -Token "github_pat_xxx"
```

推完记得把 remote 里的令牌清掉：

```powershell
git remote set-url origin https://github.com/hangzhoujunyao-sudo/falo.git
```

## 方式二：SSH 部署密钥

```powershell
ssh-keygen -t ed25519 -C "falo@local" -f $env:USERPROFILE\.ssh\id_ed25519 -N '""'
type $env:USERPROFILE\.ssh\id_ed25519.pub      # 贴到仓库 Settings → Deploy keys（勾 Allow write）
git remote set-url origin git@github.com:hangzhoujunyao-sudo/falo.git
git push -u origin main
```

> SSH 也要走代理：在 `%USERPROFILE%\.ssh\config` 里加
> `Host github.com` / `ProxyCommand connect -S 127.0.0.1:10808 %h %p`

## 方式三：手工上传

`..\wats_oss_snapshot.zip`（2.6 MB）已经打好，GitHub 网页上「Add file → Upload files」直接拖进去也行。

## 推完之后

仓库描述建议填：`WhatsApp Web 翻译插件 WATransChat 2.6.5 的开源重建（前端资源恢复 + Tauri 2 后端）`

Topics：`tauri` `rust` `whatsapp` `webextension` `reverse-engineering` `i18n` `open-source`
