import { useState, useEffect } from "react";
import { fetchApi } from "../../lib/api";
import { useUserStore } from "../../stores/useUserStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { Shield, Smartphone, Mail, Laptop, Globe, LogOut, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";

export function SecuritySettings() {
  const { user, updateProfile } = useUserStore();
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [qrUri, setQrUri] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  
  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await fetchApi("/sessions");
      if (res.success) {
        setSessions(res.data.sessions);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleRevokeSession = async (id: string) => {
    try {
      await fetchApi(`/sessions/${id}`, { method: "DELETE" });
      toast.success("Session revoked");
      fetchSessions();
    } catch (err: any) {
      toast.error(err.message || "Failed to revoke session");
    }
  };
  
  const handleRevokeAll = async () => {
    try {
      await fetchApi(`/sessions`, { method: "DELETE" });
      toast.success("All other sessions revoked");
      fetchSessions();
    } catch (err: any) {
      toast.error(err.message || "Failed to revoke sessions");
    }
  };

  const handleSetup2FA = async () => {
    try {
      const res = await fetchApi("/security/2fa/setup", { method: "POST" });
      if (res.success) {
        // we'd use a library like qrcode.react to render the URI, 
        // but for now we'll just display the secret text representation 
        setQrUri(res.data.secret); 
        setShow2FAModal(true);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to initiate 2FA setup");
    }
  };

  const handleEnable2FA = async () => {
    try {
      const res = await fetchApi("/security/2fa/enable", {
        method: "POST",
        body: JSON.stringify({ code: totpCode })
      });
      if (res.success) {
        toast.success("2FA enabled successfully");
        setRecoveryCodes(res.data.recovery_codes);
        updateProfile({ totp_enabled: true });
        setShow2FAModal(false);
        setTotpCode("");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to enable 2FA");
    }
  };

  const handleDisable2FA = async () => {
    const code = prompt("Enter 2FA code to disable:");
    if (!code) return;
    
    try {
      const res = await fetchApi("/security/2fa/disable", {
        method: "POST",
        body: JSON.stringify({ code })
      });
      if (res.success) {
        toast.success("2FA disabled successfully");
        updateProfile({ totp_enabled: false });
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to disable 2FA");
    }
  };

  return (
    <div className="space-y-8">
      {/* 2FA Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-500" />
            Two-Factor Authentication (2FA)
          </CardTitle>
          <CardDescription>
            Add an extra layer of security to your account using an authenticator app.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-white">{user?.totp_enabled ? "2FA is Enabled" : "2FA is Disabled"}</p>
              <p className="text-sm text-zinc-400">
                {user?.totp_enabled 
                  ? "Your account is secured with two-factor authentication." 
                  : "We highly recommend enabling 2FA for account safety."}
              </p>
            </div>
            <Button
              variant={user?.totp_enabled ? "outline" : "default"}
              className={user?.totp_enabled ? "border-red-500/50 text-red-400 hover:bg-red-500/10" : "bg-purple-600 text-white hover:bg-purple-500"}
              onClick={user?.totp_enabled ? handleDisable2FA : handleSetup2FA}
            >
              {user?.totp_enabled ? "Disable 2FA" : "Enable 2FA"}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Recovery Codes Modal */}
      <Modal isOpen={recoveryCodes.length > 0} onClose={() => setRecoveryCodes([])} title="Save your recovery codes">
         <div className="p-4 space-y-4">
           <p className="text-sm text-zinc-300">
             Store these recovery codes in a secure password manager. They can be used to recover access if you lose your 2FA device. They will only be shown once.
           </p>
           <div className="grid grid-cols-2 gap-2 bg-black/50 p-4 rounded-lg font-mono text-sm border border-white/10">
             {recoveryCodes.map((code, i) => <div key={i} className="text-center">{code}</div>)}
           </div>
           <Button onClick={() => setRecoveryCodes([])} className="w-full bg-purple-600 hover:bg-purple-500 text-white">
             I have saved them safely
           </Button>
         </div>
      </Modal>

      {/* 2FA Setup Modal */}
      <Modal isOpen={show2FAModal} onClose={() => setShow2FAModal(false)} title="Set Up 2FA">
        <div className="p-4 space-y-6">
          <p className="text-sm text-zinc-300">
            1. Install an authenticator app like Google Authenticator or Authy.
          </p>
          <p className="text-sm text-zinc-300">
            2. Scan this QR Code or enter the setup key manually:
          </p>
          <div className="flex justify-center bg-white p-4 rounded-xl w-max mx-auto">
            {qrUri && <QRCodeSVG value={qrUri} size={200} />}
          </div>
          <div className="bg-black/50 p-3 rounded-lg text-center font-mono tracking-widest text-purple-400 border border-white/10 break-all text-sm">
            {qrUri}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">
              3. Enter the 6-digit code from the app:
            </label>
            <Input 
              value={totpCode}
              onChange={e => setTotpCode(e.target.value.replace(/[^0-9]/g, ''))}
              maxLength={6}
              placeholder="000000"
              className="text-center tracking-widest"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <Button variant="outline" onClick={() => setShow2FAModal(false)}>Cancel</Button>
            <Button onClick={handleEnable2FA} disabled={totpCode.length !== 6} className="bg-purple-600 text-white">
              Verify & Enable
            </Button>
          </div>
        </div>
      </Modal>

      {/* Connected Accounts removed from here because they are in ConnectedAccounts.tsx */}

      {/* Sessions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Laptop className="w-5 h-5 text-purple-500" />
              Active Sessions
            </CardTitle>
            <CardDescription className="mt-1">
              Manage devices currently logged into your account.
            </CardDescription>
          </div>
          <Button variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/10" onClick={handleRevokeAll}>
            Revoke All
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {sessions.map(s => (
            <div key={s.id} className="flex items-center justify-between border border-white/5 p-4 rounded-lg bg-black/20">
              <div className="flex items-start gap-4">
                <div className="mt-1 bg-white/5 p-2 rounded-full text-zinc-400">
                  {s.device_type?.toLowerCase().includes("mobile") ? <Smartphone className="w-5 h-5" /> : <Laptop className="w-5 h-5" />}
                </div>
                <div>
                  <p className="font-medium text-white">{s.os || "Unknown OS"} • {s.browser || "Unknown Browser"}</p>
                  <p className="text-sm text-zinc-400 mt-1">IP: {s.ip_address}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Last active: {new Date(s.last_active_at).toLocaleString()}</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
                onClick={() => handleRevokeSession(s.id)}
              >
                <LogOut className="w-4 h-4 mr-2" /> Revoke
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

    </div>
  );
}
