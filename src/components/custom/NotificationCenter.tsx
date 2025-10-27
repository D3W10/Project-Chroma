import { Dismiss12Regular, Info24Regular } from "@fluentui/react-icons";
import { animate } from "@/components/animated";
import { Button } from "@/components/ui/button";
import { IconBox } from "@/components/custom/IconBox";
import { getNotiIcon } from "@/lib/utils";
import { useNotifications } from "@/lib/useNotifications";
import type { Notification } from "@/lib/models";

function formatTimestamp(timestamp: Date): string {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return timestamp.toLocaleDateString();
}

export function NotificationCenter() {
    const { notifications, clearAll } = useNotifications();

    if (notifications.length === 0) {
        return (
            <div className="w-full py-6 flex flex-col items-center">
                <IconBox size="small" className="mb-4">
                    <Info24Regular />
                </IconBox>
                <animate.p className="text-sm text-center text-muted-foreground" delay={0.35}>No notifications yet</animate.p>
            </div>
        );
    }

    return (
        <div className="w-full px-2 pt-2.5 pb-0">
            <div className="mb-1 pl-2 pr-0.5 flex justify-between items-center">
                <h3 className="font-semibold">Notifications</h3>
                <Button variant="ghost" size="sm" className="h-7 px-2.5 text-xs" onClick={clearAll}>Clear all</Button>
            </div>
            <div className="max-h-120 overflow-y-auto">
                <div className="pb-2 space-y-1">
                    {notifications.map(noti => <NotificationItem key={noti.id} notification={noti} />)}
                </div>
            </div>
        </div>
    );
}

function NotificationItem({ notification }: { notification: Notification }) {
    const { clearNoti } = useNotifications();

    return (
        <div className="py-2 pl-1.5 pr-2 flex gap-2 hover:bg-muted rounded-sm group transition-colors">
            {getNotiIcon(notification.type)}
            <div className="flex-1">
                <div className="flex justify-between gap-2">
                    <h4 className="text-sm font-medium">{notification.title}</h4>
                    <div className="relative text-muted-foreground">
                        <span className="absolute right-1 text-xs group-hover:opacity-0 whitespace-nowrap transition-opacity">{formatTimestamp(notification.timestamp)}</span>
                        <Dismiss12Regular className="absolute right-0 hover:text-foreground opacity-0 group-hover:opacity-100 cursor-pointer transition" onClick={() => clearNoti(notification.id)} />
                    </div>
                </div>
                {notification.description && (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-5">{notification.description}</p>
                )}
            </div>
        </div>
    );
}