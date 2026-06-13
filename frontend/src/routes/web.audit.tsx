import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/web/TopBar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download, Search, ScrollText, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { api, type Activity } from "@/lib/api";
import { toast } from "sonner";
import { handleError } from "@/lib/error-handler";

export const Route = createFileRoute("/web/audit")({
  head: () => ({ meta: [{ title: "Audit Log — E-Nutrition Rwanda" }] }),
  component: Audit,
});

function getSeverity(activityType: string): "info" | "warn" | "danger" {
  const type = activityType.toUpperCase();
  if (type.includes("DELETE") || type.includes("SUSPEND") || type.includes("GRANT") || type.includes("REVOKE")) {
    return "danger";
  }
  if (type.includes("UPDATE") || type.includes("EDIT") || type.includes("LOCK")) {
    return "warn";
  }
  return "info";
}

function sevTone(s: string) {
  if (s === "danger") return "bg-destructive";
  if (s === "warn") return "bg-[color:var(--warning)]";
  return "bg-[color:var(--info)]";
}

function Audit() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [stats, setStats] = useState({
    today: 0,
    securitySensitive: 0,
    adminActions: 0,
    systemEvents: 0,
  });

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const response = await api.getActivities({ limit: 100 });
      setActivities(response.data);

      // Calculate stats
      const today = new Date().toDateString();
      const todayActivities = response.data.filter(
        (a) => new Date(a.createdAt).toDateString() === today
      );
      
      const securitySensitive = response.data.filter((a) =>
        getSeverity(a.type) === "danger"
      );

      const adminActions = response.data.filter((a) =>
        a.user?.role === "ADMIN"
      );

      const systemEvents = response.data.filter((a) =>
        !a.userId || a.description?.toLowerCase().includes("system") || a.description?.toLowerCase().includes("dhis2")
      );

      setStats({
        today: todayActivities.length,
        securitySensitive: securitySensitive.length,
        adminActions: adminActions.length,
        systemEvents: systemEvents.length,
      });
    } catch (err) {
      const errorMessage = handleError(err, "Failed to load audit log");
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Filter activities
  const filteredActivities = activities.filter((activity) => {
    // Search filter
    const matchesSearch =
      searchQuery === "" ||
      activity.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.user?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.type.toLowerCase().includes(searchQuery.toLowerCase());

    // Severity filter
    const severity = getSeverity(activity.type);
    const matchesSeverity =
      severityFilter === "all" || severity === severityFilter;

    return matchesSearch && matchesSeverity;
  });

  // Export to CSV
  const exportToCSV = () => {
    const headers = ["Timestamp", "Actor", "Action", "Description", "Entity Type", "Entity ID"];
    const rows = filteredActivities.map((a) => [
      new Date(a.createdAt).toLocaleString(),
      a.user?.name || "System",
      a.type,
      a.description,
      a.entityType || "",
      a.entityId || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit-log-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Audit log exported successfully");
  };

  return (
    <>
      <TopBar title="Audit log" subtitle="Immutable record of every system event — for compliance and oversight" />
      <div className="p-6 space-y-5">
        <div className="grid gap-4 sm:grid-cols-4">
          <Stat label="Events today" value={stats.today.toString()} />
          <Stat label="Security-sensitive" value={stats.securitySensitive.toString()} tone="text-destructive" />
          <Stat label="Admin actions" value={stats.adminActions.toString()} />
          <Stat label="System events" value={stats.systemEvents.toString()} />
        </div>

        <Card className="overflow-hidden">
          <div className="p-4 border-b border-border flex items-center gap-3 flex-wrap">
            <ScrollText className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm flex-1">All events</h3>
            <div className="flex items-center gap-2 rounded-lg border border-input bg-card px-3 w-72">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by actor or description…"
                className="border-0 shadow-none focus-visible:ring-0 px-0 h-9 bg-transparent"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All severities</SelectItem>
                <SelectItem value="danger">Critical</SelectItem>
                <SelectItem value="warn">Warning</SelectItem>
                <SelectItem value="info">Info</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2" onClick={exportToCSV}>
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              No audit events found matching your filters.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredActivities.map((activity) => {
                const severity = getSeverity(activity.type);
                const timestamp = new Date(activity.createdAt).toLocaleString();
                const actor = activity.user?.name || "System";
                const actorRole = activity.user?.role ? ` · ${activity.user.role}` : "";
                const target = activity.entityId
                  ? `${activity.entityType || "entity"}:${activity.entityId.substring(0, 8)}`
                  : "system";

                return (
                  <div
                    key={activity.id}
                    className="grid grid-cols-[180px_1fr_120px_1fr] items-center gap-3 px-4 py-3 text-sm"
                  >
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {timestamp}
                    </span>
                    <span className="font-medium truncate">
                      {actor}
                      <span className="text-muted-foreground">{actorRole}</span>
                    </span>
                    <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {activity.type}
                    </span>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`h-2 w-2 rounded-full shrink-0 ${sevTone(severity)}`} />
                      <span className="text-foreground/85 truncate">{activity.description}</span>
                      <span className="text-[11px] text-muted-foreground font-mono ml-auto shrink-0">
                        {target}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
