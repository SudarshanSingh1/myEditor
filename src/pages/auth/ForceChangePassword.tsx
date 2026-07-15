import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../../stores/useUserStore';
import { fetchApi } from '../../lib/api';
import { Input } from '../../components/ui/Input';
import { Shield, KeyRound, ArrowRight, Loader2, Lock, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export default function ForceChangePassword() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const { logout } = useUserStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    let success = false;
    try {
      const resp = await fetchApi('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword
        })
      });

      if (resp?.success) {
        success = true;
        toast.success('Password changed successfully.');
        const profileResp = await fetchApi('/auth/me');
        if (profileResp?.success && profileResp.data) {
          useUserStore.getState().login(profileResp.data);
          navigate('/app/dashboard', { replace: true });
        } else {
          await logout();
          navigate('/login', { replace: true });
        }
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to change password.');
    } finally {
      if (!success) {
        setLoading(false);
      }
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="w-full space-y-8 p-8 sm:p-10 rounded-2xl bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-white/[0.05] shadow-xl dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-blue-500" />
      
      <div className="flex flex-col items-center text-center mb-8 pt-4">
        <div className="w-16 h-16 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-violet-500/30 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(139,92,246,0.15)]">
          <Shield className="w-8 h-8 text-violet-500 dark:text-violet-400" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Security Required</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">
          For your safety, you must change the temporary password provided by your administrator.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-zinc-500" /> Current Temporary Password
          </label>
          <div className="relative">
            <Input
              type={showCurrentPassword ? "text" : "password"}
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="pr-10 bg-zinc-50 dark:bg-black/50 border-zinc-200 dark:border-white/10 focus:border-violet-500/50 focus:ring-violet-500/20 text-zinc-900 dark:text-white h-11 font-mono"
              placeholder="••••••••••••••••"
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
            >
              {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        
        <div className="h-px w-full bg-zinc-200 dark:bg-white/10 my-6" />

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-2">
            <Lock className="w-4 h-4 text-violet-500 dark:text-violet-400" /> New Password
          </label>
          <div className="relative">
            <Input
              type={showNewPassword ? "text" : "password"}
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="pr-10 bg-zinc-50 dark:bg-black/50 border-zinc-200 dark:border-white/10 focus:border-violet-500/50 focus:ring-violet-500/20 text-zinc-900 dark:text-white h-11 font-mono"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
            >
              {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-2">
            Confirm New Password
          </label>
          <div className="relative">
            <Input
              type={showConfirmPassword ? "text" : "password"}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pr-10 bg-zinc-50 dark:bg-black/50 border-zinc-200 dark:border-white/10 focus:border-violet-500/50 focus:ring-violet-500/20 text-zinc-900 dark:text-white h-11 font-mono"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-6 bg-violet-600 hover:bg-violet-500 text-white rounded-xl py-3 px-4 font-semibold shadow-[0_0_20px_rgba(124,58,237,0.2)] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed group"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
            <>
              Secure Account
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button 
          onClick={handleLogout}
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
        >
          Cancel and sign out
        </button>
      </div>
    </div>
  );
}
