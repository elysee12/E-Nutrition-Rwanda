import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Activity,
  ArrowRight,
  ClipboardList,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  ServerCrash,
  Smartphone,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { setRole, type Role } from "@/lib/role";
import { offlineSync } from "@/lib/offline-sync";
import { api, type UserRole } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth-guard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "E-Nutrition Rwanda — Sign in" },
      {
        name: "description",
        content:
          "Digital Health Informatics System for identifying and monitoring malnutrition among under-five children in Rwanda.",
      },
    ],
  }),
  beforeLoad: () => {
    // If already authenticated, skip the login page entirely
    if (isAuthenticated()) {
      const storedRole = (
        typeof window !== "undefined"
          ? (localStorage.getItem("enr-role") as Role)
          : null
      ) ?? "nutritionist";
      throw redirect({ to: dashboardFor(storedRole) });
    }
  },
  component: SignIn,
});

/** Map backend UserRole enum to frontend role slug */
const toFrontendRole = (r: UserRole): Role => {
  const map: Record<UserRole, Role> = {
    ADMIN: "admin",
    DATA_MANAGER: "data-manager",
    NURSE: "nutritionist",
    CHW: "chw",
  };
  return map[r] ?? "nutritionist";
};

/** Choose the correct dashboard path for a role */
const dashboardFor = (r: Role): string =>
  r === "chw" ? "/mobile/home" : "/web/dashboard";

// ─────────────────────────────────────────────────────────────────────────────

