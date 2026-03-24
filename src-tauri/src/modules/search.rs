use once_cell::sync::Lazy;
use open_clip_inference::Clip;
use std::collections::HashSet;
use std::path::Path;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, async_runtime::{spawn, spawn_blocking}};

use crate::modules;
use crate::modules::config;
use crate::modules::db;
use crate::modules::library::{get_db_connection, get_library_root_path};
use crate::modules::utils;

const SEARCH_MODEL_ID: &str = "RuteNL/MobileCLIP2-S3-OpenCLIP-ONNX";
const SEARCH_DEFAULT_LIMIT: usize = 300;
const SEARCH_DEFAULT_MIN_SCORE: f32 = 0.18;
const SEARCH_INDEX_BATCH_SIZE: usize = 32;

static SEARCH_INDEX_RUNNING: Lazy<Mutex<HashSet<String>>> = Lazy::new(|| Mutex::new(HashSet::new()));
static SEARCH_MODEL_CACHE: Lazy<Mutex<Option<Arc<Clip>>>> = Lazy::new(|| Mutex::new(None));

pub fn is_search_enabled(app: &AppHandle) -> bool {
    config::get_settings(app.clone()).map_err(|_| false).unwrap()
        .get("searchEnabled")
        .and_then(|v| v.as_bool())
        .unwrap_or(false)
}

fn is_search_index_running(library_id: &str) -> bool {
    SEARCH_INDEX_RUNNING.lock()
        .map(|running| running.contains(library_id))
        .unwrap_or(false)
}

fn mark_search_index_running(library_id: &str) -> Result<bool, String> {
    let mut running = SEARCH_INDEX_RUNNING.lock().map_err(|e| utils::treat(e, "Unable to lock search index state"))?;
    if running.contains(library_id) {
        return Ok(false);
    }

    running.insert(library_id.to_string());
    Ok(true)
}

fn clear_search_index_running(library_id: &str) {
    if let Ok(mut running) = SEARCH_INDEX_RUNNING.lock() {
        running.remove(library_id);
    }
}

async fn get_or_load_search_model() -> Result<Arc<Clip>, String> {
    if let Some(model) = SEARCH_MODEL_CACHE.lock().map_err(|e| utils::treat(e, "Unable to lock search model cache"))?.as_ref() {
        return Ok(model.clone());
    }

    let model = Arc::new(
        Clip::from_hf(SEARCH_MODEL_ID)
            .build()
            .await
            .map_err(|e| utils::treat(e, "Unable to download or load search model"))?,
    );

    let mut cache = SEARCH_MODEL_CACHE.lock().map_err(|e| utils::treat(e, "Unable to lock search model cache"))?;
    if let Some(cached) = cache.as_ref() {
        return Ok(cached.clone());
    }

    *cache = Some(model.clone());
    Ok(model)
}

pub fn spawn_item_search_indexer(app: AppHandle, library_id: String) -> Result<(), String> {
    let should_start = mark_search_index_running(&library_id).map_err(|e| utils::treat(e, "Unable to start search indexer"))?;
    if should_start {
        spawn(async move {
            let clip = match get_or_load_search_model().await {
                Ok(model) => model,
                Err(err) => {
                    log::error!("Unable to initialize search model: {}", err);
                    clear_search_index_running(&library_id);
                    return;
                }
            };
    
            let app_clone = app.clone();
            let library_clone = library_id.clone();
            let task_result = spawn_blocking(move || run_item_search_indexer(&app_clone, &library_clone, &clip))
                .await
                .map_err(|e| utils::treat(e, "Search indexer task failed"));
    
            match task_result {
                Ok(inner) => {
                    if let Err(err) = inner {
                        log::error!("Search indexing failed: {}", err);
                    }
                }
                Err(err) => log::error!("Search indexing failed: {}", err),
            }
    
            clear_search_index_running(&library_id);
        });
    }

    return Ok(());
}

fn serialize_embedding(values: &[f32]) -> Vec<u8> {
    let mut bytes = Vec::with_capacity(values.len() * 4);
    for value in values {
        bytes.extend_from_slice(&value.to_le_bytes());
    }
    bytes
}

fn deserialize_embedding(bytes: &[u8], dim: usize) -> Option<Vec<f32>> {
    if dim == 0 || bytes.len() != dim * 4 {
        return None;
    }

    let mut values = Vec::with_capacity(dim);
    for chunk in bytes.chunks_exact(4) {
        values.push(f32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]));
    }

    Some(values)
}

