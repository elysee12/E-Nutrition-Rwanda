import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/web/TopBar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download, Search, ScrollText } from "lucide-react";

export const Route = createFileRoute("/web/audit")({
  head: () => ({ meta: [{ title: "Audit Log — E-Nutrition Rwanda" }] }),
  component: Audit,
});

const events = [
  { time: "2026-05-30 14:22", actor: "data-manager · I. Claire", target: "user:U-014", action: "create", detail: "Created nurse account · Remera HC", sev: "info" },
  { time: "2026-05-30 13:48", actor: "nurse · P. Habimana", target: "child:ENR-00143", action: "update", detail: "Edited locked record — flagged for review", sev: "danger" },
  { time: "2026-05-30 12:14", actor: "admin · E. Kagame", target: "facility:FAC-007", action: "create", detail: "Added facility 'Kabgayi DH'", sev: "info" },
  { time: "2026-05-30 11:02", actor: "system", target: "dhis2", action: "sync", detail: "DHIS2 push completed (1,248 records)", sev: "info" },
  { time: "2026-05-30 10:18", actor: "admin · E. Kagame", target: "user:U-007", action: "suspend", detail: "Suspended CHW account (inactivity)", sev: "warn" },
  { time: "2026-05-30 09:55", actor: "data-manager · I. Claire", target: "user:U-013", action: "create", detail: "Registered CHW · Niboye Sector", sev: "info" },
  { time: "2026-05-30 08:31", actor: "system", target: "dhis2", action: "sync", detail: "DHIS2 push delayed (retrying)", sev: "warn" },
  { time: "2026-05-29 17:40", actor: "admin · E. Kagame", target: "role:Admin", action: "grant", detail: "Granted Admin role to user U-006", sev: "danger" },
  { time: "2026-05-29 16:12", actor: "nurse · E. Mukamana", target: "referral:REF-2045", action: "create", detail: "Created referral → Kibagabaga DH", sev: "info" },
];

function sevTone(s: string) {
  if (s === "danger") return "bg-destructive";
  if (s === "warn") return "bg-[color:var(--warning)]";
  return "bg-[color:var(--info)]";
}

function Audit() {
  return (
    <>
      <TopBar title="Audit log" subtitle="Immutable record of every system event — for compliance and oversight" />
      <div className="p-6 space-y-5">
        <div className="grid gap-4 sm:grid-cols-4">
          <Stat label="Events today" value="284" />
          <Stat label="Security-sensitive" value="6" tone="text-destructive" />
          <Stat label="Admin actions" value="42" />
          <Stat label="System events" value="156" />
        </div>

        <Card className="overflow-hidden">
          <div className="p-4 border-b border-border flex items-center gap-3 flex-wrap">
            <ScrollText className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm flex-1">All events</h3>
            <div className="flex items-center gap-2 rounded-lg border border-input bg-card px-3 w-72">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by actor or target…" className="border-0 shadow-none focus-visible:ring-0 px-0 h-9 bg-transparent" />
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All severities</SelectItem>
                <SelectItem value="danger">Critical</SelectItem>
                <SelectItem value="warn">Warning</SelectItem>
                <SelectItem value="info">Info</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2"><Download className="h-4 w-4" /> Export CSV</Button>
          </div>
          <div className="divide-y divide-border">
            {events.map((e, i) => (
              <div key={i} className="grid grid-cols-[180px_1fr_120px_1fr] items-center gap-3 px-4 py-3 text-sm">
                <span className="text-[11px] font-mono text-muted-foreground">{e.time}</span>
                <span className="font-medium truncate">{e.actor}</span>
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{e.action}</span>
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`h-2 w-2 rounded-full shrink-0 ${sevTone(e.sev)}`} />
                  <span className="text-foreground/85 truncate">{e.detail}</span>
                  <span className="text-[11px] text-muted-foreground font-mono ml-auto shrink-0">{e.target}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <Card className="p-5">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-2xl font-semibold mt-1.5 ${tone ?? ""}`}>{value}</div>
    </Card>
  );
}
