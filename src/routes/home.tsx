import { invoke } from "@tauri-apps/api/core";

export default function Home() {
    function createDefaultPhotostore() {
        console.log("Creating default photostore");
        invoke("create_photostore", { path: "/Users/danielnunes/Downloads/PhotosChromaTest" });
    }

    return (
        <main>
            <h1>Home</h1>
            <button onClick={createDefaultPhotostore}>Create default photostore</button>
        </main>
    );
}