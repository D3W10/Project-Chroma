import path from "node:path";
import { AutoProcessor, AutoTokenizer, CLIPTextModelWithProjection, CLIPVisionModelWithProjection, RawImage } from "@huggingface/transformers";
import type { ItemSearchMatch, ItemSearchStatus, Library } from "@project-chroma/contracts/gallery";
import * as DB from "../db/index.ts";
import type { ConfigStore } from "./config.ts";

const SEARCH_MODEL_REPOSITORY = "Xenova/clip-vit-base-patch32";
const SEARCH_INDEX_MODEL_ID = `${SEARCH_MODEL_REPOSITORY}:q8:v1`;
const SEARCH_DEFAULT_LIMIT = 300;
const SEARCH_DEFAULT_MIN_SCORE = 0.18;
const SEARCH_INDEX_BATCH_SIZE = 32;

type SearchModels = {
    tokenizer: Awaited<ReturnType<typeof AutoTokenizer.from_pretrained>>;
    processor: Awaited<ReturnType<typeof AutoProcessor.from_pretrained>>;
    textModel: Awaited<ReturnType<typeof CLIPTextModelWithProjection.from_pretrained>>;
    visionModel: Awaited<ReturnType<typeof CLIPVisionModelWithProjection.from_pretrained>>;
};

type CreateSearchServiceOptions = {
    app: Electron.App;
    config: ConfigStore;
};

function databaseValue<T>(library: Library, callback: (db: DB.ChromaDB) => T): T {
    const result = DB.withDatabase(library.path, callback);
    if (!result.success) throw result.error;
    return result.data;
}

export function normalizeEmbedding(values: ArrayLike<number>): Float32Array {
    const embedding = Float32Array.from(values);
    let magnitudeSquared = 0;
    for (const value of embedding) magnitudeSquared += value * value;

    const magnitude = Math.sqrt(magnitudeSquared);
    if (magnitude === 0) return embedding;
    for (let index = 0; index < embedding.length; index++) embedding[index] = embedding[index]! / magnitude;
    return embedding;
}

export function serializeEmbedding(values: Float32Array): Buffer {
    const serialized = Buffer.allocUnsafe(values.length * Float32Array.BYTES_PER_ELEMENT);
    for (let index = 0; index < values.length; index++) serialized.writeFloatLE(values[index]!, index * Float32Array.BYTES_PER_ELEMENT);
    return serialized;
}

export function deserializeEmbedding(serialized: Uint8Array, dimensions: number): Float32Array | undefined {
    if (dimensions <= 0 || serialized.byteLength !== dimensions * Float32Array.BYTES_PER_ELEMENT) return;

    const view = Buffer.from(serialized.buffer, serialized.byteOffset, serialized.byteLength);
    const embedding = new Float32Array(dimensions);
    for (let index = 0; index < dimensions; index++) embedding[index] = view.readFloatLE(index * Float32Array.BYTES_PER_ELEMENT);
    return embedding;
}

export function scoreEmbedding(left: Float32Array, right: Float32Array): number | undefined {
    if (left.length === 0 || left.length !== right.length) return;

    let score = 0;
    for (let index = 0; index < left.length; index++) score += left[index]! * right[index]!;
    return score;
}

