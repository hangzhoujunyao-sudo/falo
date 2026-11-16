use crate::api::AppState;
use serde::Serialize;
use serde_json::{json, Value};
use std::sync::Mutex;

static PHRASES_CACHE: Mutex<(u64, Vec<Phrase>)> = Mutex::new((0, Vec::new()));
static TODOS_CACHE: Mutex<(u64, Vec<FollowupTodo>)> = Mutex::new((0, Vec::new()));

pub fn clear_session_cache() {
    if let Ok(mut cache) = PHRASES_CACHE.lock() {
        cache.1.clear();
    }
    if let Ok(mut cache) = TODOS_CACHE.lock() {
        cache.1.clear();
    }
}

#[derive(Clone, Debug, Serialize)]
pub struct Phrase {
    pub id: String,
    pub text: String,
    pub lang: String,
    pub tags: Vec<String>,
}

#[derive(Clone, Debug, Serialize)]
pub struct FollowupTodo {
    pub id: String,
    pub text: String,
    pub due: String,
    pub done: bool,
}

fn parse_phrase(payload: &Value) -> Result<Phrase, String> {
    if !payload.is_object() {
        return Err("upstream: phrase must be an object".into());
    }

    let tags = match payload.get("tags") {
        None | Some(Value::Null) => Vec::new(),
        Some(Value::Array(values)) => values
            .iter()
            .map(|value| {
                value
                    .as_str()
                    .map(str::to_owned)
                    .ok_or_else(|| "upstream: phrase tags must contain strings".to_string())
            })
            .collect::<Result<Vec<_>, String>>()?,
        Some(_) => return Err("upstream: phrase tags must be an array".into()),
    };

    Ok(Phrase {
        id: payload
            .get("id")
            .and_then(|v| v.as_str())
            .map_or_else(String::new, str::to_owned),
        text: payload
            .get("text")
            .and_then(|v| v.as_str())
            .map_or_else(String::new, str::to_owned),
        lang: payload
            .get("lang")
            .and_then(|v| v.as_str())
            .map_or_else(|| "auto".to_string(), str::to_owned),
        tags,
    })
}

fn parse_todo(payload: &Value) -> Result<FollowupTodo, String> {
    if !payload.is_object() {
        return Err("upstream: todo must be an object".into());
    }

    Ok(FollowupTodo {
        id: payload
            .get("id")
            .and_then(|v| v.as_str())
            .map_or_else(String::new, str::to_owned),
        text: payload
            .get("text")
            .and_then(|v| v.as_str())
            .map_or_else(String::new, str::to_owned),
        due: payload
            .get("due")
            .and_then(|v| v.as_str())
            .map_or_else(String::new, str::to_owned),
        done: payload
            .get("done")
            .and_then(|v| v.as_bool())
            .map_or(false, |v| v),
    })
}

fn parse_items<T>(
    payload: &Value,
    key: &str,
    parse: fn(&Value) -> Result<T, String>,
) -> Result<Vec<T>, String> {
    let values = if let Some(values) = payload.as_array() {
        values
    } else if let Some(values) = payload.get(key).and_then(|v| v.as_array()) {
        values
    } else if let Some(values) = payload.get("data").and_then(|v| v.as_array()) {
        values
    } else {
        return Err(format!("upstream: expected an array or a {key} array"));
    };

    values.iter().map(parse).collect()
}

fn read_cache<T: Clone>(cache: &Mutex<(u64, Vec<T>)>, generation: u64) -> Result<Vec<T>, String> {
    let guard = cache.lock().map_err(|e| e.to_string())?;
    Ok(if guard.0 == generation {
        guard.1.clone()
    } else {
        Vec::new()
    })
}

