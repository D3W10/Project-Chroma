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
}
