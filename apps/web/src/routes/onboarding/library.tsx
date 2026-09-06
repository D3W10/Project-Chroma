import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@project-chroma/ui/button";
import { Spinner } from "@project-chroma/ui/spinner";
import { animate } from "@/components/animated";
import { useLibraryCreate, LibraryCreate } from "@/components/LibraryCreate";
import { OnboardingLayout } from "@/components/layout/onboardingLayout";
import { AddLibraryDialog } from "@/components/overlays/AddLibraryDialog";
import { useExistingLibraryImport } from "@/lib/useExistingLibraryImport";

export const Route = createFileRoute("/onboarding/library")({
    component: RouteComponent,
});

function RouteComponent() {
    const libCreate = useLibraryCreate();
    const { isAddLibraryOpen, libraryToAdd, selectExistingLibrary, setIsAddLibraryOpen } = useExistingLibraryImport();
    const navigate = Route.useNavigate();

    return (
        <OnboardingLayout>
            <div className="w-full space-y-2">
                <animate.h1 className="text-xl font-bold" delay={0.5}>
                    Let&apos;s set up your first library
                </animate.h1>
                <div className="flex flex-col items-center gap-6">
                    <animate.span className="text-sm text-muted-foreground" delay={0.5}>
                        A library is where you store all your photos, videos and albums. You may create multiple libraries if you want to store items on different locations
                    </animate.span>
                    <LibraryCreate state={libCreate} beAnimated />
                </div>
            </div>
            <animate.div className="w-full flex justify-between gap-2" delay={1.6}>
                <Button variant="secondary" disabled={libCreate.isProcessing} onClick={selectExistingLibrary}>
                    Import Existing
                </Button>
                <Button className="w-24" disabled={!libCreate.isValid || libCreate.isProcessing} onClick={() => libCreate.create(() => navigate({ to: "/" }))}>
                    <span className={libCreate.isProcessing ? "opacity-0" : ""}>Next</span>
                    <Spinner className={`absolute ${!libCreate.isProcessing ? "opacity-0" : "opacity-100"}`} />
                </Button>
            </animate.div>
            <AddLibraryDialog library={libraryToAdd} open={isAddLibraryOpen} onOpenChange={setIsAddLibraryOpen} onAdded={() => navigate({ to: "/" })} />
        </OnboardingLayout>
    );
}
