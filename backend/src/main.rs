//! Falo（开源重建）—— Tauri 2 后端入口
//!
//! 命令面 = 前端 `invoke()` 的实际调用（65 条）+ 二进制命令表里恢复的补充项。
//! 各模块由中转站并发生成，`tools/diff_commands.py` 做前端/后端一致性校验。

mod accounts;
mod api;
mod desktop;
mod lock;
mod membership;
mod membership_extra;
mod phrases;
mod settings_cmds;
mod translate;
use api::AppState;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .manage(AppState::new())
        .setup(|app| {
            desktop::init(app.handle().clone())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            accounts::add_account,
            accounts::close_account,
            accounts::open_account,
            accounts::remove_account,
            accounts::rename_account,
            accounts::list_accounts,
            accounts::list_account_tabs,
            accounts::list_open_account_tabs,
            accounts::open_accounts_settings,
            accounts::switch_account,
            desktop::set_unread_count,
            desktop::set_profile_name,
            desktop::open_external_url,
            desktop::notify,
            desktop::open_settings,
            desktop::cycle_account_tab,
            desktop::set_icon_as_template,
            desktop::set_temp_dir_path,
            lock::change_app_lock_password,
            lock::disable_app_lock,
            lock::get_lock_status,
            lock::lock_app,
            lock::reset_app_lock,
            lock::set_app_lock_options,
            lock::set_app_lock_password,
            lock::set_biometric_enabled,
            lock::unlock_biometric,
            lock::unlock_password,
            membership::membership_auth,
            membership::membership_list_plans,
            membership::membership_register,
            membership::membership_renew,
            membership::membership_logout_others,
            membership::membership_list_devices,
            membership::membership_set_api_base,
            membership_extra::membership_login,
            membership_extra::membership_logout,
            membership_extra::membership_status,
            membership_extra::membership_open_pay,
            membership_extra::membership_devices_by_challenge,
            membership_extra::membership_logout_device,
            membership_extra::membership_logout_device_by_challenge,
            membership_extra::membership_apply_seat_pick,
            membership_extra::seat_pick_status,
            phrases::common_phrases_pull,
            phrases::common_phrases_push,
            phrases::followup_todos_pull,
            phrases::followup_todos_push,
            settings_cmds::get_settings,
            settings_cmds::set_settings,
            settings_cmds::check_for_update,
            settings_cmds::update_close,
            settings_cmds::update_download_and_install,
            settings_cmds::update_resize,
            settings_cmds::update_snooze,
            settings_cmds::check_proxy,
            settings_cmds::get_theme,
            settings_cmds::get_always_on_top,
            settings_cmds::toggle_always_on_top,
            settings_cmds::get_productivity_status,
            settings_cmds::set_focus_mode,
            settings_cmds::set_account_notifications,
            settings_cmds::set_account_proxy,
            settings_cmds::get_account_fingerprint,
            settings_cmds::contacts_backup_call,
            settings_cmds::dlog,
            settings_cmds::test_notification,
            settings_cmds::quality_translate_test,
            translate::translate_text,
            translate::quality_translate,
            translate::translate_test,
            translate::probe_engine_latency,
            translate::fetch_inline_button_config,
            translate::fetch_fx_rates,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
