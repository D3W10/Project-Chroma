import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Phone48Filled } from "@fluentui/react-icons";
import { motion } from "motion/react";
import { animate } from "@/components/animated";
import { CenterLayout } from "@/components/layout/centerLayout";
import { Button } from "@/components/ui/button";
import { QUICK_EASE } from "@/lib/utils";

export const Route = createFileRoute("/onboarding/")({
    component: RouteComponent,
});

function RouteComponent() {
    const navigate = useNavigate();

    return (
        <CenterLayout className="items-center [view-transition-name:onboarding-content]">
            <div className="w-full mb-10 flex flex-col items-center text-center">
                <motion.img
                    src="/logo.svg"
                    className="size-32 mb-10"
                    initial={{ opacity: 0, rotate: 120 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    transition={{
                        opacity: { duration: 1.2, ease: "easeOut", delay: 0.5 },
                        rotate: { duration: 2, ease: [0.33, 1, 0.68, 1], delay: 0.5 },
                    }}
                />
                <motion.h1
                    className="text-3xl font-bold mb-2"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: QUICK_EASE, delay: 2.5 }}
                >
                    Welcome to Project Chroma
                </motion.h1>
                <motion.h2
                    className="text-muted-foreground font-medium"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: QUICK_EASE, delay: 2.8 }}
                >
                    A photo library app that helps you organize your photos
                </motion.h2>
            </div>
            <div className="w-full mb-12 space-y-6">
                <animate.div className="w-full flex items-center gap-2" delay={3.8}>
                    <Phone48Filled />
                    <div className="flex-1 space-y-1">
                        <h3 className="font-bold">Test 1</h3>
                        <p className="text-sm text-muted-foreground font-medium">Testing the subtitles</p>
                    </div>
                </animate.div>
                <animate.div className="w-full flex items-center gap-2" delay={4.1}>
                    <Phone48Filled />
                    <div className="flex-1 space-y-1">
                        <h3 className="font-bold">Test 2</h3>
                        <p className="text-sm text-muted-foreground font-medium">Testing the subtitles</p>
                    </div>
                </animate.div>
                <animate.div className="w-full flex items-center gap-2" delay={4.4}>
                    <Phone48Filled />
                    <div className="flex-1 space-y-1">
                        <h3 className="font-bold">Easy import from iPhone/iPad</h3>
                        <p className="text-sm text-muted-foreground font-medium">Easily import the photos from your iPhone and iPad with full resolution and metadata</p>
                    </div>
                </animate.div>
            </div>
            <animate.div className="w-1/3" delay={5.4}>
                <Button className="w-full" onClick={() => navigate({ to: "/onboarding/customize", viewTransition: { types: ["slide-left"] } })}>Get Started</Button>
            </animate.div>
        </CenterLayout>
    );
}