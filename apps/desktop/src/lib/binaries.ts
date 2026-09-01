import fs from "node:fs";
import path from "node:path";
import { Errors, Result, type AppError } from "@project-chroma/utils";

type ChromaBinary = "ffmpeg" | "ffprobe";

const extension = process.platform === "win32" ? ".exe" : "";
const developmentDirectory = path.join(process.cwd(), "resources", "bin");
const packagedDirectory = path.join(process.resourcesPath ?? developmentDirectory, "bin");

export function getBinaryPath(binary: ChromaBinary): Result<string, AppError> {
    const binaryPath = path.join(process.env.ELECTRON_START_URL ? developmentDirectory : packagedDirectory, `${binary}${extension}`);

    if (!fs.existsSync(binaryPath)) {
        return Result.reject(Errors.binaryNotFound({ message: `Bundled ${binary} binary is not available.`, details: { binary, binaryPath } }));
    }

    return Result.accept(binaryPath);
}
