import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useUserStore } from "../../stores/useUserStore";
import { fetchApi } from "../../lib/api";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function OAuthCallback() {
  const { provider } = useParams<{ provider: string }>();
  const [searchParams] = useSearchParams();
  const code = searchParams.get("code");
  const navigate = useNavigate();
  const { login } = useUserStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!provider || !code) {
      setError("Invalid OAuth callback parameters.");
      return;
    }

    const exchangeCode = async () => {
      try {
        const response = await fetchApi(`/auth/oauth/${provider}/callback`, {
          method: "POST",
          body: JSON.stringify({ code }),
        });

        if (response.success && response.data) {
          // The backend sets the httponly cookies. We just need to update the store
          login({
            id: response.data.user.id,
            email: response.data.user.email,
            username: response.data.user.username,
            first_name: response.data.user.first_name,
            last_name: response.data.user.last_name,
            avatar: response.data.user.avatar,
            role: "user", // The backend response doesn't include role right now, but it's fine for initial state
          });
          toast.success(`Successfully logged in with ${provider}`);
          navigate("/app/dashboard");
        }
      } catch (err: any) {
        setError(err.message || "Failed to complete OAuth login");
        toast.error("OAuth login failed");
        setTimeout(() => navigate("/login"), 3000);
      }
    };

    exchangeCode();
  }, [provider, code, navigate, login]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-white h-full">
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center w-full max-w-md">
          <h2 className="mb-2 text-xl font-semibold text-red-400">OAuth Error</h2>
          <p className="text-zinc-400">{error}</p>
          <button 
            onClick={() => navigate("/login")}
            className="mt-6 w-full rounded-md bg-white/10 px-4 py-2 hover:bg-white/20 transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 text-white h-full">
      <div className="flex flex-col items-center gap-4 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-purple-500" />
        <p className="text-lg font-medium text-zinc-300">Completing login with {provider}...</p>
        <p className="text-sm text-zinc-500">Please wait while we securely log you in.</p>
      </div>
    </div>
  );
}
