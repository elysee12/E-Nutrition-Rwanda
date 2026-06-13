import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { TopBar } from "@/components/web/TopBar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar,
} from "recharts";
import { Download, FileSpreadsheet, FileText, Filter, Loader2 } from "lucide-react";
import { useRole, getStoredUser, getRole } from "@/lib/role";
import { api } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/web/analytics")({
  head: () => ({ meta: [{ title: "Analytics — E-Nutrition Rwanda" }] }),
  component: Analytics,
});

const STATUS_COLORS: Record<string, string> = {
  Normal:      "#16a34a",
  MAM:         "#d97706",
  SAM:         "#dc2626",
  Stunting:    "#7c3aed",
  Underweight: "#0891b2",
  Wasting:     "#db2777",
};

function Analytics() {
  const role = useRole();
  const isAdmin = role?.toLowerCase() === "admin";
  
  const [loading, setLoading] = useState(true);
  const [dashStats, setDashStats] = useState<any>({});
  const [analyticsData, setAnalyticsData] = useState<any>({});
  const [users, setUsers] = useState<any[]>([]);
  const [facilities, setFacilities] = useState<any[]>([]);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const currentUser = getStoredUser();
      const currentRole = getRole();
      const adminFlag = currentRole?.toLowerCase() === "admin";
      
      console.log("fetchAll: currentUser", currentUser);
      console.log("fetchAll: currentRole", currentRole);
      console.log("fetchAll: adminFlag", adminFlag);
      
      const calls: Promise<any>[] = [
        api.getDashboardStats(),
        api.getAnalytics(),
      ];
      if (adminFlag) {
        calls.push(api.getFacilities({ limit: 100 }));
      } else {
        calls.push(api.getUsers({ limit: 100, role: "CHW", facilityId: currentUser?.facilityId }));
      }
      const [stats, analytics, thirdResponse] = await Promise.all(calls);
      console.log("fetchAll results:", { adminFlag, stats, analytics, thirdResponse });
      setDashStats(stats);
      setAnalyticsData(analytics);
      if (adminFlag) setFacilities(thirdResponse?.data ?? []);
      else setUsers(thirdResponse?.data ?? []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  // Build pie data from real status distribution
  const pieData = useMemo(() => {
    const dist: Record<string, number> = {};
    for (const item of analyticsData?.statusDistribution ?? []) {
      dist[item.nutritionStatus] = item._count ?? item.count ?? 0;
    }
    return Object.entries(dist)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value, color: STATUS_COLORS[name] ?? "#94a3b8" }));
  }, [analyticsData]);

  // Build facility case-load from real stats + facility list (admin only)
  const facilityData = useMemo(() => {
    return facilities.map((f) => ({
      hospital: f.name?.length > 14 ? f.name.substring(0, 14) + "…" : f.name,
      children: f.childrenCount ?? 0,
      staff: f.staffCount ?? 0,
    }));
  }, [facilities]);

  // Build CHW performance from real users (data-manager only)
  const chwPerf = useMemo(() => {
    return users
      .filter((u) => u.role === "CHW")
      .map((u) => ({
        name: u.name?.split(" ").slice(0, 2).join(" ") ?? u.code,
        village: u.village ?? "—",
      }));
  }, [users]);

  // Summary KPIs
  const total = dashStats.totalChildren ?? 0;
  const sam   = dashStats.samCount ?? 0;
  const mam   = dashStats.mamCount ?? 0;
  const normal = dashStats.normalCount ?? 0;
  const wasting = dashStats.wastingCount ?? 0;
  const stunting = dashStats.stuntingCount ?? 0;
  const underweight = dashStats.underweightCount ?? 0;

  if (loading) {
    return (
      <>
        <TopBar title="Analytics" subtitle="Loading analytics data…" />
        <div className="p-6 flex items-center justify-center min-h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar
        title="Analytics"
        subtitle={
          isAdmin
            ? "System-wide performance metrics and facility analytics"
            : "Aggregate insights · ready for export"
        }
      />
      <div className="p-6 space-y-5">
        {/* Toolbar */}
        <Card className="p-4 flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" /> Filters
            </Button>
            <Badge variant="outline">Age group: 0–59 months</Badge>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <FileText className="h-4 w-4" /> PDF
            </Button>
          </div>
        </Card>

        {/* Summary KPI row */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-7">
          {[
            { label: "Total children", value: total, color: "text-slate-900" },
            { label: "Normal",         value: normal, color: "text-emerald-600" },
            { label: "SAM",            value: sam,   color: "text-red-600" },
            { label: "MAM",            value: mam,   color: "text-amber-600" },
            { label: "Wasting",        value: wasting, color: "text-pink-600" },
            { label: "Stunting",       value: stunting, color: "text-purple-600" },
            { label: "Underweight",    value: underweight, color: "text-cyan-600" },
          ].map((k) => (
            <Card key={k.label} className="p-4">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">{k.label}</div>
              <div className={`text-2xl font-bold mt-1 ${k.color}`}>{k.value.toLocaleString()}</div>
            </Card>
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {/* Nutrition status pie — real data */}
          <Card className="p-5">
            <h3 className="font-semibold text-sm">Nutrition status distribution</h3>
            <p className="text-xs text-muted-foreground mb-3">All under-five children in the system</p>
            {pieData.length === 0 ? (
              <div className="h-72 flex items-center justify-center text-slate-400 text-sm">
                No assessment data available yet.
              </div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      label={({ name, percent }) =>
                        percent > 0.03 ? `${name} ${(percent * 100).toFixed(0)}%` : ""
                      }
                      labelLine={false}
                    >
                      {pieData.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          {/* Right panel: Facilities (admin) or CHWs (data-manager) */}
          <Card className="p-5">
            {isAdmin ? (
              <>
                <h3 className="font-semibold text-sm">Facility overview</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Registered facilities — children enrolled and staff count
                </p>
                {facilityData.length === 0 ? (
                  <div className="h-72 flex items-center justify-center text-slate-400 text-sm">
                    No facilities registered yet.
                  </div>
                ) : (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={facilityData}
                        layout="vertical"
                        margin={{ left: 10, right: 12 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} />
                        <YAxis
                          type="category"
                          dataKey="hospital"
                          stroke="var(--muted-foreground)"
                          fontSize={10}
                          width={110}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "var(--card)",
                            border: "1px solid var(--border)",
                            borderRadius: 8,
                            fontSize: 12,
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="children" fill="#16a34a" radius={[0, 4, 4, 0]} name="Children" />
                        <Bar dataKey="staff" fill="#0891b2" radius={[0, 4, 4, 0]} name="Staff" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            ) : (
              <>
                <h3 className="font-semibold text-sm">CHW roster</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Community Health Workers in your facility
                </p>
                {chwPerf.length === 0 ? (
                  <div className="h-72 flex items-center justify-center text-slate-400 text-sm">
                    No CHWs assigned to this facility yet.
                  </div>
                ) : (
                  <div className="divide-y divide-border mt-2">
                    {chwPerf.map((c, i) => (
                      <div key={i} className="flex items-center gap-3 py-2.5">
                        <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold grid place-items-center shrink-0">
                          {c.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{c.name}</div>
                          <div className="text-xs text-muted-foreground">{c.village}</div>
                        </div>
                        <Badge variant="outline" className="text-[10px]">CHW</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </Card>
        </div>

        {/* Monthly trend from real assessment data */}
        {(analyticsData?.monthlyTrend?.length ?? 0) > 0 && (
          <Card className="p-5">
            <h3 className="font-semibold text-sm">Assessment trend over time</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Number of assessments conducted — all time
            </p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={buildMonthlyTrend(analyticsData.monthlyTrend)}
                  margin={{ left: -10, right: 8, top: 4, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Normal" fill="#16a34a" stackId="a" />
                  <Bar dataKey="MAM"    fill="#d97706" stackId="a" />
                  <Bar dataKey="SAM"    fill="#dc2626" stackId="a" />
                  <Bar dataKey="Wasting" fill="#db2777" stackId="a" />
                  <Bar dataKey="Stunting" fill="#7c3aed" stackId="a" />
                  <Bar dataKey="Underweight" fill="#0891b2" stackId="a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}

/** Collapse raw assessment rows into monthly buckets */
function buildMonthlyTrend(rows: { assessmentDate: string; nutritionStatus: string }[]) {
  const map: Record<string, Record<string, number>> = {};
  for (const r of rows) {
    const d = new Date(r.assessmentDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!map[key]) map[key] = { 
      month: key, 
      Normal: 0, 
      MAM: 0, 
      SAM: 0, 
      Wasting: 0, 
      Stunting: 0, 
      Underweight: 0 
    };
    const bucket = map[key];
    if (r.nutritionStatus in bucket) {
      bucket[r.nutritionStatus as keyof typeof bucket]++;
    }
  }
  return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
}
