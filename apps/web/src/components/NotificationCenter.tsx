import { IconInfoCircle, IconX } from "@tabler/icons-react";
import { AnimatePresence, motion, useIsPresent } from "motion/react";
import { Button } from "@project-chroma/ui/button";
import { Progress } from "@project-chroma/ui/progress";
import { notiIcons } from "@project-chroma/ui/sonner";
import { cn } from "@project-chroma/utils";
import { IconBox } from "@/components/IconBox";
import { useNotifications } from "@/lib/useNotifications";
import type { Notification } from "@project-chroma/contracts/gallery";

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
                <Button variant="ghost" size="sm" className="h-7 px-2.5 text-xs" disabled={notifications.filter(n => n.type !== "promise").length === 0} onClick={clearAll}>
                    Clear all
                </Button>
            </div>
            <div className={cn("max-h-120 overflow-x-hidden", notifications.length < 2 ? "overflow-y-hidden" : "overflow-y-auto")}>
                <div className="pb-2">
                    <AnimatePresence initial={false} mode="popLayout">
                        {notifications.length > 0 ? (
                            notifications.map((noti, i) => <NotificationItem key={noti.id} notification={noti} i={i} />)
                        ) : (
                            <motion.div
                                initial={{ height: 0, paddingBlock: 0, opacity: 0 }}
                                animate={{ height: 120, paddingBlock: "calc(var(--spacing) * 6)", opacity: 1 }}
                                transition={{ duration: 0.2 }}
                                className="w-full flex flex-col justify-center items-center gap-3"
                            >
                                <IconBox size="xs">
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

function NotificationItem({ notification, i }: { notification: Notification; i: number }) {
    const isPresent = useIsPresent();
    const { clearNoti } = useNotifications();

    const nProgress = notification.progress * 100;

    return (
        <motion.div
            layout
            animate={{ x: 0, opacity: 1, marginTop: i ? 4 : 0 }}
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
            className="p-2 flex flex-col gap-1 hover:bg-muted/40 rounded-lg group transition-colors"
        >
            <div className="w-full flex items-center gap-2.5">
                {notiIcons[notification.type]}
                <div className="-mt-0.5 flex gap-1 items-center flex-1">
                    <h4 className="flex-1 text-sm font-medium">{notification.title}</h4>
                    <div className="flex justify-end items-center relative">
                        <span className={"text-2xs text-muted-foreground whitespace-nowrap transition-opacity" + (notification.type !== "promise" ? " group-hover:opacity-0" : "")}>
                            {formatTimestamp(notification.timestamp)}
                        </span>
                        {isPresent && notification.type !== "promise" && (
                            <Button
                                variant="ghost"
                                size="icon-2xs"
                                className="absolute -top-0.5 -right-0.5 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 z-1"
                                onClick={() => clearNoti(notification.id)}
                            >
                                <IconX />
                            </Button>
                        )}
                    </div>
                </div>
            </div>
            {notification.description && <p className="pl-7 text-xs text-secondary-foreground line-clamp-5">{notification.description}</p>}
            {notification.type === "promise" && notification.hasProgress && (
                <div className="mt-1 pl-7 flex items-center gap-2">
                    <Progress value={nProgress} className="flex-1" />
                    <p className="w-8 text-2xs text-muted-foreground text-right font-semibold">{Number.isInteger(nProgress) ? nProgress.toString() : nProgress.toFixed(1)}%</p>
                </div>
            )}
        </motion.div>
    );
}
