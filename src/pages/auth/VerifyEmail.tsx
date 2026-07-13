import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Loader2, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type VerifyState = "pending" | "success" | "error";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [verifyState, setVerifyState] = useState<VerifyState>("pending");
  const [errorMsg, setErrorMsg] = useState("");
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
    setIsResending(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsResending(false);
    setResendCooldown(60); // 60 seconds cooldown to prevent spam
    setErrorMsg("A new verification link has been sent to your email.");
  };

  useEffect(() => {
    // Since there is no backend API for email verification yet,
    // we simulate the verification process for UI demonstration purposes.
    if (!token) {
      setVerifyState("error");
      setErrorMsg("No verification token provided.");
      return;
    }

    const verifyToken = async () => {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate success/failure based on token (just for UI demo)
      if (token === "expired") {
        setVerifyState("error");
        setErrorMsg("This verification link has expired. Please request a new one.");
      } else {
        setVerifyState("success");
      }
    };

    verifyToken();
  }, [token]);

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
