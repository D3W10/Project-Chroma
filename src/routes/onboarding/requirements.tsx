import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { animate } from "@/components/animated";
import { OnboardingLayout } from "@/components/layout/onboardingLayout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/onboarding/requirements")({
    component: RouteComponent,
});

function RouteComponent() {
    const navigate = useNavigate();

    return (
        <OnboardingLayout>
            <div className="w-full space-y-6">
                <animate.h1 className="text-xl font-bold" delay={0.5}>Install required software</animate.h1>
            </div>
            <animate.div className="w-full flex justify-end gap-2" delay={1.3}>
                <Button className="w-18" variant="outline" onClick={() => navigate({ to: "/onboarding/customize", viewTransition: { types: ["slide-right"] } })}>Back</Button>
                <Button className="w-24" onClick={() => navigate({ to: "/onboarding/library", viewTransition: { types: ["slide-left"] } })}>Next</Button>
            </animate.div>
        </OnboardingLayout>
    );
}