function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPw, setShowPw] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<"email" | "otp" | "reset">("email");
  const [resetEmail, setResetEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [stats, setStats] = useState<{ totalChildren: number; totalCHWs: number; totalFacilities: number } | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Load global, unfiltered stats for the homepage
  useEffect(() => {
    const loadStats = async () => {
      setIsLoadingStats(true);
      try {
        console.log("📊 Loading global stats from API...");
        const globalStats = await api.getGlobalStats();
        console.log("✅ API Response received:", globalStats);
        setStats({
          totalChildren: globalStats.totalChildren,
          totalCHWs: globalStats.totalCHWs,
          totalFacilities: globalStats.totalFacilities,
        });
      } catch (err) {
        console.error("❌ Failed to load stats for landing page", err);
        console.log("⚠️  Make sure your backend server is running at http://localhost:3000!");
      } finally {
        setIsLoadingStats(false);
      }
    };
    loadStats();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    // ── Client-side validation ──
    if (!email.trim() || !password) {
      setLoginError("Enter your email and password.");
      return;
    }
    if (!/.+@.+\..+/.test(email)) {
      setLoginError("Enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setLoginError("Password must be at least 6 characters.");
      return;
    }

    setSubmitting(true);

    try {
      // ── Hit the real backend ──
      const response = await api.login(email.trim().toLowerCase(), password);

      // ── Persist session ──
      const frontendRole = toFrontendRole(response.user.role);
      setRole(frontendRole);
      localStorage.setItem("user", JSON.stringify(response.user));
      
      // Refresh sync context for the new user
      offlineSync.refreshUserContext();

      // ── Navigate ──
      toast.success(`Welcome back, ${response.user.name}!`);
      router.navigate({ to: dashboardFor(frontendRole) });
    } catch (err: any) {
      const msg: string = err?.message ?? "";

      // Map backend messages to user-friendly copy
      if (
        err?.statusCode === 401 ||
        msg.toLowerCase().includes("invalid credentials") ||
        msg.toLowerCase().includes("invalid email or password")
      ) {
        setLoginError("Invalid email or password. Please try again.");
      } else if (msg.toLowerCase().includes("not active")) {
        setLoginError(
          "Your account is suspended. Contact your facility administrator."
        );
      } else if (
        msg.toLowerCase().includes("failed to fetch") ||
        err?.name === "TypeError"
      ) {
        setLoginError(
          "Cannot reach the server. Make sure the backend is running on http://localhost:3000."
        );
      } else {
        setLoginError(msg || "Login failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendOtp = async () => {
    if (!/.+@.+\..+/.test(resetEmail)) {
      toast.error("Enter a valid email");
      return;
    }
    setSubmitting(true);
    try {
      await api.sendForgotPasswordOtp(resetEmail.trim().toLowerCase());
      toast.success("OTP sent successfully to your email!");
      setForgotStep("otp");
    } catch (err: any) {
      toast.error(err?.message || "Failed to send OTP");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }
    setSubmitting(true);
    try {
      await api.verifyForgotPasswordOtp(resetEmail.trim().toLowerCase(), otp);
      toast.success("OTP verified!");
      setForgotStep("reset");
    } catch (err: any) {
      toast.error(err?.message || "Failed to verify OTP");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setSubmitting(true);
    try {
      await api.resetPassword(resetEmail.trim().toLowerCase(), otp, newPassword);
      toast.success("Password reset successfully!");
      setForgotOpen(false);
      setForgotStep("email");
      setResetEmail("");
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to reset password");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForgotFlow = () => {
    setForgotStep("email");
    setResetEmail("");
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background" suppressHydrationWarning>
      {/* ── Left decorative panel ── */}
      <aside className="relative hidden lg:flex flex-col justify-between p-12 text-primary-foreground overflow-hidden bg-gradient-to-br from-[#16a34a] via-[#059669] to-[#047857]">
        <div className="flex items-center gap-3 relative z-10">
          <div className="grid place-items-center h-12 w-12 rounded-xl bg-white/20 backdrop-blur-sm shadow-lg">
            <Activity className="h-7 w-7" />
          </div>
          <div>
            <div className="font-bold tracking-tight text-lg">E-Nutrition Rwanda</div>
            <div className="text-xs text-white/90">Ministry of Health · RBC</div>
          </div>
        </div>

        <div className="relative z-10 space-y-6 max-w-md">
          <h2 className="text-4xl font-bold leading-tight">
            Ending child malnutrition with real-time, community-driven data.
          </h2>
          <p className="text-white/90 text-base leading-relaxed">
            A national surveillance platform connecting CHWs in every village to
            nutritionists, health facilities and DHIS2 — with offline-first
            screening, WHO z-score classification, and instant referrals.
          </p>
          <div className="grid grid-cols-3 gap-3 pt-3">
            <Stat label="All children covered" value={isLoadingStats || !stats ? "..." : stats.totalChildren.toLocaleString()} />
            <Stat label="Active CHWs" value={isLoadingStats || !stats ? "..." : stats.totalCHWs.toLocaleString()} />
            <Stat label="Hospital (Facility) covered" value={isLoadingStats || !stats ? "..." : stats.totalFacilities.toLocaleString()} />
          </div>
        </div>

        <div className="relative z-10 text-xs text-white/75 flex items-center gap-2">
          <ClipboardList className="h-3.5 w-3.5" /> Compliant with Rwanda MoH
          data standards · DHIS2 v2.40
        </div>

        {/* decorative blurs */}
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-white/5 blur-3xl" />
      </aside>

      {/* ── Right form panel ── */}
      <section className="flex items-center justify-center px-6 py-10 overflow-y-auto">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-6">
            <div className="grid place-items-center h-10 w-10 rounded-xl text-white bg-gradient-to-br from-[#16a34a] to-[#059669] shadow-md">
              <Activity className="h-5 w-5" />
            </div>
            <div className="font-bold">E-Nutrition Rwanda</div>
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight">Sign in to your account</h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              Secure access for authorised health personnel.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4" noValidate suppressHydrationWarning>
            {/* ── Inline error banner ── */}
            {loginError && (
              <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <ServerCrash className="h-4 w-4 mt-0.5 shrink-0 text-red-500" />
                <span>{loginError}</span>
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs text-muted-foreground">
                Work email
              </Label>
              <div className="relative">
                <Mail className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setLoginError(null); }}
                  placeholder="name@moh.gov.rw"
                  autoComplete="email"
                  className="pl-9 h-10"
                  disabled={submitting}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs text-muted-foreground">
                  Password
                </Label>
                <button
                  type="button"
                  onClick={() => setForgotOpen(true)}
                  className="text-xs text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setLoginError(null); }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="pl-9 pr-10 h-10"
                  disabled={submitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Remember + 2FA */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <Checkbox
                  checked={remember}
                  onCheckedChange={(v) => setRemember(!!v)}
                />
                Keep me signed in
              </label>
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-[#16a34a]" /> 2FA enabled
              </span>
            </div>

            <Button
              type="submit"
              className="w-full gap-2 h-11 bg-gradient-to-r from-[#16a34a] to-[#059669] hover:from-[#15803d] hover:to-[#047857] shadow-md font-semibold"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Signing in…
                </>
              ) : (
                <>Sign in <ArrowRight className="h-4 w-4" /></>
              )}
            </Button>
          </form>

          <Card className="p-3 bg-muted/40 border-dashed">
            <div className="text-[11px] text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Note:</strong> Your dashboard
              is automatically selected from your assigned role. Contact your
              facility's Data Manager or Administrator to request access.
            </div>
          </Card>

          {/* APK Download Option */}
          <div className="pt-2">
            <a 
              href="/enr-mobile.apk"
              download="enr-mobile.apk"
              className="w-full flex items-center justify-between p-4 rounded-2xl border border-emerald-100 bg-emerald-50/50 hover:bg-emerald-50 hover:border-emerald-200 transition-all group cursor-pointer no-underline"
            >
              <div className="flex items-center gap-3">
                <div className="grid place-items-center h-10 w-10 rounded-xl bg-emerald-500 text-white shadow-sm group-hover:scale-110 transition-transform">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">Download Mobile App</div>
                  <div className="text-[11px] text-emerald-700 font-medium">Get the Android APK for field work</div>
                </div>
              </div>
              <Download className="h-5 w-5 text-emerald-600" />
            </a>
          </div>

          <div className="text-center text-xs text-muted-foreground">
            Need access?{" "}
            <a href="#" className="text-primary hover:underline">
              Contact your facility administrator
            </a>
          </div>
        </div>
      </section>

      {/* ── Forgot password dialog ── */}
      <Dialog open={forgotOpen} onOpenChange={(o) => { if (!o) resetForgotFlow(); setForgotOpen(o); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {forgotStep === "email" && "Reset your password"}
              {forgotStep === "otp" && "Verify OTP"}
              {forgotStep === "reset" && "Set new password"}
            </DialogTitle>
            <DialogDescription>
              {forgotStep === "email" && "Enter the email associated with your account and we will send you a 6-digit OTP."}
              {forgotStep === "otp" && "Enter the 6-digit OTP sent to your email address."}
              {forgotStep === "reset" && "Enter and confirm your new password."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {forgotStep === "email" && (
              <div className="space-y-1.5">
                <Label htmlFor="reset-email" className="text-xs text-muted-foreground">
                  Email address
                </Label>
                <Input
                  id="reset-email"
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="name@moh.gov.rw"
                />
              </div>
            )}
            {forgotStep === "otp" && (
              <div className="space-y-1.5">
                <Label htmlFor="otp" className="text-xs text-muted-foreground">
                  6-digit OTP
                </Label>
                <Input
                  id="otp"
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                />
              </div>
            )}
            {forgotStep === "reset" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="new-password" className="text-xs text-muted-foreground">
                    New password
                  </Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password" className="text-xs text-muted-foreground">
                    Confirm new password
                  </Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter className="flex gap-2">
            {forgotStep !== "email" && (
              <Button variant="outline" onClick={resetForgotFlow}>
                Back
              </Button>
            )}
            <Button variant="outline" onClick={() => { resetForgotFlow(); setForgotOpen(false); }}>
              Cancel
            </Button>
            <Button 
              onClick={forgotStep === "email" ? handleSendOtp : forgotStep === "otp" ? handleVerifyOtp : handleResetPassword}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin mr-2" />
                  Please wait…
                </>
              ) : (
                forgotStep === "email" ? "Send OTP" : forgotStep === "otp" ? "Verify OTP" : "Reset password"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/15 backdrop-blur-sm p-3.5 border border-white/20 shadow-lg">
      <div className="text-xl font-bold">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-white/80 font-medium">
        {label}
      </div>
    </div>
  );
}
