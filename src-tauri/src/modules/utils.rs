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
        id: row.get(0)?,
        original_name: row.get(1)?,
        file_ext: row.get(2)?,
        file_type: row.get(3)?,
        file_size: row.get(4)?,
        width: row.get(5)?,
        height: row.get(6)?,
        duration: row.get(7)?,
        checksum: row.get(8)?,
        is_favorite: row.get::<_, i32>(9)? != 0,
        is_screenshot: row.get::<_, i32>(10)? != 0,
        is_screen_recording: row.get::<_, i32>(11)? != 0,
        live_video: row.get::<_, Option<String>>(12)?,
        raw_original_name: row.get::<_, Option<String>>(13)?,
        raw_file_size: row.get::<_, Option<u64>>(14)?,
        raw_checksum: row.get::<_, Option<String>>(15)?,
        raw_live_video: row.get::<_, Option<String>>(16)?,
        has_adjustments: row.get::<_, i32>(17)? != 0,
        created_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(18)?).unwrap().with_timezone(&Utc),
    })
}

pub fn deserialize_item_album_ref(row: &Row<'_>) -> Result<modules::ItemAlbumRef, rusqlite::Error> {
    Ok(modules::ItemAlbumRef {
        item: deserialize_item(row)?,
        added_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(19)?).unwrap().with_timezone(&Utc),
    })
}

pub fn deserialize_album(row: &Row<'_>) -> Result<modules::Album, rusqlite::Error> {
    Ok(modules::Album {
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

pub fn generate_image_thumbnail(img: &DynamicImage, output_path: &Path) -> Result<(), String> {
    let thumb = img.thumbnail(512, 512);

    let mut out_file = fs::File::create(output_path).map_err(|e| treat(e, "Unable to generate thumbnail"))?;
    thumb.write_to(&mut out_file, ImageFormat::WebP).map_err(|e| treat(e, "Unable to write thumbnail"))?;

    Ok(())
}

pub fn generate_video_thumbnail(app: &AppHandle, input: &Path, output: &Path) -> Result<(), String> {
    let input_str = input.to_string_lossy().to_string();
    let output_str = output.to_string_lossy().to_string();

    let sidecar_command = app.shell()
        .command("ffmpeg")
        .args([
            "-y",
            "-i", &input_str,
            "-vf", "thumbnail,scale=512:512:force_original_aspect_ratio=decrease",
            "-frames:v", "1",
            &output_str
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

    let sidecar_command = app.shell()
        .command("ffprobe")
        .args([
            "-v", "error",
            "-select_streams", "v:0",
            "-show_entries", "stream=width,height,duration",
            "-of", "csv=s=x:p=0",
            &path_str
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