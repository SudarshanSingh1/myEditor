import { useState } from "react";
import { GitBranch, GitCommit, GitMerge, RefreshCw, Plus, Check } from "lucide-react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { gitApi } from "../../lib/api/github";
import { toast } from "sonner";

interface GitPanelProps {
  projectId: string;
}

export function GitPanel({ projectId }: GitPanelProps) {
  const [commitMessage, setCommitMessage] = useState("");
  const [isPushing, setIsPushing] = useState(false);

  const handleCommitAndPush = async () => {
    if (!commitMessage.trim()) {
      toast.error("Please enter a commit message");
      return;
    }

    try {
      setIsPushing(true);
      await gitApi.push({
        project_id: projectId,
        message: commitMessage
      });
      toast.success("Changes pushed to GitHub successfully!");
      setCommitMessage("");
    } catch (err: any) {
      toast.error(err.message || "Failed to push changes");
    } finally {
      setIsPushing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background border-r">
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="font-semibold text-sm flex items-center gap-2">
          <GitBranch className="w-4 h-4" />
          Source Control
        </h2>
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <RefreshCw className="w-3 h-3" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Commit Section */}
        <div className="space-y-3">
          <Input 
            placeholder="Commit message" 
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            className="text-sm"
          />
          <Button 
            className="w-full gap-2" 
            size="sm"
            onClick={handleCommitAndPush}
            disabled={isPushing}
          >
            {isPushing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            Commit & Push
          </Button>
        </div>

        {/* Changes List */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Changes
          </h3>
          <div className="text-sm text-muted-foreground text-center py-8">
            All files are automatically staged.
          </div>
        </div>
      </div>
    </div>
  );
}
