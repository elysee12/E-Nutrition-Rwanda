import { createFileRoute } from "@tanstack/react-router";
import { PhoneFrame } from "@/components/mobile/PhoneFrame";
import { Calendar, ChevronRight, Loader2, ClipboardList } from "lucide-react";
import { api, type FollowUp } from "@/lib/api";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/mobile/visits")({ component: Visits });

function Visits() {
  const [followups, setFollowups] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await api.getUpcomingFollowUps();
        setFollowups(data);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load visits");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const priorityStyle = (f: FollowUp) => {
    if (f.child.currentStatus === "SAM") return "bg-destructive/15 text-destructive";
    if (f.child.currentStatus === "MAM") return "bg-amber-100 text-amber-700";
    return "bg-muted text-muted-foreground";
  };

  return (
    <PhoneFrame title="My visits">
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" /> Upcoming follow-ups
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : followups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
            <ClipboardList className="h-8 w-8 opacity-40" />
            <p className="text-sm">No upcoming visits scheduled</p>
          </div>
        ) : (
          followups.map((f) => (
            <div key={f.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
              <div className={`h-10 w-10 rounded-lg grid place-items-center text-[10px] font-semibold shrink-0 ${priorityStyle(f)}`}>
                {new Date(f.scheduledDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{f.child.name}</div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {f.reason || "Follow-up"} · {f.child.village}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
          ))
        )}
      </div>
    </PhoneFrame>
  );
}
