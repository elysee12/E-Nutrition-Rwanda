import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { TopBar } from "@/components/web/TopBar";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useRole } from "@/lib/role";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";
import { handleError } from "@/lib/error-handler";

export const Route = createFileRoute("/web/settings")({
  head: () => ({ meta: [{ title: "Settings — E-Nutrition Rwanda" }] }),
  component: Settings,
});

// Settings storage key
const SETTINGS_STORAGE_KEY = "enr-user-settings";

// Default settings
interface UserSettings {
  notifications: {
    criticalSAM: boolean;
    missedFollowups: boolean;
    weeklyDigest: boolean;
    dhis2Errors: boolean;
  };
}

const defaultSettings: UserSettings = {
  notifications: {
    criticalSAM: true,
    missedFollowups: true,
    weeklyDigest: false,
    dhis2Errors: true,
  },
};

function Settings() {
  const role = useRole();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);

  // Load profile and settings
  useEffect(() => {
    const loadData = async () => {
      // Debug: Log the role for troubleshooting
      console.log("Settings page - Current role:", role);
      
      // Check if user is admin (handle both frontend and backend role formats)
      const normalizedRole = role?.toLowerCase();
      const isAdmin = normalizedRole === "admin";
      
      console.log("Settings page - Is admin?", isAdmin);
      
      if (!isAdmin) {
        // Only show error and redirect if we're sure the role is loaded and it's not admin
        if (role) {
          toast.error("Access denied. Settings are only accessible to administrators.");
          navigate({ to: "/web/dashboard" });
        }
        return;
      }

      try {
        const userProfile = await api.getProfile();
        console.log("Settings page - User profile:", userProfile);
        setProfile(userProfile);
        
        // Initialize profile form with current data
        setProfileForm({
          name: userProfile.name || "",
          email: userProfile.email || "",
          phone: userProfile.phone || "",
        });

        // Load settings from localStorage
        const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (stored) {
          setSettings(JSON.parse(stored));
        }
      } catch (err) {
        const errorMessage = handleError(err, "Failed to load profile");
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [role, navigate]);

  // Save settings to localStorage
  const saveSettings = () => {
    try {
      setSaving(true);
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      toast.success("Settings saved successfully!");
    } catch (err) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  // Handle notification toggle
  const handleNotificationToggle = (key: keyof UserSettings['notifications'], value: boolean) => {
    const newSettings = {
      ...settings,
      notifications: {
        ...settings.notifications,
        [key]: value,
      },
    };
    setSettings(newSettings);
    // Auto-save on toggle
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
    toast.success("Setting updated");
  };

  // Handle profile update
  const handleProfileUpdate = async () => {
    try {
      setSaving(true);
      await api.updateProfile({
        name: profileForm.name,
        email: profileForm.email,
        phone: profileForm.phone,
      });
      
      // Refresh profile data
      const updatedProfile = await api.getProfile();
      setProfile(updatedProfile);
      
      // Update stored user object
      localStorage.setItem("user", JSON.stringify(updatedProfile));
      
      setIsEditingProfile(false);
      toast.success("Profile updated successfully!");
    } catch (err) {
      const errorMessage = handleError(err, "Failed to update profile");
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // Cancel profile editing
  const handleCancelEdit = () => {
    setProfileForm({
      name: profile?.name || "",
      email: profile?.email || "",
      phone: profile?.phone || "",
    });
    setIsEditingProfile(false);
  };

  // Get facility display text for Admin
  const getFacilityDisplay = () => {
    if (profile?.role === "ADMIN") {
      return "System Manager (Ministry of Health)";
    }
    return profile?.facility?.name || "Not assigned";
  };

  // Redirect if not admin
  if (role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 max-w-md">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="h-16 w-16 rounded-full bg-red-100 text-red-600 grid place-items-center">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Access Denied</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Settings are only accessible to administrators.
              </p>
            </div>
            <Button onClick={() => navigate({ to: "/web/dashboard" })}>
              Return to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <>
        <TopBar title="Settings" subtitle="Profile, preferences and security" />
        <div className="p-6 flex items-center justify-center min-h-[300px]">
          <div className="text-sm text-muted-foreground">Loading settings...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Settings" subtitle="Profile, preferences and security" />
      <div className="p-6 grid gap-5 max-w-4xl">
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Profile</h3>
            {!isEditingProfile ? (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsEditingProfile(true)}
              >
                Edit Profile
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleCancelEdit}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button 
                  size="sm"
                  onClick={handleProfileUpdate}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            )}
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Full name</Label>
              {isEditingProfile ? (
                <Input 
                  value={profileForm.name} 
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  placeholder="Enter your full name"
                />
              ) : (
                <Input value={profile?.name || ""} readOnly className="bg-muted" />
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              {isEditingProfile ? (
                <Input 
                  type="email"
                  value={profileForm.email} 
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  placeholder="Enter your email"
                />
              ) : (
                <Input value={profile?.email || ""} readOnly className="bg-muted" />
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Phone</Label>
              {isEditingProfile ? (
                <Input 
                  value={profileForm.phone || ""} 
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  placeholder="Enter your phone number"
                />
              ) : (
                <Input value={profile?.phone || "Not set"} readOnly className="bg-muted" />
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Role</Label>
              <Input value={profile?.role || ""} readOnly className="bg-muted" />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs">Facility</Label>
              <Input 
                value={getFacilityDisplay()} 
                readOnly 
                className="bg-muted font-medium"
              />
            </div>
          </div>
          {!isEditingProfile && (
            <p className="text-xs text-muted-foreground mt-4">
              As an administrator, you can update your own profile information directly.
            </p>
          )}
        </Card>
        <Card className="p-6 space-y-4">
          <h3 className="font-semibold text-sm">Notifications</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <span className="text-sm font-medium">Critical SAM alerts</span>
                <p className="text-xs text-muted-foreground mt-1">
                  Receive notifications when severe acute malnutrition is detected
                </p>
              </div>
              <Switch 
                checked={settings.notifications.criticalSAM} 
                onCheckedChange={(checked) => handleNotificationToggle('criticalSAM', checked)}
              />
            </div>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <span className="text-sm font-medium">Missed follow-ups</span>
                <p className="text-xs text-muted-foreground mt-1">
                  Alert when scheduled follow-ups are missed
                </p>
              </div>
              <Switch 
                checked={settings.notifications.missedFollowups} 
                onCheckedChange={(checked) => handleNotificationToggle('missedFollowups', checked)}
              />
            </div>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <span className="text-sm font-medium">Weekly performance digest</span>
                <p className="text-xs text-muted-foreground mt-1">
                  Summary of activities and metrics every week
                </p>
              </div>
              <Switch 
                checked={settings.notifications.weeklyDigest} 
                onCheckedChange={(checked) => handleNotificationToggle('weeklyDigest', checked)}
              />
            </div>
            <div className="flex items-center justify-between pb-3">
              <div>
                <span className="text-sm font-medium">DHIS2 sync errors</span>
                <p className="text-xs text-muted-foreground mt-1">
                  Notify when data synchronization fails
                </p>
              </div>
              <Switch 
                checked={settings.notifications.dhis2Errors} 
                onCheckedChange={(checked) => handleNotificationToggle('dhis2Errors', checked)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Settings are saved automatically when you toggle them.
          </p>
        </Card>
      </div>
    </>
  );
}