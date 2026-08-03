import { useState } from "react";
import emojiRegex from "emoji-regex";
import { Button } from "@project-chroma/ui/button";
import { Input } from "@project-chroma/ui/input";
import { cn } from "@project-chroma/utils";

interface EmojiPickerProps extends React.ComponentProps<"div"> {
    disabled?: boolean;
    options: [string, string, string, string, string, string];
    emoji: string;
    onEmojiSelect: (emoji: string) => unknown;
}

export function EmojiPicker({ className, disabled, options, emoji, onEmojiSelect, ...props }: EmojiPickerProps) {
    const [customEmoji, setCustomEmoji] = useState(false);

    function emojiSelected(emoji: string) {
        setCustomEmoji(false);
        onEmojiSelect(emoji);
    }

    function customSelected() {
        setCustomEmoji(true);
        onEmojiSelect("");
    }

    function validate(e: React.ChangeEvent<HTMLInputElement>) {
        const inputValue = e.currentTarget.value;

        if (inputValue === "") {
            onEmojiSelect("");
            return;
        }

        const regex = emojiRegex();
        const emojis = inputValue.match(regex) ?? [];

        if (emojis.length > 0) {
            onEmojiSelect(emojis[0] || "");
        } else {
            onEmojiSelect("");
        }
    }

    return (
        <div className={cn("flex justify-between", className)} {...props}>
            {Array.from({ length: 6 }).map((_, i) => (
                <EmojiOption key={i} current={emoji} emoji={options[i]} disabled={disabled} onEmojiSelect={emojiSelected} />
            ))}
            <Input
                type="text"
                value={customEmoji ? emoji : ""}
                className="size-14 p-1 text-2xl! text-center placeholder:opacity-20 focus-visible:placeholder:opacity-0"
                placeholder="📁"
                maxLength={4}
                disabled={disabled}
                onFocus={customSelected}
                onChange={validate}
            />
        </div>
    );
}

function EmojiOption({
    current,
    emoji,
    disabled,
    onEmojiSelect,
    ...rest
}: React.ComponentProps<"button"> & {
    current: string;
    emoji: string;
    onEmojiSelect: (emoji: string) => unknown;
}) {
    return (
        <Button variant="secondary" size="icon" className={cn("size-14 text-2xl", current === emoji ? "ring-2 ring-primary" : "")} disabled={disabled} onClick={() => onEmojiSelect(emoji)} {...rest}>
            {emoji}
        </Button>
    );
}
