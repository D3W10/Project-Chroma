import React, { useState } from "react";
import colors from "tailwindcss/colors";
import { IconHelpCircle } from "@tabler/icons-react";
import { Button } from "@project-chroma/ui/button";
import { FieldLabel } from "@project-chroma/ui/field";
import { Input } from "@project-chroma/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@project-chroma/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@project-chroma/ui/tooltip";
import { cn } from "@project-chroma/utils";
import { isValidColor } from "@/lib/utils";

interface ColorPickerProps extends React.ComponentProps<"div"> {
    disabled?: boolean;
    color: string;
    onColorSelect: (color: string) => unknown;
}

export function ColorPicker({ className, disabled, color, onColorSelect, ...props }: ColorPickerProps) {
    const [customColor, setCustomColor] = useState(false);
    const presetColors = [
        colors.red[500],
        colors.orange[500],
        colors.yellow[500],
        colors.lime[500],
        colors.emerald[500],
        colors.sky[500],
        colors.blue[500],
        colors.violet[500],
        colors.fuchsia[500],
        colors.pink[500],
        colors.slate[500],
        colors.stone[500],
    ];

    function colorSelected(color: string) {
        setCustomColor(false);
        onColorSelect(color);
    }

    function customSelected() {
        setCustomColor(true);
        onColorSelect("");
    }

    function validate(e: React.InputEvent<HTMLInputElement>) {
        const inputValue = e.currentTarget.value;

        if (isValidColor(inputValue)) onColorSelect(inputValue);
        else onColorSelect("");
    }

    return (
        <div className={cn("flex gap-1", className)} {...props}>
            {Array.from({ length: 12 }).map((_, i) => (
                <ColorOption key={i} current={color} color={presetColors[i]} disabled={disabled} onColorSelect={colorSelected} />
            ))}
            <Popover>
                <PopoverTrigger render={<ColorOption current={color} color={color} disabled={disabled} custom isCurrentlyCustom={customColor} onColorSelect={customSelected} />} />
                <PopoverContent className="p-2 gap-2 rounded-2xl">
                    <FieldLabel className="pl-0.5">
                        Custom Color
                        <Tooltip>
                            <TooltipTrigger type="button">
                                <IconHelpCircle className="size-4.5 text-primary" />
                            </TooltipTrigger>
                            <TooltipContent className="flex-col items-start">
                                Supports hex, rgba, hsl, oklch and many more.
                                <ul className="list-disc pl-4">
                                    <li>red</li>
                                    <li>#088fff</li>
                                    <li>rgb(125 8 186)</li>
                                    <li>hsl(25 100% 50%)</li>
                                </ul>
                            </TooltipContent>
                        </Tooltip>
                    </FieldLabel>
                    <Input placeholder="#00c9e7" defaultValue={customColor ? color : ""} maxLength={25} autoCorrect="off" onInput={validate} />
                </PopoverContent>
            </Popover>
        </div>
    );
}

function ColorOption({
    current,
    color,
    disabled,
    custom,
    isCurrentlyCustom,
    onColorSelect,
    ...rest
}: React.ComponentProps<"button"> & {
    current: string;
    color: string;
    custom?: boolean;
    isCurrentlyCustom?: boolean;
    onColorSelect: (color: string) => unknown;
}) {
    return (
        <Button
            type="button"
            variant="link"
            className={cn(
                "h-6 p-0 relative flex-1 rounded-md hover:opacity-80 before:block before:absolute before:inset-0.5 before:rounded-sm before:transition-shadow",
                !custom
                    ? current === color
                        ? "before:inset-ring-2 before:inset-ring-background"
                        : ""
                    : isCurrentlyCustom && color
                      ? "before:inset-ring-2 before:inset-ring-background"
                      : "bg-(image:--rainbow)",
            )}
            disabled={disabled}
            onClick={() => onColorSelect(color)}
            style={{ backgroundColor: color }}
            {...rest}
        />
    );
}
