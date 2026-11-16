use serde::{Deserialize, Serialize};
use std::{fs, path::PathBuf};

#[derive(Default, Serialize, Deserialize)]
pub struct Session {
    pub api_base: String,
    pub device_id: String,
}

fn path() -> Result<PathBuf, String> {
    Ok(
        PathBuf::from(std::env::var_os("APPDATA").ok_or("APPDATA unavailable")?)
            .join("Falo")
            .join("service.json"),
    )
}

pub fn load() -> Session {
    path()
        .ok()
        .and_then(|p| fs::read(p).ok())
        .and_then(|b| serde_json::from_slice(&b).ok())
        .unwrap_or_default()
}

pub fn save(session: &Session) -> Result<(), String> {
    let path = path()?;
    let directory = path.parent().ok_or("invalid session path")?;
    fs::create_dir_all(directory).map_err(|e| e.to_string())?;
    let mut temp = tempfile::NamedTempFile::new_in(directory).map_err(|e| e.to_string())?;
    use std::io::Write;
    temp.write_all(&serde_json::to_vec(session).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())?;
    temp.persist(path).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn device_id() -> Result<String, String> {
    let mut session = load();
    if session.device_id.is_empty() {
        session.device_id = format!(
            "desktop-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map_err(|e| e.to_string())?
                .as_nanos()
        );
        save(&session)?;
    }
    Ok(session.device_id)
}
