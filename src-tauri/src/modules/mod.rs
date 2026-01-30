use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

pub mod config;
pub mod library;
pub mod utils;
pub mod migrations;

#[derive(Debug, Serialize, Deserialize)]
pub struct Item {
    pub id: String,
    pub original_name: String,
    pub file_ext: String,
    pub file_type: String,
    pub file_size: u64,
    pub width: u32,
    pub height: u32,
    pub duration: u64,
    pub checksum: String,
    pub is_favorite: bool,
    pub is_screenshot: bool,
    pub is_screen_recording: bool,
    pub live_video: Option<String>,
    pub raw_original_name: Option<String>,
    pub raw_file_size: Option<u64>,
    pub raw_checksum: Option<String>,
    pub raw_live_video: Option<String>,
    pub has_adjustments: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ItemAlbumRef {
    #[serde(flatten)]
    pub item: Item,
    pub added_at: DateTime<Utc>,
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
    pub live_path: Option<String>,
    pub original_source_path: Option<String>,
    pub original_live_path: Option<String>,
    pub adjustments_path: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ImportCandidate {
    pub items_to_import: Vec<ImportItem>,
    pub conflicts: Vec<Group>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Group {
    pub original_items: Vec<String>,
    pub edited_items: Vec<String>,
    pub original_videos: Vec<String>,
    pub edited_videos: Vec<String>,
    pub adjustments: Option<String>,
}