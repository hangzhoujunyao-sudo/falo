# 飞译桌面后端

Tauri 2 命令位于 `src/`，独立 HTTP 服务位于仓库 `server/`。

命令通过原始 `tauri::ipc::Request` 读取前端顶层参数，并补齐 camelCase 到 snake_case 别名，避免前端未传 `payload` 包装导致丢参。部分历史参数另做显式别名适配。

服务默认地址为 `http://127.0.0.1:8787/`。启动时 `FALO_API_BASE` 优先于保存地址；登录请求中的显式地址可切换当前服务。远程地址需要 HTTPS。登录令牌仅保存在 Rust 内存，不写入设置文件、不返回页面，也不发送给绝对地址的第三方接口；HTTP 重定向禁用。

`membership.rs` 和 `membership_extra.rs` 对接服务端会员接口，`session.rs` 保存服务地址与本机设备标识。切换服务、登录或退出时清空短语和待办的进程内缓存。当前缓存不提供跨重启的离线保存。

构建和启动步骤见仓库根 README；服务部署与接口限制见 `server/README.md`。
