import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { IconDeviceMobile, IconFolder, IconLayoutGrid } from "@tabler/icons-react";
import { animate } from "@/components/animated";
import { OnboardingLayout } from "@/components/layout/onboardingLayout";
import { Button } from "@project-chroma/ui/button";

export const Route = createFileRoute("/onboarding/")({
    component: RouteComponent,
});

function RouteComponent() {
    const navigate = useNavigate();

    return (
        <OnboardingLayout className="gap-10 absolute">
            <div className="w-full flex lg:flex-col items-center gap-8 lg:text-center">
                <animate.img
                    src="/logo.svg"
                    className="size-24"
                    initial={{ opacity: 0, rotate: 120 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    transition={{
                        opacity: { duration: 1.2, ease: "easeOut", delay: 0.5 },
                        rotate: { duration: 2, ease: [0.33, 1, 0.68, 1], delay: 0.5 },
                    }}
                />
                <div className="space-y-2">
                    <animate.h1
                        className="text-2xl lg:text-3xl font-bold"
                        initial={{ opacity: 0, y: 12 }}
                        delay={2.5}
                    >
                        Welcome to Project Chroma
                    </animate.h1>
                    <animate.h2
                        className="text-muted-foreground font-medium"
                        initial={{ opacity: 0, y: 10 }}
                        delay={2.8}
                    >
                        A photo library that helps you organize your memories
                    </animate.h2>
                </div>
            </div>
            <div className="w-full space-y-6">
                <animate.div className="w-full flex items-center gap-4" delay={3.8}>
                    <IconLayoutGrid size={48} className="text-secondary-foreground" />
                    <div className="flex-1 space-y-1">
                        <h3 className="font-bold">Flexible Grid View</h3>
                        <p className="text-sm text-muted-foreground font-medium">Browse and manage your collection with tools like sort, filter and search</p>
                    </div>
                </animate.div>
                <animate.div className="w-full flex items-center gap-4" delay={4.1}>
                    <IconFolder size={48} className="text-secondary-foreground" />
                    <div className="flex-1 space-y-1">
                        <h3 className="font-bold">Organize with nested albums</h3>
                        <p className="text-sm text-muted-foreground font-medium">Organize your photos/videos in albums which can be nested like folders</p>
                    </div>
                </animate.div>
                <animate.div className="w-full flex items-center gap-4" delay={4.4}>
                    <IconDeviceMobile size={48} className="text-secondary-foreground" />
                    <div className="flex-1 space-y-1">
                        <h3 className="font-bold">Easy import from iPhone/iPad</h3>
                        <p className="text-sm text-muted-foreground font-medium">Easily import the photos/videos from your iPhone/iPad with full resolution and metadata</p>
                    </div>
                </animate.div>
            </div>
            <animate.div className="flex justify-center" delay={5.4}>
                <Button className="w-32" onClick={() => navigate({ to: "/onboarding/customize", viewTransition: { types: ["slide-left"] } })}>Get Started</Button>
            </animate.div>
        </OnboardingLayout>
    );
}