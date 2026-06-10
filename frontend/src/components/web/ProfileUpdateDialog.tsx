import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, User, Lock, Eye, EyeOff } from "lucide-react";

interface ProfileUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: {
    name: string;
    email: string;
    phone?: string;
  };
  onProfileUpdated: () => void;
}

export function ProfileUpdateDialog({
  open,
  onOpenChange,
  currentUser,
  onProfileUpdated,
}: ProfileUpdateDialogProps) {
  // Profile update state
  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);
  const [phone, setPhone] = useState(currentUser.phone || "");
  const [profileLoading, setProfileLoading] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Update profile information
  const handleUpdateProfile = async () => {
    try {
      setProfileLoading(true);

      // Validate inputs
      if (!name.trim()) {
        toast.error("Name is required");
        return;
      }
      if (!email.trim()) {
        toast.error("Email is required");
        return;
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        toast.error("Please enter a valid email address");
        return;
      }

      // Phone validation (if provided)
      if (phone && !/^(\+?25)?(07[2-9]\d{7})$/.test(phone)) {
        toast.error("Please enter a valid Rwandan phone number");
        return;
      }

      await api.updateProfile({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
      });

      toast.success("Profile updated successfully!");
      onProfileUpdated();
    } catch (error: any) {
      console.error("Failed to update profile:", error);
      toast.error(error.message || "Failed to update profile");
    } finally {
      setProfileLoading(false);
    }
  };

  // Change password
  const handleChangePassword = async () => {
    try {
      setPasswordLoading(true);

      // Validate inputs
      if (!currentPassword) {
        toast.error("Current password is required");
        return;
      }
      if (!newPassword) {
        toast.error("New password is required");
        return;
      }
      if (newPassword.length < 6) {
        toast.error("New password must be at least 6 characters long");
        return;
      }
      if (newPassword !== confirmPassword) {
        toast.error("New passwords do not match");
        return;
      }
      if (currentPassword === newPassword) {
        toast.error("New password must be different from current password");
        return;
      }

      await api.changePassword(currentPassword, newPassword);

      toast.success("Password changed successfully!");
      // Clear password fields
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("Failed to change password:", error);
      toast.error(error.message || "Failed to change password");
    } finally {
      setPasswordLoading(false);
    }
  };

  // Reset form when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset profile fields
      setName(currentUser.name);
      setEmail(currentUser.email);
      setPhone(currentUser.phone || "");
      
      // Reset password fields
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-slate-900">
            Update Profile
          </DialogTitle>
          <DialogDescription>
            Update your personal information and change your password
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile Info
            </TabsTrigger>
            <TabsTrigger value="password" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Password
            </TabsTrigger>
          </TabsList>

          {/* Profile Information Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                  Update your name, email, and phone number
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={profileLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">
                    Email Address <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={profileLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="0788123456"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={profileLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Format: 0788123456 or +250788123456
                  </p>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleOpenChange(false)}
                    disabled={profileLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleUpdateProfile}
                    disabled={profileLoading}
                    className="bg-gradient-to-r from-emerald-500 to-teal-600"
                  >
                    {profileLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      "Update Profile"
                    )}
                  </Button>
                </DialogFooter>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Password Change Tab */}
          <TabsContent value="password">
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>
                  Enter your current password to set a new one
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">
                    Current Password <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? "text" : "password"}
                      placeholder="Enter your current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      disabled={passwordLoading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      disabled={passwordLoading}
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="h-4 w-4 text-slate-500" />
                      ) : (
                        <Eye className="h-4 w-4 text-slate-500" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">
                    New Password <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={passwordLoading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      disabled={passwordLoading}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4 text-slate-500" />
                      ) : (
                        <Eye className="h-4 w-4 text-slate-500" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Must be at least 6 characters long
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">
                    Confirm New Password <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={passwordLoading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={passwordLoading}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-slate-500" />
                      ) : (
                        <Eye className="h-4 w-4 text-slate-500" />
                      )}
                    </Button>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleOpenChange(false)}
                    disabled={passwordLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleChangePassword}
                    disabled={passwordLoading}
                    className="bg-gradient-to-r from-emerald-500 to-teal-600"
                  >
                    {passwordLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Changing...
                      </>
                    ) : (
                      "Change Password"
                    )}
                  </Button>
                </DialogFooter>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
