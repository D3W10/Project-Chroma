import { useLocation, Link } from "@tanstack/react-router";
import { IconCircles, IconCirclesFilled, IconFolder, IconFolderFilled, IconLayoutGrid, IconLayoutGridFilled } from "@tabler/icons-react";
import { Button } from "@project-chroma/ui/button";
import { cn } from "@project-chroma/utils";

export function Sidebar({ collapsed }: { collapsed: boolean }) {
    const location = useLocation();

    const navItems = [
        { path: "/", label: "Library", icon: IconLayoutGrid, iconSelected: IconLayoutGridFilled },
        { path: "/albums", label: "Albums", icon: IconFolder, iconSelected: IconFolderFilled },
        { path: "/collections", label: "Collections", icon: IconCircles, iconSelected: IconCirclesFilled },
    ];

    return (
        <nav className={cn("w-28 h-full px-2 space-y-2 transition-[margin] duration-200", collapsed ? "-ml-28" : "")}>
            {navItems.map(item => {
                const isActive = item.path === "/" ? location.pathname === item.path : location.pathname.startsWith(item.path);
                const Icon = !isActive ? item.icon : item.iconSelected;

                return (
                    <Link key={item.path} to={item.path}>
                        <Button
                            variant="ghost"
                            className={cn(
                                "w-full h-auto px-2 py-3 flex-col gap-1 hover:bg-transparent",
                                !isActive ? "text-muted-foreground hover:bg-foreground/5" : "ring ring-input shadow-lg shadow-primary/15",
                            )}
                        >
                            <Icon className={cn("size-7", isActive ? "text-primary" : "")} />
                            <span className="text-sm">{item.label}</span>
                        </Button>
                    </Link>
                );
            })}
        </nav>
    );
}
