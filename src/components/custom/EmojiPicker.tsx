import { useState } from "react";
import emojiRegex from "emoji-regex";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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
            e.currentTarget.value = emojis[0] || "";
        } else {
            onEmojiSelect("");
            e.currentTarget.value = "";
        }
    }

    return (
        <div className={cn("flex justify-between", className)} {...props}>
            <Button variant="outline" size="icon" className={cn("size-14 text-2xl", emoji === options[0] ? "ring-2 ring-primary" : "")} disabled={disabled} onClick={() => emojiSelected(options[0])}>{options[0]}</Button>
            <Button variant="outline" size="icon" className={cn("size-14 text-2xl", emoji === options[1] ? "ring-2 ring-primary" : "")} disabled={disabled} onClick={() => emojiSelected(options[1])}>{options[1]}</Button>
            <Button variant="outline" size="icon" className={cn("size-14 text-2xl", emoji === options[2] ? "ring-2 ring-primary" : "")} disabled={disabled} onClick={() => emojiSelected(options[2])}>{options[2]}</Button>
            <Button variant="outline" size="icon" className={cn("size-14 text-2xl", emoji === options[3] ? "ring-2 ring-primary" : "")} disabled={disabled} onClick={() => emojiSelected(options[3])}>{options[3]}</Button>
            <Button variant="outline" size="icon" className={cn("size-14 text-2xl", emoji === options[4] ? "ring-2 ring-primary" : "")} disabled={disabled} onClick={() => emojiSelected(options[4])}>{options[4]}</Button>
            <Button variant="outline" size="icon" className={cn("size-14 text-2xl", emoji === options[5] ? "ring-2 ring-primary" : "")} disabled={disabled} onClick={() => emojiSelected(options[5])}>{options[5]}</Button>
            <Input type="text" defaultValue={customEmoji ? emoji : ""} className="size-14 p-1 text-2xl! text-center placeholder:opacity-20 focus-visible:placeholder:opacity-0" placeholder="📁" maxLength={4} disabled={disabled} onFocus={customSelected} onInput={validate} />
        </div>
    );
}