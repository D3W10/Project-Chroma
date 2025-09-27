use chrono::{DateTime, Utc};
use libheif_rs::{ColorSpace, HeifContext, LibHeif, RgbChroma};
use log;
use serde::{Deserialize, Serialize};
use std::fmt::Display;

use crate::modules::utils;

#[derive(Debug, Serialize, Deserialize)]
pub struct Photo {
    pub id: String,
    pub original_name: String,
    pub file_type: String,
    pub file_size: u64,
    pub width: u32,
    pub height: u32,
    pub checksum: String,
    pub is_favorite: bool,
    pub is_screenshot: bool,
    pub is_screen_recording: bool,
    pub created_at: DateTime<Utc>,
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
    utils::treat(e, "Unable to load image")
}

pub fn load_image(data: &Vec<u8>, ext: &str) -> Result<image::DynamicImage, String> {
    match ext.to_lowercase().as_str() {
        "jpg" | "jpeg" | "png" | "gif" | "webp" => {
            image::load_from_memory(data).map_err(unable_to_load_image)
        }
        "heic" | "heif" => {
            let lib_heif = LibHeif::new();
            let ctx = HeifContext::read_from_bytes(data).map_err(unable_to_load_image)?;
            let handle = ctx.primary_image_handle().map_err(unable_to_load_image)?;
            let image = lib_heif.decode(&handle, ColorSpace::Rgb(RgbChroma::Rgb), None).map_err(unable_to_load_image)?;
            let width = image.width();
            let height = image.height();

            let plane = image.planes().interleaved.ok_or_else(|| utils::treat_msg("Unable to load image"))?;
            let data = plane.data.to_vec();

            image::RgbImage::from_raw(width, height, data)
                .map(image::DynamicImage::ImageRgb8)
                .ok_or_else(|| utils::treat_msg("Unable to load image"))
        }
        _ => Err("File type not supported".to_string()),
    }
}