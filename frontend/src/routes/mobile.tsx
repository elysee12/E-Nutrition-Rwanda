import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { isAuthenticated } from "@/lib/auth-guard";

export const Route = createFileRoute("/mobile")({
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
  component: () => <Outlet />,
});