import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { fetchApi } from "../../lib/api";
import { PasswordStrength } from "../../components/auth/PasswordStrength";
import { Loader2, User, Mail, Lock, AlertCircle, ArrowRight, ArrowLeft, CheckCircle2, Eye, EyeOff } from "lucide-react";

export default function Signup() {
  const navigate = useNavigate();
  
  // Step State
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);

  // Form State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Live validation for step 1
  const isStep1Valid = firstName.length > 0 && lastName.length > 0 && username.length >= 3 && /^[a-zA-Z0-9_.-]+$/.test(username) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  
  // Live validation for step 2
  const passwordMeetsRequirements = password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password);
  const isStep2Valid = passwordMeetsRequirements && password === confirmPassword;

  // Clear error on type
  useEffect(() => {
    if (error) setError("");
  }, [firstName, lastName, username, email, password, confirmPassword]);

  const nextStep = () => {
    if (step === 1 && !isStep1Valid) return;
    if (step === 2 && !isStep2Valid) return;
    setDirection(1);
    setStep(s => s + 1);
  };

  const prevStep = () => {
    setDirection(-1);
    setStep(s => s - 1);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isStep1Valid || !isStep2Valid) return;

    setError("");
    setIsLoading(true);

    try {
      const response = await fetchApi("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          username,
          email,
          password
        }),
      });

      if (response.success) {
        const token = response.data.verification_token;
        navigate(`/verify-email?email=${encodeURIComponent(email)}&token=${token}`);
      }
    } catch (err: any) {
      const errorText = (err.message || "").toLowerCase();
      if (errorText.includes("already exists") || errorText.includes("duplicate")) {
        setError("An account with that email or username already exists.");
        setStep(1); // Go back to step 1 to fix it
      } else {
        setError(err.message || "Failed to create account. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 50 : -50,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 50 : -50,
      opacity: 0
    })
  };

  return (
    <div className="w-full space-y-8 p-8 sm:p-10 rounded-2xl bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-white/[0.05] shadow-xl dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl overflow-hidden relative">
      <div className="space-y-2 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Create an account</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Step {step} of 3
        </p>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1 bg-zinc-200 dark:bg-white/10 rounded-full overflow-hidden">
        <motion.div 
          className="h-full bg-green-500 rounded-full"
          initial={{ width: "33%" }}
          animate={{ width: `${(step / 3) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {error && (
        <div className="p-4 flex gap-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="relative min-h-[320px]">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 }
            }}
            className="w-full absolute inset-0"
          >
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">First Name</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400 dark:text-zinc-500">
                        <User className="h-4 w-4" />
                      </div>
                      <Input 
                        placeholder="First Name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="pl-10 bg-zinc-50 dark:bg-black/50 border-zinc-200 dark:border-white/10 focus:border-green-500/50 focus:ring-green-500/20 text-zinc-900 dark:text-white h-11"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Last Name</label>
                    <Input 
                      placeholder="Last Name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="bg-zinc-50 dark:bg-black/50 border-zinc-200 dark:border-white/10 focus:border-green-500/50 focus:ring-green-500/20 text-zinc-900 dark:text-white h-11"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Username</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400 dark:text-zinc-500">
                      <User className="h-4 w-4" />
                    </div>
                    <Input 
                      placeholder="johndoe" 
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-10 bg-zinc-50 dark:bg-black/50 border-zinc-200 dark:border-white/10 focus:border-green-500/50 focus:ring-green-500/20 text-zinc-900 dark:text-white h-11"
                    />
                  </div>
                  {username.length > 0 && !/^[a-zA-Z0-9_.-]+$/.test(username) && (
                    <p className="text-xs text-red-400 mt-1">Only letters, numbers, and _.- are allowed</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Email address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400 dark:text-zinc-500">
                      <Mail className="h-4 w-4" />
                    </div>
                    <Input 
                      type="email" 
                      placeholder="you@example.com" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 bg-zinc-50 dark:bg-black/50 border-zinc-200 dark:border-white/10 focus:border-green-500/50 focus:ring-green-500/20 text-zinc-900 dark:text-white h-11"
                    />
                  </div>
                </div>

                <Button 
                  type="button" 
                  onClick={nextStep}
                  disabled={!isStep1Valid}
                  className="w-full h-11 mt-4 bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 font-semibold transition-all shadow-md dark:shadow-[0_0_20px_rgba(255,255,255,0.1)] dark:hover:shadow-[0_0_25px_rgba(255,255,255,0.2)]"
                >
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Create a password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400 dark:text-zinc-500">
                      <Lock className="h-4 w-4" />
                    </div>
                    <Input 
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
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
                  <PasswordStrength password={password} />
                </div>

                <div className="space-y-1.5 pt-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Confirm password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400 dark:text-zinc-500">
                      <Lock className="h-4 w-4" />
                    </div>
                    <Input 
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••" 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 pr-10 bg-zinc-50 dark:bg-black/50 border-zinc-200 dark:border-white/10 focus:border-green-500/50 focus:ring-green-500/20 text-zinc-900 dark:text-white h-11"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {confirmPassword.length > 0 && password !== confirmPassword && (
                    <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={prevStep}
                    className="w-full h-11 bg-transparent border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-white hover:bg-zinc-100 dark:hover:bg-white/5"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <Button 
                    type="button" 
                    onClick={nextStep}
                    disabled={!isStep2Valid}
                    className="w-full h-11 bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 font-semibold"
                  >
                    Continue <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6 flex flex-col items-center justify-center text-center pt-4">
                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 border border-green-500/20">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-xl font-medium text-zinc-900 dark:text-white">Ready to go</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-[280px]">
                    Your account is ready to be created. Click the button below to join Hamara Editor.
                  </p>
                </div>

                <div className="flex w-full gap-3 pt-4">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={prevStep}
                    disabled={isLoading}
                    className="w-full h-11 bg-transparent border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-white hover:bg-zinc-100 dark:hover:bg-white/5"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <Button 
                    type="button" 
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="w-full h-11 bg-green-600 text-white hover:bg-green-500 font-semibold border border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.2)] hover:shadow-[0_0_25px_rgba(34,197,94,0.3)] transition-all"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="relative py-2">
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
          onClick={() => window.location.href = '/api/v1/auth/oauth/github/authorize'}
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
          onClick={() => window.location.href = '/api/v1/auth/oauth/google/authorize'}
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

      <div className="text-center text-sm text-zinc-500 dark:text-zinc-400 pt-4">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-zinc-900 dark:text-white hover:text-green-600 dark:hover:text-green-400 transition-colors">
          Sign in
        </Link>
      </div>
    </div>
  );
}
