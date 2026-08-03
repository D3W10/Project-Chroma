import type sharp from "sharp";

export async function generateImageThumbnail(image: sharp.Sharp, { destination, size = 512 }: { destination?: string; size?: number }) {
    const gen = image.resize(size, size, { fit: "inside" }).webp();

    if (destination) await gen.toFile(destination);
    else return gen.toBuffer();
}
