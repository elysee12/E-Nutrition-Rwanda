import { Bell, Search, Wifi, LogOut, Edit, Trash2, CheckCircle2, Inbox, AlertCircle, Calendar, UserPlus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ROLE_LABEL, useRole, getDashboardName, getStoredUser, clearAuth } from '@/lib/role';
import { api, type Notification as ApiNotification } from '@/lib/api';
import { toast } from 'sonner';
import { ProfileUpdateDialog } from './ProfileUpdateDialog';

function getNotificationIcon(type: ApiNotification['type']) {
  switch (type) {
    case 'ASSESSMENT_CREATED':
      return <AlertCircle className="h-4 w-4 text-blue-600" />;
    case 'FOLLOWUP_DUE':
      return <Calendar className="h-4 w-4 text-orange-600" />;
    case 'USER_CREATED':
      return <UserPlus className="h-4 w-4 text-green-600" />;
    case 'REFERRAL_RECEIVED':
      return <Inbox className="h-4 w-4 text-purple-600" />;
    default:
      return <Bell className="h-4 w-4 text-gray-600" />;
  }
}

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export function TopBar({ title, subtitle }: { title: string; subtitle?: string }) {
  const role = useRole();
  const [user, setUser] = useState<any>(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const dashboardName = role ? getDashboardName(role) : '';

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  // Refresh user data on storage change
  useEffect(() => {
    const updateUser = () => setUser(getStoredUser());
    window.addEventListener('storage', updateUser);
    return () => window.removeEventListener('storage', updateUser);
  }, []);

  const fetchNotifications = async () => {
    if (!user?.id) return;
    try {
      setLoadingNotifications(true);
      const data = await api.getNotifications({ limit: 20 });
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    } finally {
      setLoadingNotifications(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [user?.id]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await api.markAsRead(notificationId);
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark as read', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const handleDeleteNotification = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    try {
      await api.deleteNotification(notificationId);
      const removed = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      if (removed && !removed.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Failed to delete notification', err);
    }
  };

  const handleClearAll = async () => {
    try {
      await api.clearAllNotifications();
      setNotifications([]);
      setUnreadCount(0);
      toast.success('All notifications cleared');
    } catch (err) {
      console.error('Failed to clear notifications', err);
    }
  };

  const handleLogout = () => {
    // Clear all auth state first
    clearAuth();
    api.clearToken();
    setUser(null);
    toast.success('Logged out successfully');
    // Hard redirect — bypasses router cache and ensures a clean slate
    window.location.href = '/';
  };

  // Refresh user data after profile update
  const handleProfileUpdated = async () => {
    try {
      const updatedUser = await api.getProfile();
      // Update localStorage with new user data
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setProfileDialogOpen(false);
    } catch (error) {
      console.error('Failed to refresh profile:', error);
    }
  };

  // Get user initials
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const displayName = user?.name || 'User';
  const displayInitials = user ? getInitials(user.name) : 'U';
  const displayFacility = user?.facility?.name || 'Not assigned';
  const displayRole = user?.role ? ROLE_LABEL[role] : 'User';

  return (
    <>
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-slate-200 shadow-lg">
        <div className="flex items-center gap-6 px-8 py-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-4 mb-1.5">
              <h1 className="text-xl font-black tracking-tight text-slate-900 truncate">{title}</h1>
              <Badge className="text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-0 shadow-md px-3 py-1">
                {dashboardName}
              </Badge>
            </div>
            {subtitle && <p className="text-sm text-slate-600 truncate font-medium">{subtitle}</p>}
          </div>
          <div className="hidden md:flex items-center gap-3 rounded-xl border-2 border-slate-200 bg-white px-4 w-80 hover:border-emerald-300 focus-within:border-emerald-500 transition-all shadow-sm">
            <Search className="h-5 w-5 text-slate-400" />
            <Input placeholder="Search children, CHWs, facilities…" className="border-0 shadow-none focus-visible:ring-0 px-0 h-10 bg-transparent text-sm font-medium" />
          </div>
          <Badge className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-0 shadow-md px-3 py-1.5 font-semibold">
            <Wifi className="h-4 w-4" /> Synced
          </Badge>
          
          {/* Notification Bell */}
          <DropdownMenu open={notificationsOpen} onOpenChange={(open) => {
            setNotificationsOpen(open);
            if (open) fetchNotifications();
          }}>
            <DropdownMenuTrigger asChild>
              <button className="relative grid place-items-center h-11 w-11 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 hover:from-emerald-50 hover:to-teal-50 border-2 border-slate-200 hover:border-emerald-300 transition-all shadow-md">
                <Bell className="h-5 w-5 text-slate-700" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center shadow-lg animate-pulse">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="flex items-center justify-between px-4 py-3">
                <DropdownMenuLabel className="p-0 m-0 font-semibold">Notifications</DropdownMenuLabel>
                {notifications.length > 0 && (
                  <div className="flex gap-2">
                    {unreadCount > 0 && (
                      <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead} className="h-8 text-xs">
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        Mark all read
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={handleClearAll} className="h-8 text-xs text-red-600">
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Clear all
                    </Button>
                  </div>
                )}
              </div>
              <DropdownMenuSeparator />
              <div className="max-h-[400px] overflow-y-auto">
                {loadingNotifications ? (
                  <div className="p-4 flex items-center justify-center text-slate-500 text-sm">
                    Loading notifications...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    <Inbox className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p className="text-sm font-medium">No notifications</p>
                    <p className="text-xs mt-1">You're all caught up!</p>
                  </div>
                ) : (
                  <DropdownMenuGroup>
                    {notifications.map((notification) => (
                      <DropdownMenuItem 
                        key={notification.id} 
                        onClick={() => !notification.read && handleMarkAsRead(notification.id)} 
                        className={`
                          p-4 cursor-pointer border-b border-slate-100
                          ${!notification.read ? 'bg-slate-50' : 'bg-transparent'}
                        `}
                      >
                        <div className="flex gap-3 items-start w-full">
                          <div className="mt-1 p-2 rounded-full bg-slate-100">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className={`text-sm font-semibold ${!notification.read ? 'text-slate-900' : 'text-slate-600'}`}>
                                  {notification.title}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                  {notification.message}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 ml-2">
                                <p className="text-xs text-slate-400 whitespace-nowrap">
                                  {formatTimeAgo(notification.createdAt)}
                                </p>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6 text-slate-400 hover:text-red-600 hover:bg-red-50" 
                                  onClick={(e) => handleDeleteNotification(e, notification.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                          {!notification.read && (
                            <div className="mt-2 h-2 w-2 rounded-full bg-blue-500" />
                          )}
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <div className="flex items-center gap-4 pl-4 border-l-2 border-slate-200">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-4 hover:opacity-80 transition-opacity">
                  <Avatar className="h-11 w-11 ring-4 ring-emerald-100 shadow-lg cursor-pointer">
                    <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-sm font-black">
                      {displayInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:block leading-tight text-left">
                    <div className="text-sm font-black text-slate-900">Welcome, {displayName}</div>
                    <div className="text-xs text-slate-600 font-semibold">{displayRole} · {displayFacility}</div>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-xs">
                  <strong>Email:</strong> {user?.email || 'N/A'}
                </DropdownMenuItem>
                <DropdownMenuItem className="text-xs">
                  <strong>Code:</strong> {user?.code || 'N/A'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setProfileDialogOpen(true)} className="cursor-pointer">
                  <Edit className="h-4 w-4 mr-2" />
                  Update Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600 cursor-pointer">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Profile Update Dialog */}
      {user && (
        <ProfileUpdateDialog
          open={profileDialogOpen}
          onOpenChange={setProfileDialogOpen}
          currentUser={{
            name: user.name,
            email: user.email,
            phone: user.phone,
          }}
          onProfileUpdated={handleProfileUpdated}
        />
      )}
    </>
  );
}
