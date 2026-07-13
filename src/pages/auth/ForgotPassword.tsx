import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { fetchApi } from "../../lib/api";
import { Loader2, Mail, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Clear error on type
  useEffect(() => {
    if (error) setError("");
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
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
      if (response.success) {
        setIsSuccess(true);
      }
    } catch (err: any) {
      setError(err.message || "Failed to request password reset. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full p-8 rounded-2xl bg-white/[0.02] border border-white/[0.05] shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl overflow-hidden relative">
      <AnimatePresence mode="wait">
        {!isSuccess ? (
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
                Enter your email address and we will send you a secure link to reset your password.
              </p>
            </div>

            {error && (
              <div className="p-4 flex gap-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
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
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending link...
                    </>
                  ) : (
                    "Send Reset Link"
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
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center text-center space-y-6 py-4"
          >
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 border border-green-500/30">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-medium text-white">Check your email</h3>
              <p className="text-sm text-zinc-400 max-w-[280px]">
                We've sent a password reset link to <span className="text-zinc-200 font-medium">{email}</span>. Please check your inbox and spam folder.
              </p>
            </div>

            <div className="w-full pt-4">
              <Link to="/login">
                <Button 
                  type="button" 
                  variant="outline"
                  className="w-full h-11 bg-transparent border-white/10 text-white hover:bg-white/5"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back to login
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
