import { createFileRoute, Link } from "@tanstack/react-router";
import { PhoneFrame } from "@/components/mobile/PhoneFrame";
import { Activity, AlertTriangle, ChevronRight, MapPin, UserPlus, Users, Loader2, Plus, Stethoscope } from "lucide-react";
import { statusColor } from "@/lib/utils";
import { api, type Child, type User } from "@/lib/api";
import { offlineSync } from "@/lib/offline-sync";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/mobile/home")({ component: Home });

function Home() {
  const [children, setChildren] = useState<Child[]>([]);
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(offlineSync.getPendingCount());
  const [stats, setStats] = useState({ 
    total: 0, 
    screenedToday: 0, 
    samAlerts: 0, 
    toSync: 0, 
    totalCHWs: 0, 
    facilitiesCovered: 0,
    chwFacilityName: null as string | null 
  });

  useEffect(() => {
    fetchData();

    // Listen for sync updates
    const handleUpdate = () => {
      setPendingCount(offlineSync.getPendingCount());
    };
    window.addEventListener("enr-sync-updated", handleUpdate);
    return () => window.removeEventListener("enr-sync-updated", handleUpdate);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const profile = await api.getProfile();
      const [childrenResponse, dashboardStats] = await Promise.all([
        api.getChildren({ limit: 20 }),
        api.getDashboardStats(),
      ]);

      setChildren(childrenResponse.data);
      setProfile(profile);
      setStats({
        total: dashboardStats.totalChildren || 0,
        screenedToday: dashboardStats.screenedToday || 0,
        samAlerts: dashboardStats.samCount || 0,
        toSync: 0,
        totalCHWs: dashboardStats.chwTotalAssessments || 0,
        facilitiesCovered: dashboardStats.facilitiesCovered || 0,
        chwFacilityName: dashboardStats.chwFacilityName || null,
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to load home data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <PhoneFrame title="Muraho 👋">
        <div className="p-6 flex items-center justify-center min-h-[350px]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground font-medium">Loading...</span>
          </div>
        </div>
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame title="Muraho 👋">
      <div className="p-5 space-y-6">
        {/* Welcome Header */}
        <div className="rounded-3xl p-6 text-white bg-gradient-to-br from-[#16a34a] via-[#059669] to-[#047857] shadow-xl">
          <div className="text-[11px] uppercase tracking-[0.2em] opacity-90 flex items-center gap-2 font-semibold mb-4">
            <MapPin className="h-4 w-4" /> 
            {profile?.sector ? `${profile.sector} Sector · ${profile.district || ""}` : "Community Health"}
          </div>
          
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="text-4xl font-extrabold tracking-tight">{stats.total}</div>
              <div className="text-xs opacity-90 mt-1 font-medium">All children covered</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-extrabold tracking-tight">{stats.totalCHWs}</div>
              <div className="text-xs opacity-90 mt-1 font-medium">Assessments completed</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold tracking-tight leading-tight break-words">
                {stats.chwFacilityName || "N/A"}
              </div>
              <div className="text-xs opacity-90 mt-1 font-medium">Assigned facility</div>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/25 backdrop-blur-md rounded-2xl py-4 px-3 text-center shadow-lg">
              <div className="text-2xl font-extrabold">{stats.screenedToday}</div>
              <div className="text-[10px] opacity-90 font-semibold mt-1">Screened today</div>
            </div>
            <div className="bg-white/25 backdrop-blur-md rounded-2xl py-4 px-3 text-center shadow-lg">
              <div className="text-2xl font-extrabold">{stats.samAlerts}</div>
              <div className="text-[10px] opacity-90 font-semibold mt-1">SAM alerts</div>
            </div>
            <div className="bg-white/25 backdrop-blur-md rounded-2xl py-4 px-3 text-center shadow-lg">
              <div className="text-2xl font-extrabold">{pendingCount}</div>
              <div className="text-[10px] opacity-90 font-semibold mt-1">To sync</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Link to="/mobile/register" className="rounded-2xl border border-border p-5 bg-card hover:border-emerald-400/50 hover:shadow-xl transition-all duration-300 group">
            <div className="grid place-items-center h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-600 mb-4 shadow-sm group-hover:scale-110 transition-transform duration-300">
              <UserPlus className="h-6 w-6" />
            </div>
            <div className="text-base font-semibold text-foreground">Register child</div>
            <div className="text-xs text-muted-foreground mt-1">New under-five</div>
          </Link>
          <Link to="/mobile/measure" className="rounded-2xl border border-border p-5 bg-card hover:border-blue-400/50 hover:shadow-xl transition-all duration-300 group">
            <div className="grid place-items-center h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50 text-blue-600 mb-4 shadow-sm group-hover:scale-110 transition-transform duration-300">
              <Activity className="h-6 w-6" />
            </div>
            <div className="text-base font-semibold text-foreground">Screen / MUAC</div>
            <div className="text-xs text-muted-foreground mt-1">Quick measurement</div>
          </Link>
        </div>

        {/* Today's Tasks */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-foreground">Today's tasks</h3>
            <Link to="/mobile/visits" className="text-xs font-medium text-primary hover:text-emerald-700 transition-colors">See all</Link>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 hover:shadow-lg transition-all duration-200">
              <div className="h-12 w-12 rounded-2xl grid place-items-center bg-red-50 text-red-600 shadow-sm">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground truncate">Check SAM cases</div>
                <div className="text-xs text-muted-foreground mt-1 truncate">Follow up · Today</div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </section>

        {/* Recent Children */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Users className="h-4 w-4" /> Recent children
            </h3>
          </div>
          <div className="space-y-3">
            {children.map((c) => (
              <div key={c.id} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 hover:shadow-lg transition-all duration-200">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-700 grid place-items-center text-sm font-bold shadow-sm">
                  {c.name.split(" ").map((n)=>n[0]).slice(0,2).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground truncate">{c.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">{c.ageMonths}mo · {c.village}</div>
                </div>
                <span className={`text-[11px] px-3 py-1 rounded-full font-semibold ${statusColor(c.currentStatus)}`}>{c.currentStatus}</span>
              </div>
            ))}
            {children.length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground border border-dashed border-border rounded-2xl">
                No children yet
              </div>
            )}
          </div>
        </section>
      </div>
    </PhoneFrame>
  );
}
