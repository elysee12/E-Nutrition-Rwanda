import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PhoneFrame } from "@/components/mobile/PhoneFrame";
import { Bell, Check, Trash2, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, type Notification } from "@/lib/api";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

export const Route = createFileRoute("/mobile/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.getNotifications();
      setNotifications(response.notifications);
      setUnreadCount(response.unreadCount);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await api.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
      toast.error("Failed to mark as read");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true }))
      );
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch (err) {
      console.error(err);
      toast.error("Failed to mark all as read");
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      await api.deleteNotification(notificationId);
      const wasUnread = notifications.find(
        (n) => n.id === notificationId
      )?.read === false;
      setNotifications((prev) =>
        prev.filter((n) => n.id !== notificationId)
      );
      if (wasUnread) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
      toast.success("Notification deleted");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete notification");
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (loading) {
    return (
      <PhoneFrame title="Notifications">
        <div className="p-4 flex items-center justify-center min-h-[300px]">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        </div>
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame title="Notifications">
      <div className="p-4 flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ to: "/mobile/home" })}
            className="p-0 h-auto"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="text-xs"
            >
              Mark all as read
            </Button>
          )}
        </div>

        <ScrollArea className="flex-1">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No notifications</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded-lg border ${
                    notification.read
                      ? "bg-background"
                      : "bg-primary/5 border-primary/20"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-sm">
                          {notification.title}
                        </h4>
                        {!notification.read && (
                          <span className="h-2 w-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getTimeAgo(notification.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1">
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleMarkAsRead(notification.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(notification.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </PhoneFrame>
  );
}
