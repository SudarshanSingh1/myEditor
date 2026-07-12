import { useState, useEffect } from "react";
import { User, Mail, Calendar, HardDrive } from "lucide-react";
import { useUserStore } from "../../stores/useUserStore";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Avatar } from "../../components/ui/Avatar";
import { fetchApi } from "../../lib/api";

export default function Profile() {
  const { user, updateProfile } = useUserStore();
  
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState({ text: "", type: "" });

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || "");
      setLastName(user.last_name || "");
    }
  }, [user]);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage({ text: "", type: "" });
    try {
      const response = await fetchApi("/auth/profile", {
        method: "PUT",
        body: JSON.stringify({ first_name: firstName, last_name: lastName }),
      });
      if (response.success) {
        updateProfile({ first_name: firstName, last_name: lastName });
        setMessage({ text: "Profile updated successfully.", type: "success" });
      }
    } catch (error: any) {
      setMessage({ text: error.message || "Failed to update profile.", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setIsChangingPassword(true);
    setPasswordMessage({ text: "", type: "" });
    try {
      const response = await fetchApi("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      if (response.success) {
        setPasswordMessage({ text: "Password changed successfully.", type: "success" });
        setCurrentPassword("");
        setNewPassword("");
      }
    } catch (error: any) {
      setPasswordMessage({ text: error.message || "Failed to change password.", type: "error" });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="p-6 md:p-8 lg:p-10 max-w-4xl mx-auto space-y-8">
      <PageHeader 
        title="Profile" 
        description="Manage your public profile and personal details."
      />

      <div className="grid gap-8 md:grid-cols-[1fr_250px]">
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your personal details here.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar 
                  src={user?.avatar} 
                  fallback={user?.first_name?.charAt(0) || user?.username?.charAt(0) || "U"} 
                  className="h-20 w-20 text-2xl"
                />
                <Button variant="outline">Change Avatar</Button>
              </div>
              
              {message.text && (
                <div className={`p-3 text-sm rounded-md ${message.type === 'error' ? 'text-red-500 bg-red-500/10 border border-red-500/20' : 'text-green-500 bg-green-500/10 border border-green-500/20'}`}>
                  {message.text}
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">First Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input value={firstName} onChange={e => setFirstName(e.target.value)} className="pl-9" disabled={isSaving} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Last Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input value={lastName} onChange={e => setLastName(e.target.value)} className="pl-9" disabled={isSaving} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Username</label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input defaultValue={user?.username || ""} className="pl-9" readOnly />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input defaultValue={user?.email || ""} className="pl-9" readOnly />
                  </div>
                </div>
              </div>
              
              <Button disabled={isSaving} onClick={handleSave}>
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your password to keep your account secure.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {passwordMessage.text && (
                <div className={`p-3 text-sm rounded-md ${passwordMessage.type === 'error' ? 'text-red-500 bg-red-500/10 border border-red-500/20' : 'text-green-500 bg-green-500/10 border border-green-500/20'}`}>
                  {passwordMessage.text}
                </div>
              )}
              <div className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Current Password</label>
                  <Input 
                    type="password" 
                    value={currentPassword} 
                    onChange={(e) => setCurrentPassword(e.target.value)} 
                    disabled={isChangingPassword} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">New Password</label>
                  <Input 
                    type="password" 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                    disabled={isChangingPassword} 
                  />
                </div>
              </div>
              <Button disabled={isChangingPassword || !currentPassword || !newPassword} onClick={handleChangePassword} variant="secondary">
                {isChangingPassword ? "Changing..." : "Change Password"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Account Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">Joined</p>
                  <p className="text-muted-foreground">{new Date().toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <HardDrive className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <p className="font-medium">Role</p>
                    <p className="text-muted-foreground uppercase">{user?.role || "User"}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
