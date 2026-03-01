use chrono::{DateTime, Utc};
use image::{DynamicImage, ImageFormat};
use libheif_rs::{ColorSpace, HeifContext, LibHeif, RgbChroma};
use log;
use rusqlite::Row;
use std::fmt::Display;
use std::fs;
use std::path::Path;
use tauri::AppHandle;
use tauri_plugin_shell::ShellExt;

use crate::modules;

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

pub fn deserialize_item(row: &Row<'_>) -> Result<modules::Item, rusqlite::Error> {
    Ok(modules::Item {
        id: row.get("id")?,
        original_name: row.get("original_name")?,
        file_ext: row.get("file_ext")?,
        file_type: row.get("file_type")?,
        file_size: row.get("file_size")?,
        width: row.get("width")?,
        height: row.get("height")?,
        duration: row.get("duration")?,
        checksum: row.get("checksum")?,
        taken_date: DateTime::parse_from_rfc3339(&row.get::<_, String>("taken_date")?).map(|d| d.with_timezone(&Utc)).unwrap_or(Utc::now()),
        is_favorite: row.get::<_, i32>("is_favorite")? != 0,
        is_screenshot: row.get::<_, i32>("is_screenshot")? != 0,
        is_screen_recording: row.get::<_, i32>("is_screen_recording")? != 0,
        live_video: row.get::<_, Option<String>>("live_video")?,
        raw_original_name: row.get::<_, Option<String>>("raw_original_name")?,
        raw_file_size: row.get::<_, Option<u64>>("raw_file_size")?,
        raw_checksum: row.get::<_, Option<String>>("raw_checksum")?,
        raw_live_video: row.get::<_, Option<String>>("raw_live_video")?,
        has_adjustments: row.get::<_, i32>("has_adjustments")? != 0,
        created_at: DateTime::parse_from_rfc3339(&row.get::<_, String>("created_at")?).map(|d| d.with_timezone(&Utc)).unwrap_or(Utc::now()),
    })
}

pub fn deserialize_item_album_ref(row: &Row<'_>) -> Result<modules::ItemAlbumRef, rusqlite::Error> {
    Ok(modules::ItemAlbumRef {
        item: deserialize_item(row)?,
        added_at: DateTime::parse_from_rfc3339(&row.get::<_, String>("added_at")?).unwrap().with_timezone(&Utc),
    })
}

pub fn deserialize_album(row: &Row<'_>) -> Result<modules::Album, rusqlite::Error> {
    Ok(modules::Album {
        id: row.get("id")?,
        name: row.get("name")?,
        description: row.get("description")?,
        parent: row.get("parent")?,
        selected_cover: row.get("selected_cover")?,
        selected_banner: row.get("selected_banner")?,
        icon: row.get("icon")?,
        color: row.get("color")?,
        cover_photo: row.get("cover_photo")?,
        banner_photo: row.get("banner_photo")?,
        created_at: DateTime::parse_from_rfc3339(&row.get::<_, String>("created_at")?).unwrap().with_timezone(&Utc),
    })
}

pub fn deserialize_album_computed(row: &Row<'_>) -> Result<modules::AlbumComp, rusqlite::Error> {
    Ok(modules::AlbumComp {
        album: deserialize_album(row)?,
        size: row.get("size")?,
        peek_thumbs: serde_json::from_str(&row.get::<_, String>("peek_thumbs")?).unwrap_or(vec![]),
    })
}

pub fn deserialize_tag(row: &Row<'_>) -> Result<modules::Tag, rusqlite::Error> {
    Ok(modules::Tag {
        id: row.get("id")?,
        name: row.get("name")?,
        color: row.get("color")?,
        created_at: DateTime::parse_from_rfc3339(&row.get::<_, String>("created_at")?).unwrap().with_timezone(&Utc),
    })
}

pub fn deserialize_tag_item_ref(row: &Row<'_>) -> Result<modules::TagItemRef, rusqlite::Error> {
    Ok(modules::TagItemRef {
        tag: deserialize_tag(row)?,
        added_at: DateTime::parse_from_rfc3339(&row.get::<_, String>("added_at")?).unwrap().with_timezone(&Utc),
    })
}

pub fn generate_image_thumbnail(img: &DynamicImage, output_path: &Path) -> Result<(), String> {
    let thumb = img.thumbnail(512, 512);

    let mut out_file = fs::File::create(output_path).map_err(|e| treat(e, "Unable to generate thumbnail"))?;
    thumb.write_to(&mut out_file, ImageFormat::WebP).map_err(|e| treat(e, "Unable to write thumbnail"))?;

    Ok(())
}

pub fn generate_video_thumbnail(app: &AppHandle, input: &Path, output: &Path) -> Result<(), String> {
    let input_str = input.to_string_lossy().to_string();
    let output_str = output.to_string_lossy().to_string();

    let sidecar_command = app.shell().command("ffmpeg").args([
        "-y",
        "-i", &input_str,
        "-vf", "thumbnail,scale=512:512:force_original_aspect_ratio=decrease",
        "-frames:v", "1",
        &output_str,
    ]);

    let output = tauri::async_runtime::block_on(async move {
        sidecar_command.output().await
    }).map_err(|e| treat(e, "Failed to execute ffmpeg"))?;

    if !output.status.success() {
        return Err(format!("ffmpeg failed: {}", String::from_utf8_lossy(&output.stderr)));
    }

    Ok(())
}

pub fn get_video_metadata(app: &AppHandle, path: &Path) -> Result<(u32, u32, u64), String> {
    let path_str = path.to_string_lossy().to_string();

    let sidecar_command = app.shell().command("ffprobe").args([
        "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=width,height,duration",
        "-of", "csv=s=x:p=0",
        &path_str,
    ]);

    let output = tauri::async_runtime::block_on(async move {
        sidecar_command.output().await
    }).map_err(|e| treat(e, "Failed to execute ffprobe"))?;

    if !output.status.success() {
        return Err(format!("ffprobe failed: {}", String::from_utf8_lossy(&output.stderr)));
    }

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let parts: Vec<&str> = stdout.split('x').collect();

    if parts.len() >= 2 {
        let width = parts[0].parse::<u32>().unwrap_or(0);
        let height = parts[1].parse::<u32>().unwrap_or(0);
        let duration = if parts.len() >= 3 {
            parts[2].parse::<f64>().unwrap_or(0.0) as u64
        } else {
            0
        };
        Ok((width, height, duration))
    } else {
        Ok((0, 0, 0))
    }
}