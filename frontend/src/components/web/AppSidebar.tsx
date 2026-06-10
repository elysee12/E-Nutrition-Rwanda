import { Link, useRouterState, useRouter } from "@tanstack/react-router";
import { Activity, Baby, BarChart3, Building2, FileText, LayoutDashboard, LineChart, LogOut, ScrollText, Settings, ShieldCheck, Stethoscope, UserCog, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRole, type Role, ROLE_LABEL, clearAuth } from "@/lib/role";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useState, useEffect } from "react";

type Item = { to: string; label: string; icon: any; roles: Role[] };

const items: Item[] = [
  { to: "/web/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["nutritionist", "data-manager", "admin"] },
  { to: "/web/children", label: "Children Registry", icon: Baby, roles: ["nutritionist"] },
  { to: "/web/assessments", label: "Assessment", icon: Stethoscope, roles: ["nutritionist"] },
  { to: "/web/followup", label: "Follow-up", icon: Calendar, roles: ["nutritionist"] },
  { to: "/web/growth", label: "Growth Monitoring", icon: LineChart, roles: ["nutritionist", "data-manager"] },
  { to: "/web/staff", label: "Staff Register", icon: UserCog, roles: ["data-manager", "admin"] },
  { to: "/web/analytics", label: "Analytics", icon: LineChart, roles: ["data-manager", "admin"] },
  { to: "/web/reports", label: "Reports", icon: FileText, roles: ["data-manager", "admin"] },
  { to: "/web/hospitals", label: "Hospitals & Facilities", icon: Building2, roles: ["admin"] },
  { to: "/web/audit", label: "Audit Log", icon: ScrollText, roles: ["admin"] },
];

export function AppSidebar() {
  const role = useRole();
  const { location } = useRouterState();
  const router = useRouter();
  const visible = role ? items.filter((i) => i.roles.includes(role)) : [];
  const [todayFollowupsCount, setTodayFollowupsCount] = useState<number>(0);

  // Fetch today's follow-ups count
  useEffect(() => {
    const fetchTodayFollowups = async () => {
      try {
        const followups = await api.getTodayFollowUps();
        setTodayFollowupsCount(followups.length);
      } catch (error) {
        console.error("Failed to fetch today's follow-ups:", error);
        // Silently fail - don't show error toast on sidebar
      }
    };

    // Only fetch if user is a nutritionist (who needs to see follow-ups)
    if (role === "nutritionist") {
      fetchTodayFollowups();
      // Refresh count every 5 minutes
      const interval = setInterval(fetchTodayFollowups, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [role]);

  const handleLogout = () => {
    api.logout();
    clearAuth();
    toast.success("Logged out successfully!");
    router.navigate({ to: "/" });
  };

  return (
    <aside className="hidden lg:flex w-72 shrink-0 flex-col border-r-2 border-slate-200 bg-gradient-to-b from-white to-slate-50 shadow-xl">
      <div className="flex items-center gap-3 px-6 py-6 border-b-2 border-slate-200 bg-gradient-to-br from-emerald-50 to-teal-50">
        <div className="grid place-items-center h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">
          <Activity className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <div className="text-base font-black leading-tight text-slate-900">E-Nutrition</div>
          <div className="text-xs text-slate-600 truncate font-semibold">{ROLE_LABEL[role]}</div>
        </div>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {visible.map((it) => {
          const active = location.pathname === it.to || location.pathname.startsWith(it.to + "/");
          const Icon = it.icon;
          // Show badge count only for Follow-up menu item
          const showBadge = it.to === "/web/followup" && todayFollowupsCount > 0;
          return (
            <Link
              key={it.to}
              to={it.to}
              className={cn(
                "flex items-center gap-4 rounded-xl px-4 py-3.5 text-sm font-semibold transition-all duration-200 relative",
                active
                  ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg scale-105 border-l-4 border-white"
                  : "text-slate-700 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-teal-50 hover:text-emerald-700 hover:shadow-md hover:scale-102",
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="flex-1">{it.label}</span>
              {showBadge && (
                <Badge 
                  variant={active ? "secondary" : "default"} 
                  className={cn(
                    "ml-auto text-xs font-bold",
                    active ? "bg-white text-emerald-600" : "bg-emerald-600 text-white"
                  )}
                >
                  {todayFollowupsCount}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t-2 border-slate-200 space-y-2 bg-slate-50">
        <Link to="/web/settings" className="flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-white hover:text-emerald-700 hover:shadow-md transition-all">
          <Settings className="h-5 w-5" /> Settings
        </Link>
        <Button
          variant="ghost"
          className="w-full flex items-center justify-start gap-4 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-white hover:text-red-600 hover:shadow-md transition-all"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5" /> Sign out
        </Button>
      </div>
      <div className="px-6 py-4 text-xs font-semibold text-slate-600 border-t-2 border-slate-200 flex items-center gap-3 bg-gradient-to-r from-emerald-50 to-teal-50">
        <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shadow-lg" />
        v1.0
      </div>
    </aside>
  );
}