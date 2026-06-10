import { createFileRoute } from "@tanstack/react-router";
import { PhoneFrame } from "@/components/mobile/PhoneFrame";
import { Button } from "@/components/ui/button";
import { CheckCircle2, CloudOff, RefreshCw, Wifi, WifiOff, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/mobile/sync")({ component: Sync });

type SyncRecord = {
  id: string;
  type: "registration" | "measurement";
  description: string;
  status: "queued" | "syncing" | "synced";
};

function Sync() {
  // Sample initial pending records
  const [records, setRecords] = useState<SyncRecord[]>([
    { id: "1", type: "registration", description: "New registration: Iradukunda Aline", status: "queued" },
    { id: "2", type: "registration", description: "New registration: Nkurunziza Paul", status: "queued" },
    { id: "3", type: "registration", description: "New registration: Uwimana Claire", status: "queued" },
    { id: "4", type: "measurement", description: "Measurement: Iradukunda Aline", status: "queued" },
    { id: "5", type: "measurement", description: "Measurement: Nkurunziza Paul", status: "queued" },
  ]);
  
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  
  // Count pending/synced records
  const pendingCount = records.filter(r => r.status !== "synced").length;
  const syncedCount = records.filter(r => r.status === "synced").length;
  
  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);
  
  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      toast.info("Internet restored! Auto-syncing pending records...");
      handleSync();
    }
  }, [isOnline]);
  
  const handleSync = async () => {
    if (pendingCount === 0) {
      toast.info("No records to sync!");
      return;
    }
    setIsSyncing(true);
    try {
      // Mark each record as syncing, then as synced (simulate API calls)
      const updatedRecords = [...records];
      for (let i = 0; i < updatedRecords.length; i++) {
        if (updatedRecords[i].status !== "synced") {
          updatedRecords[i].status = "syncing";
          setRecords([...updatedRecords]);
          await new Promise(resolve => setTimeout(resolve, 500)); // Simulate delay
          updatedRecords[i].status = "synced";
          setRecords([...updatedRecords]);
        }
      }
      setLastSync(new Date().toLocaleString("en-US", { hour: "numeric", minute: "2-digit" }));
      toast.success("All records synced successfully!");
    } catch (error) {
      toast.error("Failed to sync some records!");
    } finally {
      setIsSyncing(false);
    }
  };
  
  return (
    <PhoneFrame title="Sync data">
      <div className="p-4 space-y-4">
        <div className="rounded-2xl p-5 text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide opacity-85">
            {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {pendingCount > 0 ? `${pendingCount} record${pendingCount !== 1 ? "s" : ""} pending` : "All records synced"}
          </div>
          <div className="text-2xl font-semibold mt-2">
            {pendingCount > 0 ? "Ready to sync" : "All up to date"}
          </div>
          <div className="text-xs opacity-90">
            Last sync: {lastSync || "Never"}
          </div>
          {pendingCount > 0 && (
            <Button variant="secondary" className="mt-4 w-full gap-2" onClick={handleSync} disabled={isSyncing || !isOnline}>
              {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {isSyncing ? "Syncing..." : "Sync now"}
            </Button>
          )}
        </div>
        <div className="space-y-2">
          {records.map((record) => (
            <div key={record.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
              {record.status === "synced" ? (
                <CheckCircle2 className="h-4 w-4 text-[color:var(--success)]" />
              ) : record.status === "syncing" ? (
                <Loader2 className="h-4 w-4 text-primary animate-spin" />
              ) : (
                <CloudOff className="h-4 w-4 text-muted-foreground" />
              )}
              <div className="text-sm flex-1">{record.description}</div>
              <span className={`text-[11px] ${
                record.status === "synced" 
                  ? "text-[color:var(--success)]" 
                  : record.status === "syncing" 
                  ? "text-primary" 
                  : "text-muted-foreground"
              }`}>
                {record.status}
              </span>
            </div>
          ))}
          {records.length === 0 && (
            <div className="text-center py-6 text-sm text-muted-foreground">
              No pending records!
            </div>
          )}
        </div>
      </div>
    </PhoneFrame>
  );
}