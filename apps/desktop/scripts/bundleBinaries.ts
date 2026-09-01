import path from "node:path";
import fs from "node:fs/promises";
import ffmpeg from "@ffmpeg-installer/ffmpeg";
import ffprobe from "@ffprobe-installer/ffprobe";

const destination = path.resolve(import.meta.dirname, "..", "resources", "bin");
const extension = process.platform === "win32" ? ".exe" : "";

await fs.mkdir(destination, { recursive: true });

for (const [name, source] of Object.entries({
    [`ffmpeg${extension}`]: ffmpeg.path,
    [`ffprobe${extension}`]: ffprobe.path,
})) {
    const target = path.join(destination, name);
    await fs.copyFile(source, target);
    await fs.chmod(target, 0o755);
    console.log(`Bundled ${name}`);
}
