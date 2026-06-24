import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PhoneFrame } from "@/components/mobile/PhoneFrame";
import { Button } from "@/components/ui/button";
import { CheckCircle2, CloudOff, RefreshCw, Wifi, WifiOff, Loader2, AlertCircle, Trash2, Edit3 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { offlineSync, type SyncAction } from "@/lib/offline-sync";

export const Route = createFileRoute("/mobile/sync")({ component: Sync });

function Sync() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<SyncAction[]>(offlineSync.getActions());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(offlineSync.getLastSyncTime());
  const [retryingId, setRetryingId] = useState<string | null>(null);
  
  // Count pending records
  const pendingCount = records.filter(r => r.status !== "synced").length;
  
  // Refresh records when they change
  useEffect(() => {
    const handleUpdate = () => {
      setRecords(offlineSync.getActions());
      setLastSync(offlineSync.getLastSyncTime());
    };
    window.addEventListener("enr-sync-updated", handleUpdate);
    return () => window.removeEventListener("enr-sync-updated", handleUpdate);
  }, []);
  
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
    if (isOnline && pendingCount > 0 && !isSyncing) {
      toast.info("Internet restored! Auto-syncing pending records...");
      handleSync();
    }
  }, [isOnline]);
  
  const handleSync = async () => {
    if (pendingCount === 0) {
      toast.info("No records to sync!");
      return;
    }
    if (!isOnline) {
      toast.error("No internet connection!");
      return;
    }

    setIsSyncing(true);
    try {
      const results = await offlineSync.syncAll();
      const now = new Date().toLocaleString("en-US", { hour: "numeric", minute: "2-digit" });
      setLastSync(now);
      offlineSync.setLastSyncTime(now);
      
      if (results.failed === 0) {
        toast.success(`Synced ${results.success} records!`);
      } else {
        toast.warning(`Synced ${results.success} records, ${results.failed} failed.`);
      }
    } catch (error) {
      toast.error("An error occurred during synchronization");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRetry = async (record: SyncAction) => {
    if (!isOnline) {
      toast.error("Cannot retry: No internet connection");
      return;
    }
    
    setRetryingId(record.id);
    try {
      const success = await offlineSync.retryAction(record.id);
      if (success) {
        toast.success("Record synced successfully!");
      } else {
        toast.error("Failed to sync record");
      }
    } catch (error) {
      toast.error("Failed to retry sync");
    } finally {
      setRetryingId(null);
    }
  };

  const handleDelete = (record: SyncAction) => {
    if (confirm(`Delete "${record.description}"?`)) {
      offlineSync.removeAction(record.id);
      toast.success("Record deleted");
    }
  };

  const clearSynced = () => {
    offlineSync.clearSynced();
    toast.success("Sync history cleared");
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

        <div className="flex items-center justify-between px-1">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sync Queue</div>
          {records.some(r => r.status === "synced") && (
            <button onClick={clearSynced} className="text-[10px] font-bold text-primary flex items-center gap-1">
              <Trash2 className="h-3 w-3" /> Clear synced
            </button>
          )}
        </div>

        <div className="space-y-2">
          {records.slice().reverse().map((record) => (
            <div key={record.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
              {record.status === "synced" ? (
                <CheckCircle2 className="h-4 w-4 text-[color:var(--success)]" />
              ) : record.status === "syncing" || retryingId === record.id ? (
                <Loader2 className="h-4 w-4 text-primary animate-spin" />
              ) : record.status === "error" ? (
                <AlertCircle className="h-4 w-4 text-destructive" />
              ) : (
                <CloudOff className="h-4 w-4 text-muted-foreground" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{record.description}</div>
                <div className="text-[10px] text-muted-foreground">
                  {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {record.error && (
                    <span className="text-destructive"> · Error: {record.error}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {/* Only show edit for registration records that are not synced yet */}
                {record.type === 'registration' && record.status !== 'synced' && record.status !== 'syncing' && (
                  <button
                    onClick={() => {
                      // Navigate to registration form with syncActionId in search params
                      navigate({ 
                        to: '/mobile/register', 
                        search: { syncActionId: record.id }
                      });
                    }}
                    className="p-1.5 rounded-full hover:bg-muted transition-colors text-primary"
                    title="Edit record"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                )}
                {record.status === "error" && (
                  <>
                    <button
                      onClick={() => handleRetry(record)}
                      disabled={!isOnline || retryingId !== null}
                      className="p-1.5 rounded-full hover:bg-muted transition-colors text-primary"
                      title="Retry sync"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(record)}
                      className="p-1.5 rounded-full hover:bg-muted transition-colors text-destructive"
                      title="Delete record"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
                {record.status !== 'error' && record.status !== 'synced' && (
                  <button
                    onClick={() => handleDelete(record)}
                    className="p-1.5 rounded-full hover:bg-muted transition-colors text-destructive"
                    title="Delete record"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
                <span className={`text-[11px] font-bold capitalize ${
                  record.status === "synced" 
                    ? "text-[color:var(--success)]" 
                    : record.status === "syncing" 
                    ? "text-primary" 
                    : record.status === "error"
                    ? "text-destructive"
                    : "text-muted-foreground"
                }`}>
                  {record.status}
                </span>
              </div>
            </div>
          ))}
          {records.length === 0 && (
            <div className="text-center py-10 rounded-2xl border border-dashed border-border bg-muted/30">
              <CloudOff className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
              <div className="text-sm text-muted-foreground">No records in sync queue</div>
            </div>
          )}
        </div>
      </div>
    </PhoneFrame>
  );
}