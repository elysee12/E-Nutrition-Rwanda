import { createFileRoute } from "@tanstack/react-router";
import { useRole } from "@/lib/role";
import { NurseDashboard } from "@/components/dashboards/NurseDashboard";
import { DataManagerDashboard } from "@/components/dashboards/DataManagerDashboard";
import { AdminDashboard } from "@/components/dashboards/AdminDashboard";

export const Route = createFileRoute("/web/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — E-Nutrition Rwanda" }] }),
  component: Dashboard,
});

function Dashboard() {
  const role = useRole();

  if (role === "data-manager") return <DataManagerDashboard />;
  if (role === "admin") return <AdminDashboard />;
  return <NurseDashboard />;
}
