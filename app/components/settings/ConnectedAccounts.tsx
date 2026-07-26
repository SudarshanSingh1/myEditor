import { useState, useEffect } from "react";

import { fetchApi } from "../../lib/api";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/Card";

import { Button } from "../../components/ui/Button";

import { Mail } from "lucide-react";
import { toast } from "sonner";

const GithubIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

export function ConnectedAccounts() {
  const [connectedProviders, setConnectedProviders] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchConnectedAccounts();
  }, []);

  const fetchConnectedAccounts = async () => {
    try {
      const res = await fetchApi("/auth/oauth/connected");
      if (res.success) {
        setConnectedProviders(res.data.providers || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = (provider: string) => {
    window.location.href = `/api/v1/auth/oauth/${provider}/authorize`;
  };

  const handleDisconnect = async (provider: string) => {
    try {
      const res = await fetchApi(`/auth/oauth/disconnect/${provider}`, { method: "DELETE" });
      if (res.success) {
        toast.success(res.message);
        fetchConnectedAccounts();
      }
    } catch (err: any) {
      toast.error(err.message || `Failed to disconnect ${provider}`);
    }
  };

  const providers = [
    {
      id: "google",
      name: "Google",
      icon: <Mail className="w-5 h-5" />,
      description: "Sign in seamlessly with your Google account."
    },
    {
      id: "github",
      name: "GitHub",
      icon: <GithubIcon />,
      description: "Connect your GitHub account for quick login."
    }
  ];

  if (isLoading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connected Accounts</CardTitle>
        <CardDescription>
          Link your social accounts to log in faster. You must have at least one login method active.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {providers.map((p) => {
          const isConnected = connectedProviders.includes(p.id);
          return (
            <div key={p.id} className="flex items-center justify-between p-4 border border-white/10 rounded-lg bg-white/5">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-white/10 rounded-full text-white">
                  {p.icon}
                </div>
                <div>
                  <p className="font-medium text-white">{p.name}</p>
                  <p className="text-sm text-zinc-400">{p.description}</p>
                </div>
              </div>
              <Button
                variant={isConnected ? "outline" : "default"}
                onClick={() => isConnected ? handleDisconnect(p.id) : handleConnect(p.id)}
                className={!isConnected ? "bg-purple-600 hover:bg-purple-700 text-white" : "border-red-500/50 text-red-400 hover:bg-red-500/10"}
              >
                {isConnected ? "Disconnect" : "Connect"}
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
