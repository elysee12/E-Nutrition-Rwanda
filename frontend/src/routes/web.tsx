import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppSidebar } from "@/components/web/AppSidebar";
import { isAuthenticated } from "@/lib/auth-guard";

export const Route = createFileRoute("/web")({
  beforeLoad: ({ location }) => {
    // Check if user is authenticated
    if (!isAuthenticated()) {
      throw redirect({
        to: "/",
        search: {
          redirect: location.href,
        },
      });
    }
  },
  component: WebLayout,
});

function WebLayout() {
  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 min-w-0 flex flex-col">
        <Outlet />
      </main>
    </div>
  );
}