fn score_embedding(query: &[f32], embedding: &[f32]) -> Option<f32> {
    if query.len() != embedding.len() || query.is_empty() {
        return None;
    }

    let mut score = 0.0;
    for (lhs, rhs) in query.iter().zip(embedding.iter()) {
        score += lhs * rhs;
    }

    Some(score)
}

fn run_item_search_indexer(app: &AppHandle, library_id: &str, clip: &Clip) -> Result<(), String> {
    let library_root = get_library_root_path(app, library_id)?;

    let index_item_thumbnail = |clip: &Clip, thumb_path: &Path| -> Result<Vec<f32>, String> {
        let image = image::open(thumb_path)
            .map_err(|e| utils::treat(e, "Unable to load thumbnail for search indexing"))?;
        let embedding = clip.vision
            .embed_image(&image)
            .map_err(|e| utils::treat(e, "Unable to index item thumbnail"))?;
        Ok(embedding.to_vec())
    };

    loop {
        let conn = get_db_connection(app, library_id)?;
        if !is_search_enabled(app) {
            return Ok(());
        }

        let item_ids = db::fetch_pending_item_ids(&conn, SEARCH_INDEX_BATCH_SIZE)?;
        if item_ids.is_empty() {
            break;
        }

        drop(conn);

        for item_id in item_ids {
            let thumb_path = library_root
                .join("thumbnails")
                .join(format!("{}.webp", item_id));
            let conn = get_db_connection(app, library_id)?;

            match index_item_thumbnail(clip, &thumb_path) {
                Ok(embedding) => {
                    let serialized = serialize_embedding(&embedding);
                    db::upsert_item_search_embedding(
                        &conn,
                        &item_id,
                        &serialized,
                        embedding.len(),
                    )?;
                }
                Err(err) => {
                    db::upsert_item_search_failure(&conn, &item_id, &err)?;
                }
            }
        }
    }

    Ok(())
}

fn build_item_search_status(app: &AppHandle, library_id: &str) -> Result<modules::ItemSearchStatus, String> {
    let conn = get_db_connection(app, library_id)?;
    let total_items = db::count_items(&conn)?;
    let indexed_items = db::count_indexed_items(&conn)?;
    let failed_items = db::count_failed_items(&conn)?;
    let pending_items = total_items
        .saturating_sub(indexed_items)
        .saturating_sub(failed_items);

    Ok(modules::ItemSearchStatus {
        total_items,
        indexed_items,
        failed_items,
        pending_items,
        indexing: is_search_index_running(library_id),
    })
}

#[tauri::command]
pub fn get_item_search_status(app: AppHandle, library_id: String) -> Result<modules::ItemSearchStatus, String> {
    build_item_search_status(&app, &library_id)
}

#[tauri::command]
pub async fn enable_item_search(app: AppHandle, library_id: String) -> Result<modules::ItemSearchStatus, String> {
    get_or_load_search_model().await?;
    spawn_item_search_indexer(app.clone(), library_id.clone())?;
    build_item_search_status(&app, &library_id)
}

#[tauri::command]
pub async fn search_items(app: AppHandle, library_id: String, query: String, limit: Option<u32>, min_score: Option<f32>) -> Result<Vec<modules::ItemSearchMatch>, String> {
    let search_query = query.trim().to_string();
    if search_query.is_empty() {
        return Ok(vec![]);
    }

    let conn = get_db_connection(&app, &library_id)?;
    if !is_search_enabled(&app) {
        return Err("search_disabled".to_string());
    }

    let embeddings = db::fetch_item_search_embeddings(&conn)?;
    if embeddings.is_empty() {
        return Ok(vec![]);
    }

    let limit = limit.map_or(SEARCH_DEFAULT_LIMIT, |value| value as usize);
    let min_score = min_score.unwrap_or(SEARCH_DEFAULT_MIN_SCORE);
    let clip = get_or_load_search_model().await?;

    let results = spawn_blocking(move || -> Result<Vec<modules::ItemSearchMatch>, String> {
        let query_embedding = clip.text
            .embed_text(&search_query)
            .map_err(|e| utils::treat(e, "Unable to encode search query"))?
            .to_vec();

        let mut matches = Vec::new();
        for row in embeddings {
            let Some(embedding) = deserialize_embedding(&row.embedding, row.embedding_dim) else {
                continue;
            };

            let Some(score) = score_embedding(&query_embedding, &embedding) else {
                continue;
            };

            if score < min_score {
                continue;
            }

            matches.push(modules::ItemSearchMatch {
                item_id: row.item_id,
                score,
            });
        }

        matches.sort_by(|a, b| {
            b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal)
        });
        matches.truncate(limit);
        Ok(matches)
    })
    .await
    .map_err(|e| utils::treat(e, "Unable to execute search"))??;

    Ok(results)
}