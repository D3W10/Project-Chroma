import { ipc } from "@project-chroma/contracts/ipc";
import { registerHandle } from "./ipc.ts";
import type { ConfigStore } from "../lib/config.ts";

export function registerConfigCommands(config: ConfigStore) {
    registerHandle(ipc.CONFIG_GET, async (_, key?) => {
        const current = await config.get();
        if (key === undefined) return current;
        return current[key];
    });

    registerHandle(ipc.CONFIG_SET, (_, partial) => config.set(partial));
    registerHandle(ipc.CONFIG_UPDATE, (_, nextConfig) => config.update(nextConfig));
}
