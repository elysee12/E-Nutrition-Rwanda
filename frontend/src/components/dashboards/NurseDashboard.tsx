import { Link } from "@tanstack/react-router";
import { Activity, AlertTriangle, ArrowRight, Baby, HeartPulse, Stethoscope, Loader2, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TopBar } from "@/components/web/TopBar";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { statusColor } from "@/lib/utils";
import { Kpi } from "./Kpi";
import { api, type Child, type Assessment } from "@/lib/api";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export function NurseDashboard() {
  const [myCases, setMyCases] = useState<Child[]>([]);
  const [pendingFollowups, setPendingFollowups] = useState<Child[]>([]);
  const [stats, setStats] = useState({
    myChildren: 0,
    pendingAssessments: 0,
    totalAssessments: 0,
    totalCHWs: 0,
    samCount: 0,
    followUpsToday: 0,
  });
  const [growthSeries, setGrowthSeries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch dashboard statistics
      const dashboardStats = await api.getDashboardStats();
      setStats({
        myChildren: dashboardStats.totalChildren || 0,
        pendingAssessments: dashboardStats.pendingAssessments || 0,
        totalAssessments: dashboardStats.totalAssessments || 0,
        totalCHWs: dashboardStats.totalCHWs || 0,
        samCount: dashboardStats.samCount || 0,
        followUpsToday: dashboardStats.followUpsToday || 0,
      });

      // Fetch recent cases
      const casesResponse = await api.getChildren({ limit: 6 });
      setMyCases(casesResponse.data);

      // Fetch children needing follow-up
      const followupsResponse = await api.getChildren({ limit: 4 });
      setPendingFollowups(followupsResponse.data.filter((c) => c.currentStatus !== "Normal"));

      // Fetch analytics for real growth trend
      const analytics = await api.getAnalytics();
      if (analytics?.monthlyTrend?.length > 0) {
        // Aggregate mean weight per month from trend data
        const monthMap: Record<string, { count: number; month: string }> = {};
        for (const r of analytics.monthlyTrend) {
          const d = new Date(r.assessmentDate);
          const key = d.toLocaleString("default", { month: "short" });
          if (!monthMap[key]) monthMap[key] = { month: key, count: 0 };
          monthMap[key].count++;
        }
        // Build a simple count-per-month series
        const series = Object.values(monthMap)
          .slice(-6)
          .map((m) => ({ month: m.month, assessments: m.count }));
        setGrowthSeries(series);
      }
      
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      toast.error("Failed to load dashboard. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <TopBar title="Clinical Workspace" subtitle="Your assessments and child follow-ups · Remera HC" />
        <div className="p-8 flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Loading your workspace...</span>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Clinical Workspace" subtitle="Your assessments and child follow-ups · Remera HC" />
      <div className="p-8 space-y-8 bg-gradient-to-br from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label="My children" value={String(stats.myChildren)} delta="+4 this week" icon={Baby} tone="bg-gradient-to-br from-emerald-500/10 via-green-500/10 to-teal-500/10 text-emerald-600 border-emerald-200/50" />
          <Kpi label="Total CHWs" value={String(stats.totalCHWs)} delta="Assigned to facility" icon={Users} tone="bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-cyan-500/10 text-blue-600 border-blue-200/50" />
          <Kpi label="SAM under treatment" value={String(stats.samCount)} delta="−1 since last week" icon={AlertTriangle} tone="bg-gradient-to-br from-red-500/10 via-rose-500/10 to-pink-500/10 text-red-600 border-red-200/50" />
          <Kpi label="Follow-ups due today" value={String(stats.followUpsToday)} delta="2 overdue" icon={HeartPulse} tone="bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-yellow-500/10 text-amber-600 border-amber-200/50" />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="p-6 lg:col-span-2 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold text-base text-slate-900">Recent assessments by nurses</h3>
                <p className="text-sm text-slate-600 mt-1">Screenings awaiting your clinical review</p>
              </div>
              <Link to="/web/assessments" className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                Go to assessments <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="space-y-3">
              {myCases.map((c) => (
                <Link key={c.id} to="/web/children/$childId" params={{ childId: c.id}} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-gradient-to-r from-white to-slate-50 p-4 hover:border-emerald-300 hover:shadow-lg transition-all duration-200 group">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white grid place-items-center text-sm font-bold shadow-md">{c.name.split(" ").map((n: string) => n[0]).slice(0,2).join("")}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-slate-900 truncate">{c.name} <span className="text-xs text-slate-500 font-mono ml-2">{c.code}</span></div>
                    <div className="text-xs text-slate-600 mt-1">Age: {c.ageMonths}mo · Last assessed: {c.lastAssessmentDate ? new Date(c.lastAssessmentDate).toLocaleDateString() : 'Never'}</div>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-semibold ${statusColor(c.currentStatus)}`}>{c.currentStatus}</span>
                  <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity">Review</Button>
                </Link>
              ))}
            </div>
          </Card>

          <Card className="p-6 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <h3 className="font-bold text-base text-slate-900">Follow-up queue</h3>
            <p className="text-sm text-slate-600 mb-5 mt-1">Children you are tracking</p>
            <div className="space-y-3">
              {pendingFollowups.map((c) => (
                <div key={c.id} className="rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 hover:border-emerald-300 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-bold text-slate-900 truncate">{c.name}</div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${statusColor(c.currentStatus)}`}>{c.currentStatus}</span>
                  </div>
                  <div className="text-xs text-slate-600 flex items-center gap-2">
                    <HeartPulse className="h-3.5 w-3.5 text-emerald-600" />
                    Next visit in 3 days · {c.facility?.name || 'N/A'}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card className="p-6 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-base text-slate-900">Assessment activity trend</h3>
              <p className="text-sm text-slate-600 mt-1">Number of assessments conducted per month</p>
            </div>
            <Badge variant="outline" className="gap-1.5 text-xs font-semibold border-emerald-200 text-emerald-700 bg-emerald-50"><Activity className="h-3.5 w-3.5" /> Live data</Badge>
          </div>
          {growthSeries.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-slate-400 text-sm">
              No assessment data available yet.
            </div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={growthSeries} margin={{ left: -10, right: 8, top: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="assessments" stroke="var(--primary)" strokeWidth={2.5} name="Assessments" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
