import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/web/TopBar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Database, RefreshCw, Server, Wifi } from "lucide-react";

export const Route = createFileRoute("/web/integrations")({
  head: () => ({ meta: [{ title: "DHIS2 / HMIS — E-Nutrition Rwanda" }] }),
  component: Integrations,
});

function Integrations() {
  return (
    <>
      <TopBar title="DHIS2 / HMIS Integration" subtitle="Bidirectional data exchange with Rwanda Health Information System" />
      <div className="p-6 grid gap-5 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid place-items-center h-11 w-11 rounded-lg text-primary-foreground" style={{ background: "var(--gradient-primary)" }}><Database className="h-5 w-5" /></div>
              <div>
                <h3 className="font-semibold text-sm">DHIS2 connection</h3>
                <p className="text-xs text-muted-foreground">hmis.moh.gov.rw · v2.40</p>
              </div>
            </div>
            <Badge className="gap-1 bg-[color:var(--success)]/15 text-[color:var(--success)] border-[color:var(--success)]/30" variant="outline"><CheckCircle2 className="h-3 w-3" /> Connected</Badge>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Info label="Last successful sync" value="Today · 12:42 EAT" />
            <Info label="Records pushed (30d)" value="48,221" />
            <Info label="Mapped data elements" value="64" />
            <Info label="Pending queue" value="0" />
          </div>
          <div className="flex gap-2 pt-2">
            <Button className="gap-2"><RefreshCw className="h-4 w-4" /> Sync now</Button>
            <Button variant="outline">View mapping</Button>
            <Button variant="ghost">Logs</Button>
          </div>
        </Card>

        <Card className="p-5 space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2"><Server className="h-4 w-4" /> System health</h3>
          <Status label="API gateway" ok />
          <Status label="Database replicas" ok />
          <Status label="CHW sync service" ok />
          <Status label="SMS gateway" ok />
          <Status label="Backup (24h)" ok />
        </Card>

        <Card className="p-5 lg:col-span-3">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Wifi className="h-4 w-4" /> Recent sync events</h3>
          <div className="divide-y divide-border text-sm">
            {[
              ["12:42", "Pushed 217 nutrition observations to DHIS2", "success"],
              ["12:30", "Received facility list update (412 facilities)", "info"],
              ["11:58", "CHW Uwase J. synced 14 offline records", "success"],
              ["10:21", "Retried 2 failed observations (resolved)", "warn"],
              ["09:00", "Daily HMIS aggregate exported", "success"],
            ].map(([t, msg, kind], i) => (
              <div key={i} className="py-2.5 flex items-center gap-4">
                <span className="font-mono text-xs text-muted-foreground w-12">{t}</span>
                <span className="flex-1">{msg}</span>
                <Badge variant="outline" className={`text-[10px] ${kind === "success" ? "border-[color:var(--success)]/40 text-[color:var(--success)]" : kind === "warn" ? "border-[color:var(--warning)]/40 text-[color:var(--warning)]" : "border-[color:var(--info)]/40 text-[color:var(--info)]"}`}>{kind as string}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-3 bg-muted/30">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold mt-0.5">{value}</div>
    </div>
  );
}
function Status({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span>{label}</span>
      <span className={`text-[11px] inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${ok ? "border-[color:var(--success)]/40 text-[color:var(--success)] bg-[color:var(--success)]/10" : "border-destructive/40 text-destructive bg-destructive/10"}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-[color:var(--success)]" : "bg-destructive"}`} /> {ok ? "Operational" : "Down"}
      </span>
    </div>
  );
}