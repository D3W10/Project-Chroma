import { IconInfoCircle, IconX } from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { IconBox } from "@/components/custom/IconBox";
import { cn, getNotiIcon } from "@/lib/utils";
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

    return (
        <div className="w-full px-2 pt-2.5 pb-0">
            <div className="mb-1 pl-2 pr-0.5 flex justify-between items-center">
                <h3 className="font-semibold">Notifications</h3>
                <Button variant="ghost" size="sm" className="h-7 px-2.5 text-xs" disabled={notifications.filter(n => n.type !== "promise").length === 0} onClick={clearAll}>Clear all</Button>
            </div>
            <div className={cn("max-h-120 overflow-x-hidden", notifications.length < 2 ? "overflow-y-hidden" : "overflow-y-auto")}>
                <div className="pb-2">
                    <AnimatePresence initial={false} mode="popLayout">
                        {notifications.length > 0 ? (
                            notifications.map(noti => <NotificationItem key={noti.id} notification={noti} />)
                        ) : (
                            <motion.div
                                initial={{ height: 0, paddingBlock: 0, opacity: 0 }}
                                animate={{ height: 120, paddingBlock: "calc(var(--spacing) * 6)", opacity: 1 }}
                                transition={{ duration: 0.2 }}
                                className="w-full flex flex-col justify-center items-center gap-3"
                            >
                                <IconBox size="small">
                                    <IconInfoCircle />
                                </IconBox>
                                <p className="text-sm text-center text-muted-foreground">No notifications yet</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

function NotificationItem({ notification }: { notification: Notification }) {
    const { clearNoti } = useNotifications();

    const nProgress = notification.progress * 100;

    return (
        <motion.div
            layout
            animate={{ opacity: 1, x: 0, height: "auto", marginTop: 4 }}
            exit={{
                x: "100%",
                opacity: 0,
                height: 0,
                marginTop: 0,
                paddingTop: 0,
                paddingBottom: 0,
                overflow: "hidden",
            }}
            transition={{ duration: 0.2 }}
            className="px-2 pt-1.5 pb-2 flex flex-col gap-1 hover:bg-foreground/3 rounded-sm group transition-colors"
        >
            <div className="w-full flex items-center gap-2">
                {getNotiIcon(notification.type)}
                <div className="flex gap-1 items-center flex-1">
                    <h4 className="flex-1 text-sm font-medium">{notification.title}</h4>
                    <div className="grid justify-items-end items-center *:col-1 *:row-1">
                        <span className={"text-xs text-secondary-foreground whitespace-nowrap transition-opacity" + (notification.type !== "promise" ? " group-hover:opacity-0" : "")}>{formatTimestamp(notification.timestamp)}</span>
                        {notification.type !== "promise" && (
                            <Button variant="ghost" size="icon-xs" className="opacity-0 group-hover:opacity-100 z-1" onClick={() => clearNoti(notification.id)}>
                                <IconX />
                            </Button>
                        )}
                    </div>
                </div>
            </div>
            {notification.description && (
                <p className="pl-6.5 text-xs text-muted-foreground line-clamp-5">{notification.description}</p>
            )}
            {notification.type === "promise" && notification.hasProgress && (
                <div className="mt-2">
                    <Progress value={nProgress} />
                    <p className="mt-1 text-xs text-muted-foreground">{Number.isInteger(nProgress) ? nProgress.toString() : nProgress.toFixed(1)}%</p>
                </div>
            )}
        </motion.div>
    );
}