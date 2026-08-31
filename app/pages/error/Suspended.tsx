import { useNavigate } from "react-router-dom";
import { fetchApi } from "../../lib/api";
import { useUserStore } from "../../stores/useUserStore";
import { LogOut, ShieldAlert } from "lucide-react";

export default function Suspended() {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await fetchApi("/auth/logout", { method: "POST" });
    } catch {}
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    useUserStore.getState().clearAuth();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-zinc-950 p-4">
      <div className="flex w-full max-w-md flex-col items-center text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10">
          <ShieldAlert className="h-10 w-10 text-red-500" />
        </div>
        <h1 className="mb-2 text-2xl font-semibold text-white">Account Suspended</h1>
        <p className="mb-8 text-zinc-400">
          Your Hamara Editor account has been suspended. Please contact the administrator or support if you believe this was done in error.
        </p>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/20"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
