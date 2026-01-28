import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { animate } from "@/components/animated";
import { AppMockup } from "@/components/custom/AppMockup";
import { OnboardingLayout } from "@/components/layout/onboardingLayout";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import { Slider } from "@/components/ui/slider";
import { defaultSettings, useSettings } from "@/lib/useSettings";
import { IconReload } from "@tabler/icons-react";

export const Route = createFileRoute("/onboarding/customize")({
    component: RouteComponent,
});

function RouteComponent() {
    const { settings, updateSettings } = useSettings();
    const navigate = useNavigate();

    return (
        <OnboardingLayout>
            <div className="w-full space-y-6">
                <animate.h1 className="text-xl font-bold" delay={0.5}>First, let&apos;s customize your app experience</animate.h1>
                <FieldSet className="w-full">
                    <FieldGroup>
                        <animate.div delay={0.65}>
                            <Field>
                                <FieldLabel htmlFor="appTheme">Theme</FieldLabel>
                                <div id="appTheme" className="w-fit! p-0.5 flex gap-0.5 rounded-lg ring-1 ring-input/75">
                                    <Button variant={settings.theme === "dark" ? "default" : "ghost"} onClick={() => updateSettings({ theme: "dark" })}>Dark mode</Button>
                                    <Button variant={settings.theme === "light" ? "default" : "ghost"} onClick={() => updateSettings({ theme: "light" })}>Light mode</Button>
                                </div>
                            </Field>
                        </animate.div>
                        <animate.div delay={0.8}>
                            <Field>
                                <FieldLabel htmlFor="appColor">Accent color</FieldLabel>
                                <div id="appColor" className="flex gap-2">
                                    <Slider defaultValue={[defaultSettings.accentColor]} min={0} max={16} step={1} value={[settings.accentColor]} onValueChange={v => updateSettings({ accentColor: v[0] })} />
                                    <Button variant="ghost" size="icon" disabled={settings.accentColor === defaultSettings.accentColor} onClick={() => updateSettings({ accentColor: defaultSettings.accentColor })}>
                                        <IconReload />
                                    </Button>
                                </div>
                            </Field>
                        </animate.div>
                    </FieldGroup>
                </FieldSet>
                <animate.div className="w-full px-12 py-8 bg-secondary/50 rounded-xl" delay={0.95}>
                    <AppMockup />
                </animate.div>
            </div>
            <animate.div className="w-full flex justify-end" delay={1.45}>
                <Button className="w-24" onClick={() => navigate({ to: "/onboarding/requirements", viewTransition: { types: ["slide-left"] } })}>Next</Button>
            </animate.div>
        </OnboardingLayout>
    );
}