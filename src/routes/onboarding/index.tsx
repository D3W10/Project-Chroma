import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Phone48Filled } from "@fluentui/react-icons";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/onboarding/")({
    component: RouteComponent,
});

function RouteComponent() {
    const navigate = useNavigate();

    return (
        <main className="flex flex-col justify-center items-center flex-1">
            <div className="max-w-md flex flex-col items-center gap-10">
                <div className="w-full flex flex-col items-center text-center">
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
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 2.5 }}
                    >
                        Welcome to Project Chroma
                    </motion.h1>
                    <motion.h2
                        className="text-muted-foreground font-medium"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 2.8 }}
                    >
                        A photo library app that helps you organize your photos
                    </motion.h2>
                </div>
                <div className="w-full space-y-6">
                    <motion.div
                        className="w-full flex items-center gap-2"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 3.8 }}
                    >
                        <Phone48Filled />
                        <div className="space-y-1">
                            <h3 className="font-bold">Test 1</h3>
                            <p className="text-sm">Testing the subtitles</p>
                        </div>
                    </motion.div>
                    <motion.div
                        className="w-full flex items-center gap-2"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 4.1 }}
                    >
                        <Phone48Filled />
                        <div className="space-y-1">
                            <h3 className="font-bold">Test 2</h3>
                            <p className="text-sm">Testing the subtitles</p>
                        </div>
                    </motion.div>
                    <motion.div
                        className="w-full flex items-center gap-2"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 4.4 }}
                    >
                        <Phone48Filled />
                        <div className="space-y-1">
                            <h3 className="font-bold">Test 3</h3>
                            <p className="text-sm">Testing the subtitles</p>
                        </div>
                    </motion.div>
                </div>
                <Button className="w-1/3" onClick={() => navigate({ to: "/onboarding/customize" })}>Get Started</Button>
            </div>
        </main>
    );
}