fn write_cache<T>(
    cache: &Mutex<(u64, Vec<T>)>,
    generation: u64,
    items: Vec<T>,
) -> Result<(), String> {
    let mut guard = cache.lock().map_err(|e| e.to_string())?;
    if generation >= guard.0 {
        *guard = (generation, items);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn cache_is_scoped_to_login_generation() {
        let cache = Mutex::new((0, Vec::<String>::new()));
        write_cache(&cache, 1, vec!["account-one".into()]).unwrap();
        assert!(read_cache(&cache, 2).unwrap().is_empty());
        write_cache(&cache, 2, vec!["account-two".into()]).unwrap();
        write_cache(&cache, 1, vec!["late-account-one".into()]).unwrap();
        assert_eq!(read_cache(&cache, 2).unwrap(), vec!["account-two"]);
    }
}

/// 对接前端“同步常用短语”：拉取远端短语，网络失败时返回进程内离线缓存。
#[tauri::command]
pub async fn common_phrases_pull(
    state: tauri::State<'_, AppState>,
    request: tauri::ipc::Request<'_>,
) -> Result<serde_json::Value, String> {
    let payload = crate::api::invoke_args(&request);
    let generation = state.api.session_generation();
    let _ = payload;

    match state.api.get_json("/v1/phrases").await {
        Ok(response) => {
            let phrases = parse_items(&response, "phrases", parse_phrase)?;
            write_cache(&PHRASES_CACHE, generation, phrases.clone())?;

            Ok(json!({
                "phrases": phrases,
                "cached": false,
                "synced": true
            }))
        }
        Err(error) => {
            let phrases = read_cache(&PHRASES_CACHE, generation)?;

            Ok(json!({
                "phrases": phrases,
                "cached": true,
                "synced": false,
                "error": error.to_string()
            }))
        }
    }
}

/// 对接前端“保存常用短语”：缓存 payload.phrases 并提交远端，网络失败时保留离线数据。
#[tauri::command]
pub async fn common_phrases_push(
    state: tauri::State<'_, AppState>,
    request: tauri::ipc::Request<'_>,
) -> Result<serde_json::Value, String> {
    let payload = crate::api::invoke_args(&request);
    let generation = state.api.session_generation();
    let empty = json!([]);
    let input = if payload.is_array() {
        &payload
    } else {
        match payload.get("phrases") {
            Some(value) => value,
            None => &empty,
        }
    };

    let phrases = parse_items(input, "phrases", parse_phrase)?;
    write_cache(&PHRASES_CACHE, generation, phrases.clone())?;

    let body = json!({ "phrases": &phrases });

    match state.api.post_json("/v1/phrases", body).await {
        Ok(_) => Ok(json!({
            "phrases": phrases,
            "cached": false,
            "synced": true
        })),
        Err(error) => {
            let phrases = read_cache(&PHRASES_CACHE, generation)?;

            Ok(json!({
                "phrases": phrases,
                "cached": true,
                "synced": false,
                "error": error.to_string()
            }))
        }
    }
}

/// 对接前端“同步跟进待办”：拉取远端待办，网络失败时返回进程内离线缓存。
#[tauri::command]
pub async fn followup_todos_pull(
    state: tauri::State<'_, AppState>,
    request: tauri::ipc::Request<'_>,
) -> Result<serde_json::Value, String> {
    let payload = crate::api::invoke_args(&request);
    let generation = state.api.session_generation();
    let _ = payload;

    match state.api.get_json("/v1/todos").await {
        Ok(response) => {
            let todos = parse_items(&response, "todos", parse_todo)?;
            write_cache(&TODOS_CACHE, generation, todos.clone())?;

            Ok(json!({
                "todos": todos,
                "cached": false,
                "synced": true
            }))
        }
        Err(error) => {
            let todos = read_cache(&TODOS_CACHE, generation)?;

            Ok(json!({
                "todos": todos,
                "cached": true,
                "synced": false,
                "error": error.to_string()
            }))
        }
    }
}

/// 对接前端“保存跟进待办”：缓存 payload.todos 并提交远端，网络失败时保留离线数据。
#[tauri::command]
pub async fn followup_todos_push(
    state: tauri::State<'_, AppState>,
    request: tauri::ipc::Request<'_>,
) -> Result<serde_json::Value, String> {
    let payload = crate::api::invoke_args(&request);
    let generation = state.api.session_generation();
    let empty = json!([]);
    let input = if payload.is_array() {
        &payload
    } else {
        match payload.get("todos") {
            Some(value) => value,
            None => &empty,
        }
    };

    let todos = parse_items(input, "todos", parse_todo)?;
    write_cache(&TODOS_CACHE, generation, todos.clone())?;

    let body = json!({ "todos": &todos });

    match state.api.post_json("/v1/todos", body).await {
        Ok(_) => Ok(json!({
            "todos": todos,
            "cached": false,
            "synced": true
        })),
        Err(error) => {
            let todos = read_cache(&TODOS_CACHE, generation)?;

            Ok(json!({
                "todos": todos,
                "cached": true,
                "synced": false,
                "error": error.to_string()
            }))
        }
    }
}
