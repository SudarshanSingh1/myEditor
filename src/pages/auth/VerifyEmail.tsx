import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Loader2, CheckCircle2, XCircle, ArrowLeft, MailOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchApi } from "../../lib/api";
import { toast } from "sonner";
import { Input } from "../../components/ui/Input";

type VerifyState = "pending" | "success" | "error" | "check_email";

export default function VerifyEmail() {
  const [searchParams, setSearchParams] = useSearchParams();
  const token = searchParams.get("token");
  const email = searchParams.get("email");
  const navigate = useNavigate();
  
  const [otp, setOtp] = useState("");

  const [verifyState, setVerifyState] = useState<VerifyState>("pending");
  const [errorMsg, setErrorMsg] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    let timer: number | ReturnType<typeof setTimeout>;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleResend = async () => {
    if (!email) {
      setErrorMsg("Email address is missing. Please try signing up again.");
      return;
    }
    
    setIsResending(true);
    setErrorMsg("");
    try {
      const response = await fetchApi("/auth/resend-verification", {
        method: "POST",
        body: JSON.stringify({ email })
      });
      setResendCooldown(60); // 60 seconds cooldown to prevent spam
      if (response.success && response.data?.verification_token) {
        setSearchParams({ email, token: response.data.verification_token });
        setErrorMsg("A new verification code has been sent to your email.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to resend verification email.");
    } finally {
      setIsResending(false);
    }
  };

  const verifyToken = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!token || !otp || otp.length !== 6) {
      setErrorMsg("Please enter a valid 6-digit code.");
      return;
    }

    setIsVerifying(true);
    try {
      const response = await fetchApi("/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({ token, otp })
      });
      
      if (response.success) {
        toast.success("Email verified successfully!");
        navigate("/app/dashboard");
      } else {
        setErrorMsg(response.message || "Verification failed");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "This verification code has expired or is invalid.");
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    if (!token || !email) {
      setVerifyState("error");
      setErrorMsg("No verification token or email provided.");
    } else {
      setVerifyState("check_email");
    }
  }, [token, email]);

  return (
    <div className="w-full p-8 rounded-2xl bg-white/[0.02] border border-white/[0.05] shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl overflow-hidden relative min-h-[300px] flex items-center justify-center">
      <AnimatePresence mode="wait">
        {verifyState === "pending" && (
          <motion.div 
            key="pending"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center justify-center text-center space-y-6"
          >
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-purple-500/20 animate-ping" />
              <div className="relative w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 border border-purple-500/30">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-medium text-white">Verifying your email</h3>
              <p className="text-sm text-zinc-400 max-w-[280px]">
                Please wait while we securely verify your email address...
              </p>
            </div>
          </motion.div>
        )}
        
        {verifyState === "check_email" && (
          <motion.div 
            key="check_email"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center justify-center text-center space-y-6"
          >
            <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 border border-blue-500/30">
              <MailOpen className="w-8 h-8" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-medium text-white">Enter Verification Code</h3>
              <p className="text-sm text-zinc-400 max-w-[280px]">
                We've sent a 6-digit code to <strong className="text-white">{email}</strong>. Please enter it below.
              </p>
            </div>
            
            <form onSubmit={verifyToken} className="w-full pt-4 space-y-4">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="------"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="text-center text-2xl tracking-widest h-14"
                />
              </div>

              <Button 
                type="submit" 
                disabled={otp.length !== 6 || isVerifying}
                className="w-full h-11 bg-white text-black hover:bg-zinc-200 font-semibold shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)] transition-all"
              >
                {isVerifying ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying...</> : "Verify Code"}
              </Button>
              
              <div className="pt-2">
                <Button 
                  type="button" 
                  variant="ghost"
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || isResending}
                  className="w-full h-11 text-zinc-400 hover:text-white hover:bg-white/5"
                >
                  {isResending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
                  ) : resendCooldown > 0 ? (
                    `Resend code in ${resendCooldown}s`
                  ) : (
                    "Didn't receive a code? Resend"
                  )}
                </Button>
              </div>

              {errorMsg && (
                <p className={`text-sm mt-2 ${errorMsg.includes('sent') ? 'text-blue-400' : 'text-red-400'}`}>{errorMsg}</p>
              )}
            </form>
          </motion.div>
        )}

        {verifyState === "success" && (
          <motion.div 
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center text-center space-y-6"
          >
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 border border-green-500/30">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-medium text-white">Email Verified!</h3>
              <p className="text-sm text-zinc-400 max-w-[280px]">
                Your email has been successfully verified. You now have full access to your account.
              </p>
            </div>

            <div className="w-full pt-4">
              <Button 
                type="button" 
                onClick={() => navigate("/login")}
                className="w-full h-11 bg-white text-black hover:bg-zinc-200 font-semibold shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)] transition-all"
              >
                Continue to Login
              </Button>
            </div>
          </motion.div>
        )}

        {verifyState === "error" && (
          <motion.div 
            key="error"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center text-center space-y-6"
          >
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 border border-red-500/30">
              <XCircle className="w-8 h-8" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-medium text-white">Verification Failed</h3>
              <p className="text-sm text-zinc-400 max-w-[280px]">
                {errorMsg}
              </p>
            </div>

            <div className="w-full pt-4 space-y-3">
              {email && (
                <Button 
                  type="button" 
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || isResending}
                  className="w-full h-11 bg-purple-600 text-white hover:bg-purple-500 font-semibold shadow-[0_0_20px_rgba(147,51,234,0.3)] hover:shadow-[0_0_25px_rgba(147,51,234,0.4)] transition-all"
                >
                  {isResending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
                  ) : resendCooldown > 0 ? (
                    `Resend available in ${resendCooldown}s`
                  ) : (
                    "Resend Verification Email"
                  )}
                </Button>
              )}
              <Button 
                type="button" 
                variant="outline"
                onClick={() => navigate("/login")}
                className="w-full h-11 bg-transparent border-white/10 text-white hover:bg-white/5 transition-all"
              >
                Return to Login
              </Button>
              <Link to="/signup" className="inline-flex items-center text-sm text-zinc-400 hover:text-white transition-colors">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go to Signup
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
