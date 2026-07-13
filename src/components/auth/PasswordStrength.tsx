import { useMemo } from "react";
import { Check, X } from "lucide-react";
import { cn } from "../../lib/utils";

interface PasswordStrengthProps {
  password: string;
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const requirements = useMemo(() => {
    return [
      { id: "length", label: "8+ characters", met: password.length >= 8 },
      { id: "uppercase", label: "Uppercase letter", met: /[A-Z]/.test(password) },
      { id: "lowercase", label: "Lowercase letter", met: /[a-z]/.test(password) },
      { id: "number", label: "Number", met: /\d/.test(password) },
      { id: "symbol", label: "Special character", met: /[^A-Za-z0-9]/.test(password) },
    ];
  }, [password]);

  const strength = useMemo(() => {
    const metCount = requirements.filter(r => r.met).length;
    if (password.length === 0) return { score: 0, label: "", color: "bg-zinc-800" };
    if (metCount <= 2) return { score: 1, label: "Weak", color: "bg-red-500" };
    if (metCount <= 4) return { score: 2, label: "Medium", color: "bg-yellow-500" };
    return { score: 3, label: "Strong", color: "bg-green-500" };
  }, [requirements, password]);

  return (
    <div className="w-full space-y-3 mt-4">
      {/* Strength Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-xs">
          <span className="text-zinc-400 font-medium">Password strength</span>
          <span className={cn(
            "font-semibold",
            strength.score === 1 && "text-red-400",
            strength.score === 2 && "text-yellow-400",
            strength.score === 3 && "text-green-400"
          )}>
            {strength.label}
          </span>
        </div>
        <div className="flex gap-1.5 h-1.5 w-full">
          {[1, 2, 3].map((segment) => (
            <div
              key={segment}
              className={cn(
                "h-full flex-1 rounded-full transition-colors duration-300",
                password.length > 0 && segment <= strength.score ? strength.color : "bg-zinc-800"
              )}
            />
          ))}
        </div>
      </div>

      {/* Requirements List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4">
        {requirements.map((req) => (
          <div key={req.id} className="flex items-center gap-2 text-xs">
            {req.met ? (
              <Check className="w-3.5 h-3.5 text-green-500" />
            ) : (
              <X className="w-3.5 h-3.5 text-zinc-600" />
            )}
            <span className={cn("transition-colors duration-200", req.met ? "text-zinc-300" : "text-zinc-500")}>
              {req.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
