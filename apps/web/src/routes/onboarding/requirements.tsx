import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { animate } from "@/components/animated";
import { OnboardingLayout } from "@/components/layout/onboardingLayout";
import { Button } from "@project-chroma/ui/button";
import { Table, TableCell, TableHead, TableHeader, TableRow, TableBody } from "@project-chroma/ui/table";
import { useSettings } from "@/lib/useSettings";

export const Route = createFileRoute("/onboarding/requirements")({
    component: RouteComponent,
});

function RouteComponent() {
    const navigate = useNavigate();
    const { updateSettings } = useSettings();

    function handleNext() {
        updateSettings({ configured: true });
        navigate({ to: "/onboarding/library", viewTransition: { types: ["slide-left"] } });
    }

    return (
        <OnboardingLayout>
            <div className="w-full space-y-6">
                <animate.h1 className="text-xl font-bold" delay={0.5}>
                    Bundled tools
                </animate.h1>
                <div className="flex flex-col items-center gap-4">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Feature</TableHead>
                                <TableHead>Required</TableHead>
                                <TableHead>Current</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell>libheif</TableCell>
                                <TableCell>Yes</TableCell>
                                <TableCell>Yes</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>ffmpeg/ffprobe</TableCell>
                                <TableCell>Yes</TableCell>
                                <TableCell>Yes</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
                <p className="text-sm text-muted-foreground">ffmpeg and ffprobe are bundled with the app as sidecar binaries. No system install is required.</p>
            </div>
            <animate.div className="w-full flex justify-end gap-2" delay={1.3}>
                <Button
                    className="w-18"
                    variant="secondary"
                    onClick={() =>
                        navigate({
                            to: "/onboarding/customize",
                            viewTransition: { types: ["slide-right"] },
                        })
                    }
                >
                    Back
                </Button>
                <Button className="w-24" onClick={handleNext}>
                    Next
                </Button>
            </animate.div>
        </OnboardingLayout>
    );
}
