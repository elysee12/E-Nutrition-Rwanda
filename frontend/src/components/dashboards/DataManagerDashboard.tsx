import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Baby, CheckCircle2, Stethoscope, Users, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TopBar } from "@/components/web/TopBar";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Kpi } from "./Kpi";
import { api, type User, type Activity } from "@/lib/api";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export function DataManagerDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({});
  const [users, setUsers] = useState<User[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [dashboardStats, usersResponse, activitiesResponse, profile] = await Promise.all([
        api.getDashboardStats(),
        api.getUsers({ limit: 10 }),
        api.getActivities({ limit: 10 }),
        api.getProfile(),
      ]);
      setStats(dashboardStats);
      setUsers(usersResponse.data);
      setActivities(activitiesResponse.data);
      setCurrentUser(profile);
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
        <TopBar title="Health Center Overview" subtitle="Loading facility data..." />
        <div className="p-8 flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Loading dashboard...</span>
          </div>
        </div>
      </>
    );
  }

  const facilityStaff = users.filter((u) => 
    u.role === "NURSE" || u.role === "CHW" || u.role === "DATA_MANAGER"
  ).slice(0, 6);

  return (
    <>
      <TopBar 
        title="Health Center Overview" 
        subtitle={`${currentUser?.facility?.name || "Facility"} · ${currentUser?.district || "District"} · ${currentUser?.province || "Province"}`} 
      />
      <div className="p-8 space-y-8 bg-gradient-to-br from-slate-50 to-white">
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label="Children at facility" value={String(stats.totalChildren || 0)} icon={Baby} tone="bg-gradient-to-br from-emerald-500/10 via-green-500/10 to-teal-500/10 text-emerald-600 border-emerald-200/50" />
          <Kpi label="SAM cases" value={String(stats.samCount || 0)} icon={Stethoscope} tone="bg-gradient-to-br from-red-500/10 via-rose-500/10 to-pink-500/10 text-red-600 border-red-200/50" />
          <Kpi label="MAM cases" value={String(stats.mamCount || 0)} icon={Users} tone="bg-gradient-to-br from-orange-500/10 via-amber-500/10 to-yellow-500/10 text-orange-600 border-orange-200/50" />
          <Kpi label="Follow-ups today" value={String(stats.followUpsToday || 0)} icon={CheckCircle2} tone="bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-cyan-500/10 text-blue-600 border-blue-200/50" />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="p-6 lg:col-span-2 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold text-base text-slate-900">Recent assessments</h3>
                <p className="text-sm text-slate-600 mt-1">Screening activity at your facility</p>
              </div>
              <Badge variant="outline" className="text-xs font-semibold border-slate-200 bg-slate-50">Live data</Badge>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={[
                  { name: "Normal", count: stats.normalCount || 0 },
                  { name: "SAM", count: stats.samCount || 0 },
                  { name: "MAM", count: stats.mamCount || 0 },
                ]} margin={{ left: -10, right: 8, top: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="dm-g" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="count" stroke="var(--primary)" strokeWidth={2} fill="url(#dm-g)" name="Count" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-6 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-base text-slate-900">My staff</h3>
              <Link to="/web/staff" className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">Manage <ArrowUpRight className="h-4 w-4" /></Link>
            </div>
            <div className="space-y-3">
              {facilityStaff.length > 0 ? facilityStaff.map((u) => (
                <div key={u.id} className="flex items-center gap-4 py-2 px-3 rounded-xl hover:bg-gradient-to-r hover:from-emerald-50 hover:to-teal-50 transition-all">
                  <div className="grid place-items-center h-11 w-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-sm font-bold shadow-md">{u.name.split(" ").map((n: string) => n[0]).slice(0,2).join("")}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-slate-900 truncate">{u.name}</div>
                    <div className="text-xs text-slate-600 font-medium">{u.role} · {u.facility?.name || "Facility"}</div>
                  </div>
                  <span className={`h-3 w-3 rounded-full shadow-md ${u.status === "Active" ? "bg-emerald-500" : "bg-slate-400"}`} />
                </div>
              )) : (
                <div className="text-center py-8 text-slate-500">No staff yet</div>
              )}
            </div>
          </Card>
        </div>

        <Card className="p-6 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-base text-slate-900">Recent activity</h3>
              <p className="text-sm text-slate-600 mt-1">Activity log from your facility</p>
            </div>
            <Link to="/web/activity" className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">Full log <ArrowUpRight className="h-4 w-4" /></Link>
          </div>
          <div className="space-y-3">
            {activities.length > 0 ? activities.map((a) => (
              <div key={a.id} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-gradient-to-r from-white to-slate-50 p-4 hover:border-emerald-300 hover:shadow-md transition-all">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 grid place-items-center shadow-sm">
                  <ArrowUpRight className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-slate-900">
                    {a.type} · {a.description}
                  </div>
                </div>
                <span className="text-xs text-slate-500 font-semibold">
                  {new Date(a.createdAt).toLocaleString()}
                </span>
              </div>
            )) : (
              <div className="text-center py-8 text-slate-500">No activity yet</div>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