export function createSearchService({ app, config }: CreateSearchServiceOptions) {
    const activeIndexers = new Set<string>();
    let modelsPromise: Promise<SearchModels> | undefined;

    async function isEnabled(): Promise<boolean> {
        return (await config.get()).settings.searchEnabled;
    }

    async function getModels(): Promise<SearchModels> {
        if (modelsPromise) return modelsPromise;

        const options = {
            cache_dir: path.join(app.getPath("userData"), "search-models"),
            dtype: "q8" as const,
        };
        modelsPromise = Promise.all([
            AutoTokenizer.from_pretrained(SEARCH_MODEL_REPOSITORY, options),
            AutoProcessor.from_pretrained(SEARCH_MODEL_REPOSITORY, options),
            CLIPTextModelWithProjection.from_pretrained(SEARCH_MODEL_REPOSITORY, options),
            CLIPVisionModelWithProjection.from_pretrained(SEARCH_MODEL_REPOSITORY, options),
        ])
            .then(([tokenizer, processor, textModel, visionModel]) => ({ tokenizer, processor, textModel, visionModel }))
            .catch(error => {
                modelsPromise = undefined;
                throw error;
            });

        return modelsPromise;
    }

    async function embedImage(models: SearchModels, imagePath: string): Promise<Float32Array> {
        const image = await RawImage.read(imagePath);
        const inputs = await models.processor(image);
        const output = await models.visionModel(inputs);
        return normalizeEmbedding(output.image_embeds.data as ArrayLike<number>);
    }

    async function embedText(models: SearchModels, query: string): Promise<Float32Array> {
        const inputs = models.tokenizer(query, { padding: true, truncation: true });
        const output = await models.textModel(inputs);
        return normalizeEmbedding(output.text_embeds.data as ArrayLike<number>);
    }

    async function runIndexer(library: Library, models: SearchModels): Promise<void> {
        while (await isEnabled()) {
            const itemIds = databaseValue(library, db => DB.items.getPendingSearchItemIds(db, SEARCH_INDEX_MODEL_ID, SEARCH_INDEX_BATCH_SIZE));
            if (itemIds.length === 0) return;

            for (const itemId of itemIds) {
                if (!(await isEnabled())) return;

                try {
                    const embedding = await embedImage(models, path.join(library.path, "thumbnails", `${itemId}.webp`));
                    databaseValue(library, db => DB.items.upsertSearchEmbedding(db, itemId, SEARCH_INDEX_MODEL_ID, serializeEmbedding(embedding), embedding.length));
                } catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    databaseValue(library, db => DB.items.upsertSearchFailure(db, itemId, SEARCH_INDEX_MODEL_ID, message));
                }
            }
        }
    }

    function startIndexer(library: Library, loadedModels?: SearchModels): void {
        if (activeIndexers.has(library.id)) return;
        activeIndexers.add(library.id);

        void (loadedModels ? Promise.resolve(loadedModels) : getModels())
            .then(models => runIndexer(library, models))
            .catch(error => console.error(`[search] Indexing failed for library ${library.id}`, error))
            .finally(() => activeIndexers.delete(library.id));
    }

    async function getStatus(library: Library): Promise<ItemSearchStatus> {
        let status = databaseValue(library, db => DB.items.getItemSearchStatus(db, SEARCH_INDEX_MODEL_ID, activeIndexers.has(library.id)));
        if (status.pendingItems > 0 && !status.indexing && (await isEnabled())) {
            startIndexer(library);
            status = { ...status, indexing: true };
        }
        return status;
    }

    return {
        async enable(library: Library): Promise<ItemSearchStatus> {
            const models = await getModels();
            const currentConfig = await config.get();
            await config.set({ settings: { ...currentConfig.settings, searchEnabled: true } });
            startIndexer(library, models);
            return getStatus(library);
        },
        getStatus,
        async indexNewItems(library: Library): Promise<void> {
            if (await isEnabled()) startIndexer(library);
        },
        async search(library: Library, query: string, limit: number, minScore = SEARCH_DEFAULT_MIN_SCORE): Promise<ItemSearchMatch[]> {
            const searchQuery = query.trim();
            if (!searchQuery || !(await isEnabled())) return [];

            const embeddings = databaseValue(library, db => DB.items.getSearchEmbeddings(db, SEARCH_INDEX_MODEL_ID));
            if (embeddings.length === 0) return [];

            const models = await getModels();
            const queryEmbedding = await embedText(models, searchQuery);
            const safeLimit = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : SEARCH_DEFAULT_LIMIT;

            return embeddings
                .map(row => {
                    const embedding = deserializeEmbedding(row.embedding, row.embeddingDim);
                    const score = embedding ? scoreEmbedding(queryEmbedding, embedding) : undefined;
                    return score === undefined ? undefined : { itemId: row.itemId, score };
                })
                .filter((match): match is ItemSearchMatch => match !== undefined && match.score >= minScore)
                .sort((left, right) => right.score - left.score)
                .slice(0, safeLimit);
        },
    };
}
