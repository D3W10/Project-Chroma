import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/onboarding/customize")({
    component: RouteComponent,
});

function RouteComponent() {
    const [libraryName, setLibraryName] = useState("");
    const [libraryIcon, setLibraryIcon] = useState("📁");
    const [libraryColor, setLibraryColor] = useState("#ffff00");
    const [libraryPath, setLibraryPath] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSelectFolder = async () => {
        try {
            const selected = await open({
                directory: true,
                title: "Select folder for your photo library",
            });

            if (selected) {
                setLibraryPath(selected);
            }
        } catch (error) {
            console.error("Failed to open folder dialog:", error);
        }
    };

    const handleCreateLibrary = async () => {
        if (!libraryName.trim() || !libraryPath) return;

        setLoading(true);
        try {
            await invoke("create_library", {
                name: libraryName.trim(),
                icon: libraryIcon,
                color: libraryColor,
                path: libraryPath,
            });

            /* navigate({ to: "/" }); */
        } catch (error) {
            console.error("Failed to create library:", error);
        } finally {
            setLoading(false);
        }
    };

    // Create your first photo library to get started

    return (
        <motion.div
            className="space-y-6"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.6 }}
        >
            <div>
                <label className="block text-sm font-medium mb-2">
                    Library Name
                </label>
                <input
                    type="text"
                    value={libraryName}
                    onChange={e => setLibraryName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="My Photos"
                />
            </div>
            <div>
                <label className="block text-sm font-medium mb-2">
                    Library Icon
                </label>
                <div className="flex gap-2">
                    {["📁", "📷", "🎨", "🌟", "💎"].map(icon => (
                        <button
                            key={icon}
                            onClick={() => setLibraryIcon(icon)}
                            className={`w-12 h-12 text-2xl border rounded-md flex items-center justify-center ${
                                libraryIcon === icon
                                    ? "border-primary bg-primary/10"
                                    : "border-border hover:bg-muted"
                            }`}
                        >
                            {icon}
                        </button>
                    ))}
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium mb-2">
                    Library Location
                </label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={libraryPath}
                        readOnly
                        className="flex-1 px-3 py-2 border rounded-md bg-muted"
                        placeholder="Select a folder..."
                    />
                    <Button
                        variant="outline"
                        onClick={handleSelectFolder}
                    >
                        <p>Insert folder</p>
                    </Button>
                </div>
            </div>
            <Button
                onClick={handleCreateLibrary}
                disabled={!libraryName.trim() || !libraryPath || loading}
                className="w-full"
            >
                {loading
                    ? "Creating Library..."
                    : (
                        <>
                            Create Library
                        </>
                    )}
            </Button>
        </motion.div>
    );
}