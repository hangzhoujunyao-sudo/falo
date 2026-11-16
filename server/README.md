# 飞译自托管服务

Python 3.11 以上，无第三方依赖。SQLite 保存账号、设备会话、短语与待办。当前是可运行的基础服务，尚未接入邮件注册、商业支付、登录挑战、服务端翻译和代理检测；这些接口返回明确错误。

## 本机运行

在仓库根目录执行：

```powershell
python server/app.py create-user your-email@example.com --seats 3
python server/app.py serve
```

创建账号时交互输入至少 12 位密码，不会显示输入内容。客户端默认连接 `http://127.0.0.1:8787/`，在会员页面使用创建的邮箱和密码登录。首次无需修改地址。服务启动后访问 `/health` 检查状态。

账号密码经 PBKDF2-SHA256（60 万次）加盐存储；会话令牌 30 天过期，数据库只存令牌摘要。客户端仅在内存保存令牌，关闭应用后重新登录。同一设备重新登录会替换旧会话。设备标识与服务地址保存在 `%APPDATA%/Falo/service.json`，不保存密码。席位满时在已登录设备退出，或管理员执行：

```powershell
python server/app.py revoke-sessions your-email@example.com
```

默认数据库是 `server/data/falo.sqlite3`，已加入 Git 忽略。自定义路径使用 `python server/app.py --db D:/FaloData/falo.sqlite3 serve`。备份前停止服务，复制数据库；恢复时用备份替换同一路径，再启动服务。

## 服务器部署

```bash
cd server
docker compose up -d --build
docker compose exec api python app.py create-user your-email@example.com --seats 3
```

Compose 将端口绑定到服务器回环地址，并用持久卷保存数据库。通过现有 Nginx/Caddy 配置 HTTPS 域名，反向代理到 `127.0.0.1:8787`，限制请求体 1 MB、读取超时 15 秒，并配置连接数和登录速率限制。Python 内置 HTTP 服务用于本地或受控反向代理后的小规模部署，不应直接暴露公网。当前登录限流按连接 IP 计数；经过代理时会共享额度，需要配合代理规则调整。

客户端登录页填入 HTTPS 服务地址，也可设置 `FALO_API_BASE` 作为启动默认地址。远程 HTTP 地址会被拒绝。切换地址将清除当前令牌；登录页主动填写的地址在当前进程生效并保存，下次启动时环境变量仍优先。无需给客户端分发数据库。

## 验证

```powershell
python -m unittest discover -s server -v
```

测试使用临时数据库和临时端口，不写入实际账号。覆盖鉴权、登录限流、席位限制、会话替换与退出、跨账号隔离、持久化、HTTP 请求和请求体大小限制。

短语与待办采用整份列表覆盖，多个设备同时保存时最后一次写入生效。联系人备份暂未对齐页面的分步任务协议，不作为已完成能力。支付和邮件注册需要提供实际渠道与配置后再接入。此版本尚未完成桌面窗口的逐项端到端验收。
