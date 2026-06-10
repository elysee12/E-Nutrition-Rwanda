import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Baby,
  Building2,
  ClipboardList,
  HeartPulse,
  MapPin,
  ShieldCheck,
  Stethoscope,
  UserCog,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TopBar } from "@/components/web/TopBar";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Kpi } from "./Kpi";
import { api } from "@/lib/api";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({});
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [dashboardStats, activitiesResponse] = await Promise.all([
        api.getDashboardStats(),
        api.getActivities({ limit: 10 }),
      ]);
      setStats(dashboardStats);
      setActivities(activitiesResponse.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <TopBar title="System Overview" subtitle="National administrator console" />
        <div className="p-8 flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Loading dashboard...</span>
          </div>
        </div>
      </>
    );
  }

  const prevalenceData = [
    { name: "Normal", count: stats.normalCount ?? 0, color: "#16a34a" },
    { name: "SAM", count: stats.samCount ?? 0, color: "#dc2626" },
    { name: "MAM", count: stats.mamCount ?? 0, color: "#d97706" },
  ];

  const activityTypeLabel: Record<string, string> = {
    CHILD_REGISTRATION: "Child registered",
    ASSESSMENT_CREATED: "Assessment created",
    ASSESSMENT_UPDATED: "Assessment updated",
    FOLLOW_UP_COMPLETED: "Follow-up completed",
    REFERRAL_MADE: "Referral made",
    USER_CREATED: "User created",
    USER_UPDATED: "User updated",
    FACILITY_REGISTERED: "Facility registered",
    DATA_SYNCED: "Data synced",
  };

  return (
    <>
      <TopBar title="System Overview" subtitle="National administrator console" />
      <div className="p-8 space-y-8 bg-gradient-to-br from-slate-50 to-white">
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label="Total children" value={String(stats.totalChildren ?? 0)} icon={Baby} tone="bg-gradient-to-br from-emerald-500/10 via-green-500/10 to-teal-500/10 text-emerald-600 border-emerald-200/50" />
          <Kpi label="SAM cases" value={String(stats.samCount ?? 0)} icon={ShieldCheck} tone="bg-gradient-to-br from-red-500/10 via-rose-500/10 to-pink-500/10 text-red-600 border-red-200/50" />
          <Kpi label="MAM cases" value={String(stats.mamCount ?? 0)} icon={HeartPulse} tone="bg-gradient-to-br from-orange-500/10 via-amber-500/10 to-yellow-500/10 text-orange-600 border-orange-200/50" />
          <Kpi label="Recent assessments" value={String(stats.recentAssessments ?? 0)} icon={Stethoscope} tone="bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-cyan-500/10 text-blue-600 border-blue-200/50" />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* National prevalence chart */}
          <Card className="p-6 lg:col-span-2 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold text-base text-slate-900">National prevalence</h3>
                <p className="text-sm text-slate-600 mt-1">Distribution of nutrition status across all children</p>
              </div>
              <Button variant="outline" size="sm" className="h-9 text-xs font-semibold border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                <MapPin className="h-3.5 w-3.5 mr-1.5" /> Map view
              </Button>
            </div>
            {prevalenceData.every((d) => d.count === 0) ? (
              <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
                No assessment data available yet.
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={prevalenceData} margin={{ left: -10, right: 8, top: 4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {prevalenceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          {/* Quick admin actions */}
          <Card className="p-6 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <h3 className="font-bold text-base text-slate-900">Quick admin actions</h3>
            <p className="text-sm text-slate-600 mb-5 mt-1">Manage system entities</p>
            <div className="space-y-3">
              <AdminAction to="/web/staff" icon={UserCog} label="Register user / role" hint="Nurse, CHW, Data Mgr, Admin" />
              <AdminAction to="/web/hospitals" icon={Building2} label="Register facility" hint="Health centers & district hospitals" />
              <AdminAction to="/web/audit" icon={ClipboardList} label="Review audit log" hint="All system events" />
            </div>
          </Card>
        </div>

        {/* Latest system events — real data */}
        <Card className="p-6 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-base text-slate-900">Latest system events</h3>
              <p className="text-sm text-slate-600 mt-1">Cross-facility activity stream</p>
            </div>
            <Link
              to="/web/audit"
              className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              Open audit log <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {activities.length > 0 ? (
              activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center gap-4 rounded-xl border border-slate-200 bg-gradient-to-r from-white to-slate-50 p-4 hover:border-emerald-300 hover:shadow-md transition-all"
                >
                  <span className="h-3 w-3 rounded-full shrink-0 shadow-md bg-blue-500" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-slate-900 truncate">
                      {activityTypeLabel[activity.type] ?? activity.type}
                    </div>
                    <div className="text-xs text-slate-500 truncate">{activity.description}</div>
                  </div>
                  <span className="text-xs text-slate-500 font-semibold shrink-0">
                    {new Date(activity.createdAt).toLocaleString()}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-400 text-sm">No activity recorded yet.</div>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}

function AdminAction({
  to,
  icon: Icon,
  label,
  hint,
}: {
  to: string;
  icon: any;
  label: string;
  hint: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-4 rounded-xl border border-slate-200 bg-gradient-to-r from-white to-slate-50 p-4 hover:border-emerald-300 hover:shadow-lg transition-all duration-200 group"
    >
      <div className="grid place-items-center h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md group-hover:scale-110 transition-transform">
        <Icon className="h-6 w-6" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-slate-900">{label}</div>
        <div className="text-xs text-slate-600 mt-0.5">{hint}</div>
      </div>
      <ArrowUpRight className="h-5 w-5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
    </Link>
  );
}
