fn main() {
    // 前端资源变化时强制 tauri-build 重新嵌入（否则只会改 Rust 侧）
    println!("cargo:rerun-if-changed=../frontend");
    println!("cargo:rerun-if-changed=tauri.conf.json");
    tauri_build::build()
}
