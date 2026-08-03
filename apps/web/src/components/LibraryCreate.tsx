import { useState } from "react";
import { Button } from "@project-chroma/ui/button";
import { Input } from "@project-chroma/ui/input";
import { Field, FieldGroup, FieldLabel, FieldSet } from "@project-chroma/ui/field";
import { animate } from "@/components/animated";
import { ColorPicker } from "@/components/ColorPicker";
import { EmojiPicker } from "@/components/EmojiPicker";
import { PathBox } from "@/components/PathBox";
import { useAction } from "@/lib/useAction";
import { useNotifications } from "@/lib/useNotifications";

export function useLibraryCreate() {
    const [name, setName] = useState("");
    const [color, setColor] = useState("");
    const [emoji, setEmoji] = useState("");
    const [location, setLocation] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const { createLibrary } = useAction();
    const { pushNoti } = useNotifications();

    const isValid = name.trim().length > 0 && color.trim().length > 0 && emoji.trim().length > 0 && location.trim().length > 0;

    async function selectLocation() {
        try {
            const selected = (
                await window.chroma?.saveDialog({
                    defaultPath: name,
                    canCreateDirectories: true,
                })
            )?.data;

            if (selected) {
                const dir = /^[\s\S]+\//g.exec(selected)?.[0] ?? "";

                if (dir) setLocation(dir);
            }
        } catch (err) {
            console.error(err);
            pushNoti({ title: "Import error", description: "Failed to open the system file dialog", type: "error" });
        }
    }

    async function create(onSuccess?: () => void) {
        if (!isValid) return;

        setIsProcessing(true);
        createLibrary(name, emoji, color, location + name, onSuccess);
        setIsProcessing(false);
    }

    function reset() {
        setName("");
        setColor("");
        setEmoji("");
        setLocation("");
        setIsProcessing(false);
    }

    return {
        name,
        setName,
        color,
        setColor,
        emoji,
        setEmoji,
        location,
        setLocation,
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
    const { name, setName, color, setColor, emoji, setEmoji, location, selectLocation, isProcessing } = state;

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
                            <Button variant="secondary" size="sm" disabled={isProcessing} onClick={selectLocation}>
                                Select Location
                            </Button>
                            <PathBox size="sm" className="flex-1">
                                {location}
                            </PathBox>
                        </div>
                    </Field>
                </animate.div>
            </FieldGroup>
        </FieldSet>
    );
}
