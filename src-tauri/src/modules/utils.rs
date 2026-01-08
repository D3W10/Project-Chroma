use chrono::{DateTime, Utc};
use libheif_rs::{ColorSpace, HeifContext, LibHeif, RgbChroma};
use log;
use rusqlite::Row;
use serde::{Deserialize, Serialize};
use std::fmt::Display;

#[derive(Debug, Serialize, Deserialize)]
pub struct Item {
    pub id: String,
    pub original_name: String,
    pub file_ext: String,
    pub file_type: String,
    pub file_size: u64,
    pub width: u32,
    pub height: u32,
    pub checksum: String,
    pub is_favorite: bool,
    pub is_screenshot: bool,
    pub is_screen_recording: bool,
    pub live_video: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Album {
    pub id: String,
    pub name: String,
    pub description: String,
    pub parent: Option<String>,
    pub selected_cover: u8,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub cover_photo: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AlbumItem {
    pub album_id: String,
    pub item_id: String,
    pub added_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ImportItem {
    pub source_path: String,
    pub live_video_path: Option<String>,
}

#[derive(Serialize)]
pub struct ImportCandidate {
    pub items_to_import: Vec<ImportItem>,
    pub conflicts: Vec<Conflict>,
}

#[derive(Serialize)]
pub struct Conflict {
    pub photo_path: String,
    pub video_candidates: Vec<String>,
}

pub fn treat<E: Display>(e: E, msg: &str) -> String {
    log::error!("{}: {}", msg, e);
    msg.to_string()
}

pub fn treat_msg(msg: &str) -> String {
    msg.to_string()
}

pub fn map_extension_to_mime(ext: &str) -> &'static str {
    match ext.to_lowercase().as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "heic" | "heif" => "image/heic",
        "mp4" => "video/mp4",
        "mov" => "video/quicktime",
        "avi" => "video/x-msvideo",
        _ => "application/octet-stream",
    }
}

fn unable_to_load_image<E: std::fmt::Display>(e: E) -> String {
    treat(e, "Unable to load image")
}

pub fn load_image(data: &Vec<u8>, ext: &str) -> Result<image::DynamicImage, String> {
    match ext.to_lowercase().as_str() {
        "jpg" | "jpeg" | "png" | "webp" | "gif" => {
            image::load_from_memory(data).map_err(unable_to_load_image)
        }
        "heic" | "heif" => {
            let lib_heif = LibHeif::new();
            let ctx = HeifContext::read_from_bytes(data).map_err(unable_to_load_image)?;
            let handle = ctx.primary_image_handle().map_err(unable_to_load_image)?;
            let image = lib_heif.decode(&handle, ColorSpace::Rgb(RgbChroma::Rgb), None).map_err(unable_to_load_image)?;
            let width = image.width();
            let height = image.height();

            let plane = image.planes().interleaved.ok_or_else(|| treat_msg("Unable to load image"))?;
            let data = plane.data.to_vec();

            image::RgbImage::from_raw(width, height, data)
                .map(image::DynamicImage::ImageRgb8)
                .ok_or_else(|| treat_msg("Unable to load image"))
        }
        _ => Err("File type not supported".to_string())
    }
}

pub fn deserialize_item(row: &Row<'_>) -> Result<Item, rusqlite::Error> {
    Ok(Item {
        id: row.get(0)?,
        original_name: row.get(1)?,
        file_ext: row.get(2)?,
        file_type: row.get(3)?,
        file_size: row.get(4)?,
        width: row.get(5)?,
        height: row.get(6)?,
        checksum: row.get(7)?,
        is_favorite: row.get::<_, i32>(8)? != 0,
        is_screenshot: row.get::<_, i32>(9)? != 0,
        is_screen_recording: row.get::<_, i32>(10)? != 0,
        live_video: row.get::<_, Option<String>>(11)?,
        created_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(12)?).unwrap().with_timezone(&Utc),
    })
}

pub fn deserialize_album(row: &Row<'_>) -> Result<Album, rusqlite::Error> {
    Ok(Album {
        id: row.get(0)?,
        name: row.get(1)?,
        description: row.get(2)?,
        parent: row.get(3)?,
        selected_cover: row.get(4)?,
        icon: row.get(5)?,
        color: row.get(6)?,
        cover_photo: row.get(7)?,
        created_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(8)?).unwrap().with_timezone(&Utc),
    })
}