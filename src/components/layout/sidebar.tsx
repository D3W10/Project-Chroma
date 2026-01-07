import { useLocation, Link } from "@tanstack/react-router";
import { IconCircles, IconCirclesFilled, IconFolder, IconFolderFilled, IconLayoutGrid, IconLayoutGridFilled } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";

export function Sidebar({ collapsed }: { collapsed: boolean }) {
    const location = useLocation();

    const navItems = [
        { path: "/", label: "Library", icon: IconLayoutGrid, iconSelected: IconLayoutGridFilled },
        { path: "/albums", label: "Albums", icon: IconFolder, iconSelected: IconFolderFilled },
        { path: "/collections", label: "Collections", icon: IconCircles, iconSelected: IconCirclesFilled },
    ];

    return (
        <nav className={`w-28 h-full ${collapsed ? "-ml-28" : ""} px-2 space-y-2 transition-[margin] duration-200`}>
            {navItems.map(item => {
                const isActive = item.path === "/" ? location.pathname === item.path : location.pathname.startsWith(item.path);
                const Icon = !isActive ? item.icon : item.iconSelected;

                return (
                    <Link key={item.path} to={item.path}>
                        <Button variant={isActive ? "outline" : "ghost"} className={`w-full h-auto py-3 flex-col gap-1 ${!isActive ? "text-muted-foreground" : "shadow-sm"}`}>
                            <Icon className={`size-7 ${isActive ? "text-primary" : ""}`} />
                            <span className="text-sm">{item.label}</span>
                        </Button>
                    </Link>
                );
            })}
        </nav>
    );
}