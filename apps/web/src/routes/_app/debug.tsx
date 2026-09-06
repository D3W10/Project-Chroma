import { Button } from "@project-chroma/ui/button";
import { ButtonGroup, ButtonGroupText } from "@project-chroma/ui/button-group";
import { Checkbox } from "@project-chroma/ui/checkbox";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from "@project-chroma/ui/command";
import {
    ContextMenu,
    ContextMenuCheckboxItem,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuLabel,
    ContextMenuSeparator,
    ContextMenuShortcut,
    ContextMenuSub,
    ContextMenuSubContent,
    ContextMenuSubTrigger,
    ContextMenuTrigger,
} from "@project-chroma/ui/context-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@project-chroma/ui/dialog";
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSeparator, FieldSet, FieldTitle } from "@project-chroma/ui/field";
import { Input } from "@project-chroma/ui/input";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText, InputGroupTextarea } from "@project-chroma/ui/input-group";
import { Kbd, KbdGroup } from "@project-chroma/ui/kbd";
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@project-chroma/ui/popover";
import { Progress, ProgressLabel, ProgressValue } from "@project-chroma/ui/progress";
import { RadioGroup, RadioGroupItem } from "@project-chroma/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from "@project-chroma/ui/select";
import { Separator } from "@project-chroma/ui/separator";
import { Slider } from "@project-chroma/ui/slider";
import { Spinner } from "@project-chroma/ui/spinner";
import { Switch } from "@project-chroma/ui/switch";
import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@project-chroma/ui/table";
import { Textarea } from "@project-chroma/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@project-chroma/ui/tooltip";
import { Result, appColors } from "@project-chroma/utils";
import { createFileRoute } from "@tanstack/react-router";
import {
    IconBell,
    IconBoxMultiple,
    IconCheck,
    IconClipboard,
    IconCommand,
    IconFolder,
    IconPalette,
    IconPhoto,
    IconPlus,
    IconSearch,
    IconSettings,
    IconSparkles,
    IconTrash,
    IconUpload,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { IconBox } from "@/components/IconBox";
import { SelectAlbumDialog } from "@/components/overlays/SelectAlbumDialog";
import { useNotifications } from "@/lib/useNotifications";
import { useSettings } from "@/lib/useSettings";

export const Route = createFileRoute("/_app/debug")({
    component: RouteComponent,
});

const themeTokens = [
    ["page", "bg-page text-foreground"],
    ["background", "bg-background text-foreground"],
    ["foreground", "bg-foreground text-background"],
    ["card", "bg-card text-card-foreground"],
    ["card-foreground", "bg-card-foreground text-card"],
    ["popover", "bg-popover text-popover-foreground"],
    ["popover-foreground", "bg-popover-foreground text-popover"],
    ["primary", "bg-primary text-primary-foreground"],
    ["primary-foreground", "bg-primary-foreground text-primary"],
    ["secondary", "bg-secondary text-secondary-foreground"],
    ["secondary-foreground", "bg-secondary-foreground text-secondary"],
    ["muted", "bg-muted text-muted-foreground"],
    ["muted-foreground", "bg-muted-foreground text-muted"],
    ["accent", "bg-accent text-accent-foreground"],
    ["accent-foreground", "bg-accent-foreground text-accent"],
    ["destructive", "bg-destructive text-white"],
    ["border", "bg-border text-foreground"],
    ["input", "bg-input text-foreground"],
    ["ring", "bg-ring text-primary-foreground"],
] as const;

const buttonVariants = ["default", "outline", "secondary", "ghost", "destructive", "link"] as const;
const buttonSizes = ["xs", "sm", "default", "lg", "icon-xs", "icon-sm", "icon", "icon-lg"] as const;

function RouteComponent() {
    const [albumDialogOpen, setAlbumDialogOpen] = useState(false);
    const [sampleDialogOpen, setSampleDialogOpen] = useState(false);
    const [progressValue, setProgressValue] = useState(42);
    const [selectedDensity, setSelectedDensity] = useState("comfortable");
    const [checkedMenuItem, setCheckedMenuItem] = useState(true);
    const { pushNoti, progressNoti, setIsOpen, notifications, clearAll } = useNotifications();
    const { settings, updateSettings } = useSettings();

    async function progressTest() {
        const id = pushNoti({
            title: "Importing debug samples",
            description: "This notification updates progress from the debug route.",
            type: "promise",
            promise: new Promise<Result<string>>(resolve => setTimeout(() => resolve(Result.accept("debug-import")), 11000)),
            hasProgress: true,
            peek: "Preparing import",
            success: () => ({ title: "Debug import complete", description: "Progress notification reached 100%." }),
            error: () => ({ title: "Debug import failed", description: "Something went wrong in the simulated task." }),
        });

        for (const value of [0.08, 0.18, 0.32, 0.47, 0.61, 0.73, 0.86, 0.94, 1]) {
            await new Promise(r => setTimeout(r, 1000));
            progressNoti(id, value);
        }
    }

    return (
        <TooltipProvider>
            <div className="h-screen overflow-y-auto bg-page text-foreground">
                <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 p-3">
                    <header className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background p-3">
                        <div>
                            <h1 className="text-lg font-semibold">Debug Workbench</h1>
                            <p className="text-sm text-muted-foreground">UI components, theme tokens, notifications, overlays, and app state checks.</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <ButtonGroup>
                                <Button variant="outline" onClick={() => document.documentElement.setAttribute("data-theme", "light")}>
                                    Light
                                </Button>
                                <Button variant="outline" onClick={() => document.documentElement.setAttribute("data-theme", "dark")}>
                                    Dark
                                </Button>
                                <Button variant="outline" onClick={() => document.documentElement.removeAttribute("data-theme")}>
                                    System
                                </Button>
                            </ButtonGroup>
                            <Button variant="secondary" onClick={() => setSampleDialogOpen(true)}>
                                <IconSparkles />
                                Dialog
                            </Button>
                        </div>
                    </header>

                    <div className="grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
                        <div className="flex min-w-0 flex-col gap-3">
                            <DebugSection icon={<IconBoxMultiple />} title="Installed UI Components" description="A quick pass over every component exported by the shared ui package.">
                                <div className="grid gap-3 lg:grid-cols-2">
                                    <PreviewBlock title="Buttons">
                                        <div className="flex flex-wrap gap-2">
                                            {buttonVariants.map(variant => (
                                                <Button key={variant} variant={variant}>
                                                    {variant}
                                                </Button>
                                            ))}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            {buttonSizes.map(size => (
                                                <Button key={size} variant="secondary" size={size}>
                                                    {size.startsWith("icon") ? <IconFolder /> : size}
                                                </Button>
                                            ))}
                                        </div>
                                        <ButtonGroup>
                                            <Button variant="secondary">
                                                <IconPhoto />
                                                Add
                                            </Button>
                                            <Button variant="secondary">
                                                <IconUpload />
                                                Upload
                                            </Button>
                                            <ButtonGroupText>12 selected</ButtonGroupText>
                                        </ButtonGroup>
                                    </PreviewBlock>

                                    <PreviewBlock title="Fields and Inputs">
                                        <FieldSet>
                                            <FieldLegend>Library details</FieldLegend>
                                            <FieldGroup>
                                                <Field>
                                                    <FieldLabel>Name</FieldLabel>
                                                    <Input defaultValue="Design references" />
                                                    <FieldDescription>Plain input with focus and invalid styles available.</FieldDescription>
                                                </Field>
                                                <Field>
                                                    <FieldLabel>Notes</FieldLabel>
                                                    <Textarea defaultValue="Pinned screenshots, palette ideas, and import tests." />
                                                </Field>
                                                <FieldSeparator>Grouped controls</FieldSeparator>
                                                <Field orientation="horizontal">
                                                    <Checkbox defaultChecked />
                                                    <FieldContent>
                                                        <FieldTitle>Generate thumbnails</FieldTitle>
                                                        <FieldDescription>Horizontal field layout with checkbox content.</FieldDescription>
                                                    </FieldContent>
                                                </Field>
                                            </FieldGroup>
                                        </FieldSet>
                                    </PreviewBlock>

                                    <PreviewBlock title="Input Group">
                                        <InputGroup>
                                            <InputGroupAddon>
                                                <IconSearch />
                                            </InputGroupAddon>
                                            <InputGroupInput placeholder="Search albums, tags, or files" />
                                            <InputGroupAddon align="inline-end">
                                                <Kbd>⌘K</Kbd>
                                            </InputGroupAddon>
                                        </InputGroup>
                                        <InputGroup>
                                            <InputGroupAddon align="block-start" className="border-b">
                                                <InputGroupText>Debug payload</InputGroupText>
                                                <InputGroupButton>
                                                    <IconClipboard />
                                                    Copy
                                                </InputGroupButton>
                                            </InputGroupAddon>
                                            <InputGroupTextarea defaultValue={`{"source":"debug","status":"ready"}`} />
                                        </InputGroup>
                                    </PreviewBlock>

                                    <PreviewBlock title="Selection Controls">
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <Field>
                                                <FieldLabel>Import mode</FieldLabel>
                                                <Select value={selectedDensity} onValueChange={value => setSelectedDensity(value ?? "comfortable")}>
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue placeholder="Choose density" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectLabel>Density</SelectLabel>
                                                        <SelectItem value="compact">Compact</SelectItem>
                                                        <SelectItem value="comfortable">Comfortable</SelectItem>
                                                        <SelectSeparator />
                                                        <SelectItem value="spacious">Spacious</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </Field>
                                            <Field>
                                                <FieldLabel>Range</FieldLabel>
                                                <Slider value={[progressValue]} max={100} step={1} onValueChange={value => setProgressValue(Array.isArray(value) ? (value[0] ?? 0) : value)} />
                                            </Field>
                                        </div>
                                        <FieldGroup>
                                            <Field orientation="horizontal">
                                                <Switch checked={settings.searchEnabled} onCheckedChange={e => updateSettings({ searchEnabled: !!e })} />
                                                <FieldContent>
                                                    <FieldTitle>Search enabled</FieldTitle>
                                                    <FieldDescription>Bound to the real settings store.</FieldDescription>
                                                </FieldContent>
                                            </Field>
                                            <RadioGroup defaultValue="grid" className="grid-cols-3">
                                                {["grid", "list", "masonry"].map(value => (
                                                    <FieldLabel key={value}>
                                                        <Field orientation="horizontal">
                                                            <RadioGroupItem value={value} />
                                                            <FieldTitle className="capitalize">{value}</FieldTitle>
                                                        </Field>
                                                    </FieldLabel>
                                                ))}
                                            </RadioGroup>
                                        </FieldGroup>
                                    </PreviewBlock>

                                    <PreviewBlock title="Overlays">
                                        <div className="flex flex-wrap gap-2">
                                            <Dialog open={sampleDialogOpen} onOpenChange={setSampleDialogOpen}>
                                                <DialogTrigger render={<Button variant="secondary" />}>
                                                    <IconSparkles />
                                                    Sample dialog
                                                </DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>Debug dialog</DialogTitle>
                                                        <DialogDescription>This checks dialog layout, overlay blur, close button, and footer spacing.</DialogDescription>
                                                    </DialogHeader>
                                                    <Input defaultValue="Dialog input" />
                                                    <DialogFooter showCloseButton>
                                                        <Button>Save sample</Button>
                                                    </DialogFooter>
                                                </DialogContent>
                                            </Dialog>
                                            <Popover>
                                                <PopoverTrigger render={<Button variant="secondary" />}>
                                                    <IconSettings />
                                                    Popover
                                                </PopoverTrigger>
                                                <PopoverContent>
                                                    <PopoverHeader>
                                                        <PopoverTitle>Popover panel</PopoverTitle>
                                                        <PopoverDescription>Useful for compact controls and quick metadata.</PopoverDescription>
                                                    </PopoverHeader>
                                                    <Separator />
                                                    <div className="flex items-center justify-between gap-3">
                                                        <span className="text-sm">Smart sort</span>
                                                        <Switch defaultChecked />
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                            <Tooltip>
                                                <TooltipTrigger render={<Button variant="secondary" size="icon" />}>
                                                    <IconCommand />
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    Command palette <Kbd>⌘K</Kbd>
                                                </TooltipContent>
                                            </Tooltip>
                                            <ContextMenu>
                                                <ContextMenuTrigger className="flex h-9 items-center rounded-lg border border-dashed border-border px-3 text-sm text-muted-foreground">
                                                    Right click menu
                                                </ContextMenuTrigger>
                                                <ContextMenuContent>
                                                    <ContextMenuLabel>Debug actions</ContextMenuLabel>
                                                    <ContextMenuItem>
                                                        <IconPhoto />
                                                        Open item
                                                        <ContextMenuShortcut>↵</ContextMenuShortcut>
                                                    </ContextMenuItem>
                                                    <ContextMenuCheckboxItem checked={checkedMenuItem} onCheckedChange={setCheckedMenuItem}>
                                                        Show metadata
                                                    </ContextMenuCheckboxItem>
                                                    <ContextMenuSub>
                                                        <ContextMenuSubTrigger>Export as</ContextMenuSubTrigger>
                                                        <ContextMenuSubContent>
                                                            <ContextMenuItem>PNG</ContextMenuItem>
                                                            <ContextMenuItem>WebP</ContextMenuItem>
                                                        </ContextMenuSubContent>
                                                    </ContextMenuSub>
                                                    <ContextMenuSeparator />
                                                    <ContextMenuItem variant="destructive">
                                                        <IconTrash />
                                                        Delete
                                                    </ContextMenuItem>
                                                </ContextMenuContent>
                                            </ContextMenu>
                                        </div>
                                    </PreviewBlock>

                                    <PreviewBlock title="Command, Table, Progress">
                                        <Command className="h-56 border border-border">
                                            <CommandInput placeholder="Filter debug commands..." />
                                            <CommandList>
                                                <CommandEmpty>No command found.</CommandEmpty>
                                                <CommandGroup heading="Navigation">
                                                    <CommandItem>
                                                        <IconPhoto />
                                                        Albums
                                                        <CommandShortcut>G A</CommandShortcut>
                                                    </CommandItem>
                                                    <CommandItem data-checked="true">
                                                        <IconPalette />
                                                        Theme
                                                        <CommandShortcut>G T</CommandShortcut>
                                                    </CommandItem>
                                                </CommandGroup>
                                                <CommandSeparator />
                                                <CommandGroup heading="Actions">
                                                    <CommandItem>
                                                        <IconPlus />
                                                        Create album
                                                    </CommandItem>
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                        <Progress value={progressValue}>
                                            <ProgressLabel>Preview progress</ProgressLabel>
                                            <ProgressValue />
                                        </Progress>
                                        <Table>
                                            <TableCaption>Small table smoke test.</TableCaption>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Component</TableHead>
                                                    <TableHead>Status</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                <TableRow>
                                                    <TableCell>Dialog</TableCell>
                                                    <TableCell>Mounted</TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell>Select</TableCell>
                                                    <TableCell>{selectedDensity}</TableCell>
                                                </TableRow>
                                            </TableBody>
                                            <TableFooter>
                                                <TableRow>
                                                    <TableCell>Total</TableCell>
                                                    <TableCell>2</TableCell>
                                                </TableRow>
                                            </TableFooter>
                                        </Table>
                                    </PreviewBlock>
                                </div>
                            </DebugSection>

                            <DebugSection icon={<IconPalette />} title="Tailwind and Shadcn Theme Colors" description="Semantic tokens, app colors, and dark/light contrast checks.">
                                <div className="grid gap-3 lg:grid-cols-2">
                                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                        {themeTokens.map(([name, className]) => (
                                            <div key={name} className={"flex min-h-16 flex-col justify-between rounded-lg border border-border p-2 " + className}>
                                                <span className="text-xs font-semibold">{name}</span>
                                                <span className="text-[11px] opacity-70">.{name}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="grid content-start gap-2 sm:grid-cols-2">
                                        {appColors.map(color => (
                                            <div key={color.name} className="flex items-center gap-2 rounded-lg border border-border bg-background p-2">
                                                <span className="size-8 shrink-0 rounded-md border border-border" style={{ backgroundColor: `var(${color.color})` }} />
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-medium">{color.name}</p>
                                                    <p className="truncate text-xs text-muted-foreground">{color.color}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </DebugSection>
                        </div>

                        <aside className="flex min-w-0 flex-col gap-3">
                            <DebugSection icon={<IconBell />} title="Notifications" description="Exercises toast, notification center entries, promise resolution, and progress updates.">
                                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                                    <Button variant="secondary" onClick={() => pushNoti({ title: "Debug info", description: "Long informational notification from the debug page.", type: "info" })}>
                                        Info
                                    </Button>
                                    <Button variant="secondary" onClick={() => pushNoti({ title: "Debug warning", description: "Check warning icon and color.", type: "warning" })}>
                                        Warning
                                    </Button>
                                    <Button variant="secondary" onClick={() => pushNoti({ title: "Debug error", description: "Check destructive feedback.", type: "error" })}>
                                        Error
                                    </Button>
                                    <Button variant="secondary" onClick={() => pushNoti({ title: "Debug success", description: "Everything worked.", type: "success" })}>
                                        Success
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() =>
                                            pushNoti({
                                                title: "Promise resolved",
                                                description: "Completes after three seconds.",
                                                type: "promise",
                                                promise: new Promise(resolve => setTimeout(() => resolve(Result.accept("resolved")), 3000)),
                                                peek: "Loading resolve...",
                                                success: () => ({ title: "Promise resolved", description: "The simulated task succeeded." }),
                                                error: () => ({ title: "Promise failed", description: "The simulated task rejected." }),
                                            })
                                        }
                                    >
                                        Promise resolve
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() =>
                                            pushNoti({
                                                title: "Promise rejected",
                                                description: "Fails after three seconds.",
                                                type: "promise",
                                                promise: new Promise(resolve => setTimeout(() => resolve(Result.reject("Rejected by debug route")), 3000)),
                                                peek: "Loading reject...",
                                                success: () => ({ title: "Promise resolved", description: "The simulated task succeeded." }),
                                                error: error => ({ title: "Promise rejected", description: error }),
                                            })
                                        }
                                    >
                                        Promise reject
                                    </Button>
                                    <Button onClick={progressTest}>Progress notification</Button>
                                    <ButtonGroup>
                                        <Button variant="outline" onClick={() => setIsOpen(true)}>
                                            Mark center open
                                        </Button>
                                        <Button variant="outline" disabled={notifications.filter(n => n.type !== "promise").length === 0} onClick={clearAll}>
                                            Clear
                                        </Button>
                                    </ButtonGroup>
                                </div>
                            </DebugSection>

                            <DebugSection icon={<IconPhoto />} title="App-Specific Pieces" description="Custom components and dialogs that sit on top of the shared ui package.">
                                <div className="grid gap-3">
                                    <div className="grid *:col-1 *:row-1 overflow-hidden rounded-lg border border-border bg-muted">
                                        <div className="aspect-video bg-[linear-gradient(135deg,var(--color-sky-aqua),var(--color-watermelon))]" />
                                        <div className="flex items-center justify-center">
                                            <Button variant="outline" onClick={() => setAlbumDialogOpen(true)}>
                                                Open SelectAlbumDialog
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-center gap-2">
                                        <IconBox size="md">
                                            <IconFolder />
                                        </IconBox>
                                        <IconBox size="sm">
                                            <IconFolder />
                                        </IconBox>
                                        <IconBox size="xs">
                                            <IconFolder />
                                        </IconBox>
                                    </div>
                                    <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-3">
                                        <div>
                                            <p className="text-sm font-medium">Loading states</p>
                                            <p className="text-xs text-muted-foreground">Spinner and icon alignment</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Spinner />
                                            <Spinner className="size-5" />
                                        </div>
                                    </div>
                                    <KbdGroup>
                                        <Kbd>⌘</Kbd>
                                        <Kbd>Shift</Kbd>
                                        <Kbd>D</Kbd>
                                    </KbdGroup>
                                </div>
                            </DebugSection>

                            <DebugSection icon={<IconCheck />} title="Density and State Checks" description="Small utilities for catching spacing and text overflow problems.">
                                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                    {["rounded-sm", "rounded-md", "rounded-lg"].map(radius => (
                                        <div key={radius} className={"border border-border bg-background p-3 " + radius}>
                                            {radius}
                                        </div>
                                    ))}
                                </div>
                                <div className="rounded-lg border border-border bg-background p-3">
                                    <p className="text-sm font-medium">Very long label guard</p>
                                    <p className="mt-1 break-words text-xs text-muted-foreground">
                                        super-long-debug-token-that-should-wrap-without-breaking-the-panel-or-overlapping-neighboring-content
                                    </p>
                                </div>
                            </DebugSection>
                        </aside>
                    </div>
                </div>

                <SelectAlbumDialog open={albumDialogOpen} onOpenChange={setAlbumDialogOpen} />
            </div>
        </TooltipProvider>
    );
}

function DebugSection({ icon, title, description, children }: { icon: ReactNode; title: string; description: string; children: ReactNode }) {
    return (
        <section className="rounded-lg border border-border bg-background p-3">
            <div className="mb-3 flex items-start gap-2">
                <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground [&_svg]:size-4">{icon}</div>
                <div className="min-w-0">
                    <h2 className="text-sm font-semibold">{title}</h2>
                    <p className="text-xs text-muted-foreground">{description}</p>
                </div>
            </div>
            <div className="flex flex-col gap-3">{children}</div>
        </section>
    );
}

function PreviewBlock({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-card p-3">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground">{title}</h3>
            {children}
        </div>
    );
}
