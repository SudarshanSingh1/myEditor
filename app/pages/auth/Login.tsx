/* eslint-disable react-hooks/exhaustive-deps */
/* oxlint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { fetchApi } from "../../lib/api";
import { useUserStore } from "../../stores/useUserStore";
import { useSystemStore } from "../../stores/useSystemStore";
import { Mail, Lock, AlertCircle, ArrowRight, Eye, EyeOff } from "lucide-react";
import { SudarshanaMandala } from "../../components/ui/SplashLoader";
import { useShallow } from 'zustand/react/shallow';

interface LoginProps {
  isAdminPortal?: boolean;
}

export default function Login({ isAdminPortal = false }: LoginProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isExpired = searchParams.get("expired") === "true";

  const { isAuthenticated, user, isLoading: isUserLoading } = useUserStore(useShallow(state => ({ isAuthenticated: state.isAuthenticated, user: state.user, isLoading: state.isLoading })));
  const { _isMaintenanceMode, _allowAdmin } = useSystemStore();
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!isUserLoading && isAuthenticated && user) {
      const role = (user.role || "").toUpperCase();
      const isSuperAdmin = role === "OWNER";
      const isAdmin = role === "ADMIN";
      const isMod = role === "MODERATOR";
      
      const isMaint = useSystemStore.getState().isMaintenanceMode;
      const allowAdmin = useSystemStore.getState().allowAdmin;
      const perms: string[] = user.effective_permissions || useUserStore.getState().permissions || [];
      const canBypass = isSuperAdmin || perms.includes("*") || perms.includes("system.maintenance.bypass") || ((isAdmin || isMod) && allowAdmin);
      const isStaff = isSuperAdmin || isAdmin || isMod || canBypass;

      if (isAdminPortal && !isStaff) {
        fetchApi("/auth/logout", { method: "POST" }).catch(() => {});
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        setError("Access Denied: Restricted to Administrators, Moderators, and Owners only.");
        return;
      }

      if (isMaint && !canBypass) {
        navigate("/maintenance", { replace: true });
      } else if (isSuperAdmin) {
        navigate("/super-admin", { replace: true });
      } else if (isAdmin || isMod) {
        navigate("/app/admin", { replace: true });
      } else {
        navigate("/app/dashboard", { replace: true });
      }
    }
  }, [isUserLoading, isAuthenticated, user, navigate]);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [is2FA, setIs2FA] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [twoFaToken, setTwoFaToken] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  // Clear error when user types
  useEffect(() => {
    if (error) setError("");
  }, [email, password, totpCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (is2FA) {
      if (!totpCode || totpCode.length !== 6) {
        setError("Please enter a valid 6-digit code");
        return;
      }
      setIsLoading(true);
      setError("");
      try {
        // We need an endpoint to verify the 2FA token to issue the real JWT
        const response = await fetchApi("/auth/verify-2fa", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${twoFaToken}`
          },
          body: JSON.stringify({ code: totpCode }),
        });
        
        if (response.success) {
            // Get profile and login
            const { authController } = await import('../../services/AuthController');
            await authController.bootstrap(true);
            const userState = useUserStore.getState().user;
            if (userState) {
                const role: string = (userState.role || "").toUpperCase();
                const isSuperAdmin = role === "OWNER";
                const isAdmin = role === "ADMIN";
                const isMod = role === "MODERATOR";

                if (!useSystemStore.getState().hasChecked) {
                    await useSystemStore.getState().checkStatus();
                }
                const isMaint = useSystemStore.getState().isMaintenanceMode;
                const allowAdmin = useSystemStore.getState().allowAdmin;
                const perms: string[] = userState.effective_permissions || useUserStore.getState().permissions || [];
                const canBypass = isSuperAdmin || perms.includes("*") || perms.includes("system.maintenance.bypass") || ((isAdmin || isMod) && allowAdmin);
                const isStaff = isSuperAdmin || isAdmin || isMod || canBypass;

                if (isAdminPortal && !isStaff) {
                    await fetchApi("/auth/logout", { method: "POST" }).catch(() => {});
                    localStorage.removeItem("access_token");
                    localStorage.removeItem("refresh_token");
                    setError("Access Denied: Restricted to Administrators, Moderators, and Owners only.");
                    return;
                }

                if (isMaint && !canBypass) {
                    await fetchApi("/auth/logout", { method: "POST" }).catch(() => {});
                    localStorage.removeItem("access_token");
                    localStorage.removeItem("refresh_token");
                    navigate("/maintenance", { replace: true });
                    return;
                }
                if (isSuperAdmin) {
                    navigate("/super-admin", { replace: true });
                } else if (isAdmin || isMod) {
                    navigate("/app/admin", { replace: true });
                } else {
                    navigate("/app/dashboard", { replace: true });
                }
            }
        }
      } catch (err: any) {
        setError(err.message || "Invalid 2FA code");
      } finally {
        setIsLoading(false);
      }
      return;
    }
    
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }
    
    setError("");
    setIsLoading(true);
    
    try {
      const response = await fetchApi("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      
      if (response.success) {
        const { authController } = await import('../../services/AuthController');
        await authController.bootstrap(true);
        const userState = useUserStore.getState().user;
        
        if (userState) {
          const role: string = (userState.role || "").toUpperCase();
          const isSuperAdmin = role === "OWNER";
          const isAdmin = role === "ADMIN";
          const isMod = role === "MODERATOR";

          await useSystemStore.getState().checkStatus(true);
          const isMaint = useSystemStore.getState().isMaintenanceMode;
          const allowAdmin = useSystemStore.getState().allowAdmin;
          const perms: string[] = userState.effective_permissions || useUserStore.getState().permissions || [];
          const canBypass = isSuperAdmin || perms.includes("*") || perms.includes("system.maintenance.bypass") || ((isAdmin || isMod) && allowAdmin);
          const isStaff = isSuperAdmin || isAdmin || isMod || canBypass;

          if (isAdminPortal && !isStaff) {
            await fetchApi("/auth/logout", { method: "POST" }).catch(() => {});
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            setError("Access Denied: Restricted to Administrators, Moderators, and Owners only.");
            return;
          }

          if (isMaint && !canBypass) {
            await fetchApi("/auth/logout", { method: "POST" }).catch(() => {});
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            toast.error("System is under maintenance. Only administrators can log in.");
            navigate("/maintenance", { replace: true });
            return;
          }

          if (isSuperAdmin) {
            navigate("/super-admin", { replace: true });
          } else if (isAdmin || isMod) {
            navigate("/app/admin", { replace: true });
          } else {
            navigate("/app/dashboard", { replace: true });
          }
        }
      }
    } catch (err: any) {
      if (err.message === "2FA_REQUIRED") {
        setIs2FA(true);
        setTwoFaToken(err.data?.detail?.token || "");
        return;
      }
      
      const errorText = (err.message || "").toLowerCase();
      if (err?.status === 503 || errorText.includes("maintenance") || err?.data?.detail?.toLowerCase().includes("maintenance")) {
        toast.error("System is currently under maintenance. Only administrators can log in.");
        navigate("/maintenance", { replace: true });
        return;
      }
      
      // Map generic backend errors to friendly messages
      if (errorText.includes("credentials") || errorText.includes("unauthorized")) {
        setError("Incorrect email or password");
      } else if (errorText.includes("not found")) {
        setError("We couldn't find an account with that email");
      } else if (errorText.includes("locked")) {
        setError("Account is temporarily locked due to too many failed attempts.");
      } else {
        setError(err.message || "Failed to sign in. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full space-y-8 p-8 sm:p-10 rounded-2xl bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-white/[0.05] shadow-xl dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl">
      <div className="space-y-2 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">{is2FA ? "Two-Factor Authentication" : isAdminPortal ? "Administrator Portal" : "Welcome back"}</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {is2FA ? "Enter the 6-digit code from your authenticator app" : isAdminPortal ? "Secure console login restricted to Administrators & Owners" : "Enter your credentials to access your workspace"}
        </p>
      </div>

      {!is2FA && isExpired && (
        <div className="p-4 flex gap-3 text-sm text-amber-200 bg-amber-500/10 border border-amber-500/20 rounded-lg animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>Your session has expired. Please sign in again to continue.</p>
        </div>
      )}

      {error && (
        <div className="p-4 flex gap-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {is2FA ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="totpCode">
                Authenticator Code
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400 dark:text-zinc-500">
                  <Lock className="h-4 w-4" />
                </div>
                <Input 
                  id="totpCode" 
                  type="text" 
                  placeholder="000000" 
                  required 
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/[^0-9]/g, ''))}
                  disabled={isLoading}
                  className="pl-10 bg-zinc-50 dark:bg-black/50 border-zinc-200 dark:border-white/10 focus:border-green-500/50 focus:ring-green-500/20 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 h-11 tracking-[0.5em] text-center"
                />
              </div>
            </div>
            <Button 
              type="submit" 
              disabled={isLoading || totpCode.length !== 6}
              className="w-full h-11 bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 font-semibold text-sm transition-all shadow-md dark:shadow-[0_0_20px_rgba(255,255,255,0.1)] dark:hover:shadow-[0_0_25px_rgba(255,255,255,0.2)]"
            >
              {isLoading ? (
                <>
                  <SudarshanaMandala className="mr-2 h-4 w-4" color="purple" />
                  Verifying...
                </>
              ) : (
                <>
                  Verify & Sign In <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
            <Button 
              type="button" 
              variant="outline"
              onClick={() => {
                setIs2FA(false);
                setTotpCode("");
                setTwoFaToken("");
              }}
              disabled={isLoading}
              className="w-full h-11 border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-white hover:bg-zinc-100 dark:hover:bg-white/5"
            >
              Back to Login
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="email">
                  Email address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400 dark:text-zinc-500">
                    <Mail className="h-4 w-4" />
                  </div>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="you@example.com" 
                    required 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    className="pl-10 bg-zinc-50 dark:bg-black/50 border-zinc-200 dark:border-white/10 focus:border-green-500/50 focus:ring-green-500/20 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 h-11"
                  />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="password">
                    Password
                  </label>
                  <Link to="/forgot-password" className="text-sm text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300 transition-colors">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400 dark:text-zinc-500">
                    <Lock className="h-4 w-4" />
                  </div>
                  <Input 
                    id="password" 
                    type={showPassword ? "text" : "password"} 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="pl-10 pr-10 bg-zinc-50 dark:bg-black/50 border-zinc-200 dark:border-white/10 focus:border-green-500/50 focus:ring-green-500/20 text-zinc-900 dark:text-white h-11"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                id="remember" 
                className="w-4 h-4 rounded border-zinc-300 dark:border-white/10 bg-zinc-50 dark:bg-black/50 text-green-600 focus:ring-green-500/30 focus:ring-offset-0" 
              />
              <label htmlFor="remember" className="text-sm text-zinc-600 dark:text-zinc-400 cursor-pointer select-none">
                Remember me for 30 days
              </label>
            </div>

            <Button 
              type="submit" 
              disabled={isLoading || !email || !password}
              className="w-full h-11 bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 font-semibold text-sm transition-all shadow-md dark:shadow-[0_0_20px_rgba(255,255,255,0.1)] dark:hover:shadow-[0_0_25px_rgba(255,255,255,0.2)]"
            >
              {isLoading ? (
                <>
                  <SudarshanaMandala className="mr-2 h-4 w-4" color="purple" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
            
            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-zinc-200 dark:border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-[#09090b] px-2 text-zinc-500">Or continue with</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                className="h-11 border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-white hover:bg-zinc-100 dark:hover:bg-white/5"
                onClick={() => {
                  if (isAdminPortal) sessionStorage.setItem("admin_login_portal", "true");
                  window.location.href = '/api/v1/auth/oauth/github/authorize';
                }}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.6.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                </svg>
                GitHub
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-white hover:bg-zinc-100 dark:hover:bg-white/5"
                onClick={() => {
                  if (isAdminPortal) sessionStorage.setItem("admin_login_portal", "true");
                  window.location.href = '/api/v1/auth/oauth/google/authorize';
                }}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Google
              </Button>
            </div>
          </>
        )}
      </form>

      {!is2FA && !isAdminPortal && (
        <div className="text-center text-sm text-zinc-500 dark:text-zinc-400">
          Don't have an account?{" "}
          <Link to="/signup" className="font-medium text-zinc-900 dark:text-white hover:text-green-600 dark:hover:text-green-400 transition-colors">
            Create an account
          </Link>
        </div>
      )}
    </div>
  );
}
