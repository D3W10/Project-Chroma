import { useLocation, Link } from "@tanstack/react-router";
import { Album24Filled, Album24Regular, Heart24Filled, Heart24Regular, Image24Filled, Image24Regular } from "@fluentui/react-icons";
import { Button } from "@/components/ui/button";

export function Sidebar({ collapsed }: { collapsed: boolean }) {
    const location = useLocation();

    const navItems = [
        { path: "/", label: "Library", icon: Image24Regular, iconSelected: Image24Filled },
        { path: "/albums", label: "Albums", icon: Album24Regular, iconSelected: Album24Filled },
        { path: "/favorites", label: "Favorites", icon: Heart24Regular, iconSelected: Heart24Filled },
    ];

    return (
        <nav className={`w-28 h-full ${collapsed ? "-ml-28" : ""} px-2 space-y-2 transition-[margin] duration-200`}>
            {navItems.map(item => {
                const isActive = location.pathname === item.path;
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