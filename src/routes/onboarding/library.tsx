import { createFileRoute } from "@tanstack/react-router";
import { animate } from "@/components/animated";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useLibraryCreate, LibraryCreate } from "@/components/custom/LibraryCreate";
import { OnboardingLayout } from "@/components/layout/onboardingLayout";

export const Route = createFileRoute("/onboarding/library")({
    component: RouteComponent,
});

function RouteComponent() {
    const libCreate = useLibraryCreate();
    const navigate = Route.useNavigate();

    return (
        <OnboardingLayout>
            <div className="w-full space-y-4">
                <animate.h1 className="text-xl font-bold" delay={0.5}>Let&apos;s create your first library</animate.h1>
                <div className="flex flex-col items-center gap-4">
                    <animate.span className="text-sm text-muted-foreground" delay={0.5}>A library is where you store all your photos, videos and albums. You may create multiple libraries if you want to store items on different locations</animate.span>
                    <LibraryCreate state={libCreate} beAnimated />
                </div>
            </div>
            <animate.div className="w-full flex justify-end gap-2" delay={1.6}>
                <Button className="w-24" disabled={!libCreate.isValid || libCreate.isProcessing} onClick={() => libCreate.create(() => navigate({ to: "/" }))}>
                    <span className={libCreate.isProcessing ? "opacity-0" : ""}>Next</span>
                    <Spinner className={`absolute ${!libCreate.isProcessing ? "opacity-0" : "opacity-100"}`} />
                </Button>
            </animate.div>
        </OnboardingLayout>
    );
}