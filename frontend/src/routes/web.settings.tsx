import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/web/TopBar";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/web/settings")({
  head: () => ({ meta: [{ title: "Settings — E-Nutrition Rwanda" }] }),
  component: Settings,
});

function Settings() {
  return (
    <>
      <TopBar title="Settings" subtitle="Profile, preferences and security" />
      <div className="p-6 grid gap-5 max-w-4xl">
        <Card className="p-6 space-y-4">
          <h3 className="font-semibold text-sm">Profile</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label className="text-xs">Full name</Label><Input defaultValue="Dr. Mukamana Esther" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Email</Label><Input defaultValue="emukamana@moh.gov.rw" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Role</Label><Input defaultValue="Nutritionist" readOnly className="bg-muted" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Facility</Label><Input defaultValue="Remera Health Center" /></div>
          </div>
        </Card>
        <Card className="p-6 space-y-4">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {[
            ["Critical SAM alerts", true],
            ["Missed follow-ups", true],
            ["Weekly performance digest", false],
            ["DHIS2 sync errors", true],
          ].map(([l, v]) => (
            <div key={l as string} className="flex items-center justify-between border-b border-border pb-3 last:border-0">
              <span className="text-sm">{l as string}</span>
              <Switch defaultChecked={v as boolean} />
            </div>
          ))}
        </Card>
        <div className="flex justify-end"><Button>Save changes</Button></div>
      </div>
    </>
  );
}