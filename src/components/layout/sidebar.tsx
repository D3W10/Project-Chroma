import { useLocation, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Album24Filled, Album24Regular, Heart24Filled, Heart24Regular, Image24Filled, Image24Regular } from "@fluentui/react-icons";

export function Sidebar() {
    const location = useLocation();

    const navItems = [
        { path: "/", label: "Photos", icon: Image24Regular, iconSelected: Image24Filled },
        { path: "/albums", label: "Albums", icon: Album24Regular, iconSelected: Album24Filled },
        { path: "/favorites", label: "Favorites", icon: Heart24Regular, iconSelected: Heart24Filled },
    ];

    return (
        <nav className="w-28 h-full px-2 space-y-2">
            {navItems.map(item => {
                const isActive = location.pathname === item.path;
                const Icon = !isActive ? item.icon : item.iconSelected;

                return (
                    <Link key={item.path} to={item.path}>
                        <Button
                            variant={isActive ? "outline" : "ghost"}
                            className="w-full h-auto py-3 flex-col gap-1"
                        >
                            <Icon className={"size-7 " + (isActive ? "text-primary" : "text-muted-foreground")} />
                            <span className={"text-sm " + (isActive ? "text-foreground" : "text-muted-foreground")}>{item.label}</span>
                        </Button>
                    </Link>
                );
            })}
        </nav>
    );
}