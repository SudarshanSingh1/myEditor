/* eslint-disable react-hooks/exhaustive-deps */
/* oxlint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { fetchApi } from "../../lib/api";
import { Mail, ArrowLeft, AlertCircle, KeyRound } from "lucide-react";
import { SudarshanaMandala } from "../../components/ui/SplashLoader";
import { motion, AnimatePresence } from "framer-motion";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [step, setStep] = useState<1 | 2>(1); // 1: Email, 2: OTP
  
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Clear error on type
  useEffect(() => {
    if (error) setError("");
  }, [email, otp]);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address");
      return;
    }

    setError("");
    setIsLoading(true);
    
    try {
      const response = await fetchApi("/auth/request-password-reset", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      if (response.success && response.data?.reset_token) {
        setResetToken(response.data.reset_token);
        setStep(2);
      } else {
        // Fallback for security (if fake token generated for missing user, etc.)
        // But backend sends token now
        if (response.data?.reset_token) {
           setResetToken(response.data.reset_token);
        }
        setStep(2);
      }
    } catch (err: any) {
      setError(err.message || "Failed to request password reset. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      setError("Please enter a valid 6-digit verification code");
      return;
    }

    // Redirect to ResetPassword with token and otp
    navigate(`/reset-password?token=${resetToken}&otp=${otp}`);
  };

  return (
    <div className="w-full p-8 rounded-2xl bg-white/[0.02] border border-white/[0.05] shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl overflow-hidden relative">
      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.div 
            key="form"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-8"
          >
            <div className="space-y-2 text-center">
              <h2 className="text-3xl font-bold tracking-tight text-white">Reset password</h2>
              <p className="text-sm text-zinc-400">
                Enter your email address and we will send you a secure verification code to reset your password.
              </p>
            </div>

            {error && (
              <div className="p-4 flex gap-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleRequestReset} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-300" htmlFor="email">
                  Email address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
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
                    className="pl-10 bg-black/50 border-white/10 focus:border-purple-500/50 focus:ring-purple-500/20 text-white h-11"
                  />
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <Button 
                  type="submit" 
                  disabled={isLoading || !email}
                  className="w-full h-11 bg-white text-black hover:bg-zinc-200 font-semibold transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)]"
                >
                  {isLoading ? (
                    <>
                      <SudarshanaMandala className="mr-2 h-4 w-4" />
                      Sending code...
                    </>
                  ) : (
                    "Send Verification Code"
                  )}
                </Button>
                
                <div className="text-center">
                  <Link to="/login" className="inline-flex items-center text-sm text-zinc-400 hover:text-white transition-colors">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to login
                  </Link>
                </div>
              </div>
            </form>
          </motion.div>
        ) : (
          <motion.div 
            key="otp"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-8"
          >
            <div className="space-y-2 text-center">
              <h2 className="text-3xl font-bold tracking-tight text-white">Enter code</h2>
              <p className="text-sm text-zinc-400 max-w-[280px] mx-auto">
                We've sent a 6-digit verification code to <span className="text-zinc-200 font-medium">{email}</span>.
              </p>
            </div>

            {error && (
              <div className="p-4 flex gap-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-300" htmlFor="otp">
                  Verification Code
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <Input 
                    id="otp" 
                    type="text" 
                    maxLength={6}
                    placeholder="123456" 
                    required 
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="pl-10 bg-black/50 border-white/10 focus:border-purple-500/50 focus:ring-purple-500/20 text-white h-11 text-center font-mono tracking-widest text-lg"
                  />
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <Button 
                  type="submit" 
                  disabled={!otp || otp.length !== 6}
                  className="w-full h-11 bg-white text-black hover:bg-zinc-200 font-semibold transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)]"
                >
                  Verify and Continue
                </Button>
                
                <div className="text-center">
                  <button 
                    type="button"
                    onClick={() => setStep(1)}
                    className="inline-flex items-center text-sm text-zinc-400 hover:text-white transition-colors"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Change email address
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
