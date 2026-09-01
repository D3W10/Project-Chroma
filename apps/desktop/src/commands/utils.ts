import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import sharp, { type Sharp } from "sharp";
import { Errors, Result, type AppError } from "@project-chroma/utils";
import { getBinaryPath } from "../lib/binaries.ts";

export async function generateImageThumbnail(image: Sharp, { destination, size = 512 }: { destination?: string; size?: number }) {
    const gen = image.resize(size, size, { fit: "inside" }).webp();

    if (destination) {
        await fs.mkdir(path.dirname(destination), { recursive: true });
        await gen.toFile(destination);
    } else return gen.toBuffer();
}

export async function generateVideoThumbnail(input: string, { destination, size = 512 }: { destination?: string; size?: number }): Promise<Result<Buffer<ArrayBuffer> | undefined, AppError>> {
    const binaryPath = getBinaryPath("ffmpeg");
    if (!binaryPath.success) return binaryPath;

    return await new Promise(resolve => {
        let ffmpeg;
        try {
            ffmpeg = spawn(binaryPath.data, ["-ss", "0.1", "-autorotate", "1", "-i", input, "-frames:v", "1", "-f", "image2pipe", "-vcodec", "mjpeg", "pipe:1"]);
        } catch (error) {
            resolve(Result.reject(Errors.mediaProcessingFailed({ message: "Unable to start FFmpeg", error, details: { input } })));
            return;
        }

        let stderr = "";
        const chunks: Buffer[] = [];

        ffmpeg.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
        ffmpeg.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString()));

        ffmpeg.on("error", error => resolve(Result.reject(Errors.mediaProcessingFailed({ message: "FFmpeg could not process the media", error, details: { input } }))));
        ffmpeg.on("close", async code => {
            if (code !== 0) {
                resolve(Result.reject(Errors.mediaProcessingFailed({ message: "FFmpeg could not generate a thumbnail", details: { input, exitCode: code, stderr: stderr.trim() } })));
                return;
            }

            try {
                const frame = Buffer.concat(chunks);
                const gen = sharp(frame).resize(size, size, { fit: "inside" }).webp();

                if (destination) {
                    await fs.mkdir(path.dirname(destination), { recursive: true });
                    await gen.toFile(destination);
                    resolve(Result.accept());
                } else resolve(Result.accept(await gen.toBuffer()));
            } catch (error) {
                resolve(Result.reject(Errors.mediaProcessingFailed({ message: "Unable to generate the video thumbnail", error, details: { input } })));
            }
        });
    });
}

interface VideoMetadata {
    duration: number;
    width: number;
    height: number;
}

interface FFprobeStream {
    width?: number;
    height?: number;
    tags?: {
        rotate?: string | number;
    };
    side_data_list?: Array<{
        rotation?: string | number;
    }>;
}

interface FFprobeOutput {
    format?: {
        duration?: string | number;
    };
    streams?: FFprobeStream[];
}

export function getVideoMetadata(filePath: string): Promise<Result<VideoMetadata, AppError>> {
    const binaryPath = getBinaryPath("ffprobe");
    if (!binaryPath.success) return Promise.resolve(binaryPath);

    return new Promise(resolve => {
        let child;
        try {
            child = spawn(binaryPath.data, ["-v", "error", "-select_streams", "v:0", "-show_streams", "-show_format", "-of", "json", filePath]);
        } catch (error) {
            resolve(Result.reject(Errors.mediaProcessingFailed({ message: "Unable to start FFprobe.", error, details: { filePath } })));
            return;
        }

        let stdout = "";
        let stderr = "";

        child.stdout.on("data", (data: Buffer) => (stdout += data.toString()));
        child.stderr.on("data", (data: Buffer) => (stderr += data.toString()));

        child.on("error", error => resolve(Result.reject(Errors.mediaProcessingFailed({ message: "FFprobe could not inspect the media", error, details: { filePath } }))));
        child.on("close", code => {
            if (code !== 0) {
                resolve(Result.reject(Errors.mediaProcessingFailed({ message: "FFprobe could not read the media metadata", details: { filePath, exitCode: code, stderr: stderr.trim() } })));
                return;
            }

            try {
                const data = JSON.parse(stdout) as FFprobeOutput;
                const stream = data.streams?.[0];

                if (!stream) {
                    resolve(Result.reject(Errors.mediaProcessingFailed({ message: "No video stream was found", details: { filePath } })));
                    return;
                }

                let width = Number(stream.width ?? 0);
                let height = Number(stream.height ?? 0);

                const sideDataRotation = stream.side_data_list?.map(item => item.rotation).find(rotation => rotation !== undefined);
                const tagRotation = stream.tags?.rotate;
                const rotation = Number(sideDataRotation ?? tagRotation ?? 0);
                const normalizedRotation = ((rotation % 360) + 360) % 360;
                if (normalizedRotation === 90 || normalizedRotation === 270) {
                    [width, height] = [height, width];
                }

                resolve(
                    Result.accept({
                        duration: Number(data.format?.duration ?? 0),
                        width,
                        height,
                    }),
                );
            } catch (error) {
                resolve(Result.reject(Errors.mediaProcessingFailed({ message: "Unable to read the video metadata", error, details: { filePath } })));
            }
        });
    });
}
