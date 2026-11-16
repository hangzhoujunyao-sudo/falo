# 飞译（Falo）

Windows 桌面 WhatsApp 多账号与翻译工作台，使用 Tauri 2、Rust 和 WebView2。界面统一使用“飞译”；内部 `FALO_*` 环境变量和已有数据目录保持兼容。

## 启动后端

安装 Python 3.11 或以上，在仓库根目录执行：

```powershell
python server/app.py create-user your-email@example.com --seats 3
python server/app.py serve
```

客户端默认连接 `http://127.0.0.1:8787/`。在会员页使用创建的邮箱与密码登录。服务器部署、数据库备份和接口范围见 [服务说明](server/README.md)。

## 桌面端构建

需要 Rust、Windows C/C++ 工具链和 WebView2。GNU 工具链需将 WinLibs 的 `mingw64/bin` 加入 PATH。中文路径下建议使用英文构建输出目录，避免 dlltool 编码问题：

```powershell
$env:CARGO_TARGET_DIR = "$env:LOCALAPPDATA/FaloBuild/target"
cargo +stable-x86_64-pc-windows-gnu check --manifest-path backend/Cargo.toml
cargo +stable-x86_64-pc-windows-gnu build --manifest-path backend/Cargo.toml
```

构建后运行输出目录中的 `debug/falo-oss.exe`。也可使用已配置的 MSVC 工具链。翻译供应商凭据与联网条件仍需单独配置。

## 验证与范围

```powershell
python -m unittest discover -s server -v
python tools/diff_commands.py
```

基础服务支持账号登录、会话退出、设备列表、席位限制、常用短语和待办同步。邮件注册、支付、登录挑战、联系人分步备份、代理检测及服务端翻译测试尚未接入。详细限制见服务说明。命令名称对齐不代表所有界面流程已通过端到端测试。

## 许可

见 [LICENSE](LICENSE)。保留现有源码中的第三方作者署名与许可信息。
