import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Save, UserPlus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TopBar } from "@/components/web/TopBar";
import { LocationPicker, type LocationValue } from "@/components/LocationPicker";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/web/children/new")({
  head: () => ({ meta: [{ title: "Register child — E-Nutrition Rwanda" }] }),
  component: NewChild,
});

function NewChild() {
  const [loc, setLoc] = useState<LocationValue>({});
  return (
    <>
      <TopBar title="Register new child" subtitle="Capture caregiver, location and baseline anthropometrics" />
      <div className="p-6 space-y-5 max-w-5xl">
        <Link to="/web/children" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> Back to registry
        </Link>

        <Card className="p-6 space-y-5">
          <div className="flex items-center gap-3 pb-1">
            <div className="grid place-items-center h-9 w-9 rounded-lg bg-[color:var(--primary-soft)] text-primary"><UserPlus className="h-4 w-4" /></div>
            <div>
              <h3 className="font-semibold text-sm">Child information</h3>
              <p className="text-xs text-muted-foreground">Required fields are marked with *</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Full name *"><Input placeholder="e.g. Iradukunda Aline" /></Field>
            <Field label="Sex *">
              <Select><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent><SelectItem value="F">Female</SelectItem><SelectItem value="M">Male</SelectItem></SelectContent>
              </Select>
            </Field>
            <Field label="Date of birth *"><Input type="date" /></Field>
            <Field label="Auto-generated ID"><Input value="ENR-00150" readOnly className="font-mono text-xs bg-muted" /></Field>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <div>
            <h3 className="font-semibold text-sm">Location</h3>
            <p className="text-xs text-muted-foreground">Cascading from province down to sector (catchment level)</p>
          </div>
          <LocationPicker value={loc} onChange={setLoc} maxLevel="sector" />
          {loc.sector && (
            <div className="text-xs text-muted-foreground border border-dashed border-border rounded-lg p-3 bg-muted/40">
              Resolved: <span className="text-foreground font-medium">{loc.sector}, {loc.district}, {loc.province} Province</span>
            </div>
          )}
        </Card>

        <Card className="p-6 space-y-5">
          <div>
            <h3 className="font-semibold text-sm">Caregiver</h3>
            <p className="text-xs text-muted-foreground">Primary contact for follow-up & SMS reminders</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Caregiver name *"><Input placeholder="Mukamana Esther" /></Field>
            <Field label="Relationship">
              <Select><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mother">Mother</SelectItem>
                  <SelectItem value="father">Father</SelectItem>
                  <SelectItem value="guardian">Guardian</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Phone number *"><Input placeholder="+250 7…" /></Field>
            <Field label="Caregiver national ID"><Input placeholder="1 1990 8 ..." /></Field>
          </div>
        </Card>

        <Card className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm">Baseline anthropometrics</h3>
              <p className="text-xs text-muted-foreground">WHO z-scores will be auto-calculated</p>
            </div>
            <Badge variant="outline" className="text-[10px]">Auto-classified</Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <Field label="Weight (kg) *"><Input type="number" step="0.1" placeholder="7.2" /></Field>
            <Field label="Height / Length (cm) *"><Input type="number" step="0.1" placeholder="71.0" /></Field>
            <Field label="MUAC (cm) *"><Input type="number" step="0.1" placeholder="11.8" /></Field>
            <Field label="Oedema">
              <Select><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="plus">+</SelectItem>
                  <SelectItem value="plus2">++</SelectItem>
                  <SelectItem value="plus3">+++</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button variant="outline">Save as draft</Button>
          <Button className="gap-2"><Save className="h-4 w-4" /> Register child</Button>
        </div>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}