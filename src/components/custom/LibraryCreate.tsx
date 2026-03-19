import { useState } from "react";
import { save } from "@tauri-apps/plugin-dialog";
import { animate } from "@/components/animated";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import { ColorPicker } from "@/components/custom/ColorPicker";
import { EmojiPicker } from "@/components/custom/EmojiPicker";
import { createLibrary } from "@/lib/invoker";
import { useLibrary } from "@/lib/useLibrary";
import { useNotifications } from "@/lib/useNotifications";

export function useLibraryCreate() {
    const [name, setName] = useState("");
    const [color, setColor] = useState("");
    const [emoji, setEmoji] = useState("");
    const [location, setLocation] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const { selectLibraryById } = useLibrary();
    const { pushNoti } = useNotifications();

    const isValid = name.trim().length > 0 && color.trim().length > 0 && emoji.trim().length > 0 && location.trim().length > 0;

    async function selectLocation() {
        try {
            const selected = await save({
                defaultPath: name,
                canCreateDirectories: true,
            });

            if (selected) {
                const dir = /^[\s\S]+\//g.exec(selected)?.[0] ?? "";

                if (dir)
                    setLocation(dir);
            }
        } catch (err) {
            console.error(err);
            pushNoti("Import error", "Failed to open the system file dialog", "error");
        }
    }

    async function create(onSuccess?: () => void) {
        if (!isValid) return;

        setIsProcessing(true);

        const { ok, data, error } = await createLibrary({
            name,
            icon: emoji,
            color,
            path: location + name,
        });

        if (ok) {
            await selectLibraryById(data.id);
            pushNoti("Library created", "The library \"" + name + "\" was created successfully!", "success");
            onSuccess?.();
        }

        setIsProcessing(false);
        return error === null;
    }

    function reset() {
        setName("");
        setColor("");
        setEmoji("");
        setLocation("");
        setIsProcessing(false);
    }

    return {
        name, setName,
        color, setColor,
        emoji, setEmoji,
        location, setLocation,
        isProcessing,
        isValid,
        selectLocation,
        create,
        reset,
    };
}

interface LibraryCreateProps {
    state: ReturnType<typeof useLibraryCreate>;
    beAnimated?: boolean;
}

export function LibraryCreate({ state, beAnimated = false }: LibraryCreateProps) {
    const {
        name, setName,
        color, setColor,
        emoji, setEmoji,
        location,
        selectLocation,
        isProcessing,
    } = state;

    return (
        <FieldSet className="w-full">
            <FieldGroup>
                <animate.div delay={beAnimated ? 0.65 : 0} transition={{ duration: beAnimated ? undefined : 0 }}>
                    <Field>
                        <FieldLabel htmlFor="libraryName">Name</FieldLabel>
                        <Input id="libraryName" type="text" placeholder="External Drive" disabled={isProcessing} maxLength={25} value={name} onChange={e => setName(e.currentTarget.value)} />
                    </Field>
                </animate.div>
                <animate.div delay={beAnimated ? 0.8 : 0} transition={{ duration: beAnimated ? undefined : 0 }}>
                    <Field>
                        <FieldLabel htmlFor="libraryColor">Color</FieldLabel>
                        <ColorPicker id="libraryColor" disabled={isProcessing} color={color} onColorSelect={setColor} />
                    </Field>
                </animate.div>
                <animate.div delay={beAnimated ? 0.95 : 0} transition={{ duration: beAnimated ? undefined : 0 }}>
                    <Field>
                        <FieldLabel htmlFor="libraryEmoji">Emoji</FieldLabel>
                        <EmojiPicker id="libraryEmoji" disabled={isProcessing} emoji={emoji} onEmojiSelect={setEmoji} options={["📷", "🎨", "⛰️", "🏖️", "⭐", "💎"]} />
                    </Field>
                </animate.div>
                <animate.div delay={beAnimated ? 1.1 : 0} transition={{ duration: beAnimated ? undefined : 0 }}>
                    <Field>
                        <FieldLabel htmlFor="libraryLocation">Location</FieldLabel>
                        <div id="libraryLocation" className="flex gap-2">
                            <Button variant="outline" disabled={isProcessing} onClick={selectLocation}>Select Location</Button>
                            <div className="px-3 pt-2 pb-1 flex-1 rounded-md text-secondary-foreground text-sm font-mono ring-1 ring-input select-text overflow-x-auto overflow-y-hidden">
                                {location}
                            </div>
                        </div>
                    </Field>
                </animate.div>
            </FieldGroup>
        </FieldSet>
    );
}