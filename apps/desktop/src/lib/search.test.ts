import { describe, expect, it } from "vitest";
import { deserializeEmbedding, normalizeEmbedding, scoreEmbedding, serializeEmbedding } from "./search.ts";

describe("search embeddings", () => {
    it("normalizes vectors before comparison", () => {
        expect(Array.from(normalizeEmbedding(new Float32Array([3, 4])))).toEqual([0.6000000238418579, 0.800000011920929]);
    });

    it("round trips embeddings through the database representation", () => {
        const embedding = new Float32Array([0.25, -0.5, 0.75]);
        expect(deserializeEmbedding(serializeEmbedding(embedding), embedding.length)).toEqual(embedding);
    });

    it("scores compatible embeddings and rejects invalid ones", () => {
        expect(scoreEmbedding(new Float32Array([1, 0]), new Float32Array([0.5, 0.5]))).toBe(0.5);
        expect(scoreEmbedding(new Float32Array([1]), new Float32Array([1, 0]))).toBeUndefined();
    });
});
