import { useState } from "react";
import colors from "tailwindcss/colors";
import { IconHelpCircle } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn, isValidColor } from "@/lib/utils";

interface ColorPickerProps extends React.ComponentProps<"div"> {
    disabled?: boolean;
    color: string;
    onColorSelect: (color: string) => unknown;
}

export function ColorPicker({ className, disabled, color, onColorSelect, ...props }: ColorPickerProps) {
    const [customColor, setCustomColor] = useState(false);

    function colorSelected(color: string) {
        setCustomColor(false);
        onColorSelect(color);
    }

    function customSelected() {
        setCustomColor(true);
        onColorSelect("");
    }

    function validate(e: React.ChangeEvent<HTMLInputElement>) {
        const inputValue = e.currentTarget.value;

        if (isValidColor(inputValue))
            onColorSelect(inputValue);
        else
            onColorSelect("");
    }

    return (
        <div className={cn("flex gap-1", className)} {...props}>
            <Button variant="link" className={cn("h-6 p-0 relative flex-1 rounded-md bg-red-500 hover:opacity-80 before:block before:absolute before:inset-0.5 before:rounded-[0.3rem] before:transition-shadow", color === colors.red[500] ? "before:inset-ring-2 before:inset-ring-background" : "")} disabled={disabled} onClick={() => colorSelected(colors.red[500])} />
            <Button variant="link" className={cn("h-6 p-0 relative flex-1 rounded-md bg-orange-500 hover:opacity-80 before:block before:absolute before:inset-0.5 before:rounded-[0.3rem] before:transition-shadow", color === colors.orange[500] ? "before:inset-ring-2 before:inset-ring-background" : "")} disabled={disabled} onClick={() => colorSelected(colors.orange[500])} />
            <Button variant="link" className={cn("h-6 p-0 relative flex-1 rounded-md bg-yellow-500 hover:opacity-80 before:block before:absolute before:inset-0.5 before:rounded-[0.3rem] before:transition-shadow", color === colors.yellow[500] ? "before:inset-ring-2 before:inset-ring-background" : "")} disabled={disabled} onClick={() => colorSelected(colors.yellow[500])} />
            <Button variant="link" className={cn("h-6 p-0 relative flex-1 rounded-md bg-lime-500 hover:opacity-80 before:block before:absolute before:inset-0.5 before:rounded-[0.3rem] before:transition-shadow", color === colors.lime[500] ? "before:inset-ring-2 before:inset-ring-background" : "")} disabled={disabled} onClick={() => colorSelected(colors.lime[500])} />
            <Button variant="link" className={cn("h-6 p-0 relative flex-1 rounded-md bg-emerald-500 hover:opacity-80 before:block before:absolute before:inset-0.5 before:rounded-[0.3rem] before:transition-shadow", color === colors.emerald[500] ? "before:inset-ring-2 before:inset-ring-background" : "")} disabled={disabled} onClick={() => colorSelected(colors.emerald[500])} />
            <Button variant="link" className={cn("h-6 p-0 relative flex-1 rounded-md bg-sky-500 hover:opacity-80 before:block before:absolute before:inset-0.5 before:rounded-[0.3rem] before:transition-shadow", color === colors.sky[500] ? "before:inset-ring-2 before:inset-ring-background" : "")} disabled={disabled} onClick={() => colorSelected(colors.sky[500])} />
            <Button variant="link" className={cn("h-6 p-0 relative flex-1 rounded-md bg-blue-500 hover:opacity-80 before:block before:absolute before:inset-0.5 before:rounded-[0.3rem] before:transition-shadow", color === colors.blue[500] ? "before:inset-ring-2 before:inset-ring-background" : "")} disabled={disabled} onClick={() => colorSelected(colors.blue[500])} />
            <Button variant="link" className={cn("h-6 p-0 relative flex-1 rounded-md bg-violet-500 hover:opacity-80 before:block before:absolute before:inset-0.5 before:rounded-[0.3rem] before:transition-shadow", color === colors.violet[500] ? "before:inset-ring-2 before:inset-ring-background" : "")} disabled={disabled} onClick={() => colorSelected(colors.violet[500])} />
            <Button variant="link" className={cn("h-6 p-0 relative flex-1 rounded-md bg-fuchsia-500 hover:opacity-80 before:block before:absolute before:inset-0.5 before:rounded-[0.3rem] before:transition-shadow", color === colors.fuchsia[500] ? "before:inset-ring-2 before:inset-ring-background" : "")} disabled={disabled} onClick={() => colorSelected(colors.fuchsia[500])} />
            <Button variant="link" className={cn("h-6 p-0 relative flex-1 rounded-md bg-pink-500 hover:opacity-80 before:block before:absolute before:inset-0.5 before:rounded-[0.3rem] before:transition-shadow", color === colors.pink[500] ? "before:inset-ring-2 before:inset-ring-background" : "")} disabled={disabled} onClick={() => colorSelected(colors.pink[500])} />
            <Button variant="link" className={cn("h-6 p-0 relative flex-1 rounded-md bg-slate-500 hover:opacity-80 before:block before:absolute before:inset-0.5 before:rounded-[0.3rem] before:transition-shadow", color === colors.slate[500] ? "before:inset-ring-2 before:inset-ring-background" : "")} disabled={disabled} onClick={() => colorSelected(colors.slate[500])} />
            <Button variant="link" className={cn("h-6 p-0 relative flex-1 rounded-md bg-stone-500 hover:opacity-80 before:block before:absolute before:inset-0.5 before:rounded-[0.3rem] before:transition-shadow", color === colors.stone[500] ? "before:inset-ring-2 before:inset-ring-background" : "")} disabled={disabled} onClick={() => colorSelected(colors.stone[500])} />
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="link" className={cn("h-6 p-0 relative flex-1 rounded-md hover:opacity-80 before:block before:absolute before:inset-0.5 before:rounded-sm before:transition-shadow", customColor && color ? "before:inset-ring-2 before:inset-ring-background" : "bg-(image:--rainbow)")} disabled={disabled} onClick={customSelected} style={{ backgroundColor: color }} />
                </PopoverTrigger>
                <PopoverContent className="p-2 gap-2 rounded-2xl">
                    <FieldLabel className="pl-0.5">
                        Custom Color
                        <Tooltip>
                            <TooltipTrigger>
                                <IconHelpCircle className="size-4.5 text-primary" />
                            </TooltipTrigger>
                            <TooltipContent>
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