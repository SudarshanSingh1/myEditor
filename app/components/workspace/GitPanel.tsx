import { useState, useEffect, useCallback } from "react";
import {
  GitBranch,
  RefreshCw,
  Check,
  Link2,
  Link2Off,
  AlertCircle,
  ChevronDown,
  FileCode,
  Loader2,
} from "lucide-react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { githubApi, gitApi, type GitHubRepo } from "../../lib/api/github";
import { useGitHubStore } from "../../stores/useGitHubStore";
import { useEditorStore } from "../../stores/useEditorStore";
import { toast } from "sonner";

// Inline GitHub mark SVG (not in this version of lucide-react)
function GitHubIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.6.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}


interface GitPanelProps {
  projectId: string;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 px-1">
      {children}
    </h3>
  );
}

function StatusBadge({
  connected,
  username,
  avatarUrl,
}: {
  connected: boolean;
  username: string | null;
  avatarUrl: string | null;
}) {
  if (!connected) return null;
  return (
    <div className="flex items-center gap-2 text-xs text-green-400">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={username || "GitHub"}
          className="w-4 h-4 rounded-full"
        />
      ) : (
        <GitHubIcon className="w-3.5 h-3.5" />
      )}
      <span className="font-medium">@{username}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

export function GitPanel({ projectId }: GitPanelProps) {
  const { status, isLoading: isLoadingStatus, fetchStatus } = useGitHubStore();

  // Project-repo link state (fetched from project query via props for now)
  const [linkedRepoUrl, setLinkedRepoUrl] = useState<string | null>(null);
  const [linkedBranch, setLinkedBranch] = useState<string>("main");
  const [linkedRepoName, setLinkedRepoName] = useState<string | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(true);

  // Repo selection state
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [isLinking, setIsLinking] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [repoDropdownOpen, setRepoDropdownOpen] = useState(false);

  // Push state
  const [commitMessage, setCommitMessage] = useState("");
  const [isPushing, setIsPushing] = useState(false);
  const [lastPushFiles, setLastPushFiles] = useState<string[]>([]);

  // Changed files from editor store
  const dirtyFiles = useEditorStore((s) => s.dirtyFiles);
  const openFiles = useEditorStore((s) => s.openFiles);
  const changedFileNames = openFiles
    .filter((f) => dirtyFiles[f.id])
    .map((f) => f.name);

  // Fetch GitHub status on mount
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Fetch project to check if repo is linked
  useEffect(() => {
    const load = async () => {
      try {
        const { fetchApi } = await import("../../lib/api");
        const res = await fetchApi(`/projects/${projectId}`, { method: "GET" });
        if (res?.data) {
          const url: string | null = res.data.github_repo_url ?? null;
          const branch: string = res.data.github_default_branch ?? "main";
          setLinkedRepoUrl(url);
          setLinkedBranch(branch);
          if (url) {
            // Extract "owner/repo" from clone URL for display
            const match = url.match(/github\.com\/(.+?)(\.git)?$/);
            setLinkedRepoName(match ? match[1] : url);
          }
        }
      } catch {
        // ignore
      } finally {
        setIsLoadingProject(false);
      }
    };
    load();
  }, [projectId]);

  // Load repos when GitHub is connected and no repo is linked yet
  const loadRepos = useCallback(async () => {
    setIsLoadingRepos(true);
    try {
      const res = await githubApi.getRepos();
      setRepos(res?.data ?? []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load repositories");
    } finally {
      setIsLoadingRepos(false);
    }
  }, []);

  const handleLinkRepo = async () => {
    if (!selectedRepo) return;
    setIsLinking(true);
    try {
      await githubApi.linkRepo(
        projectId,
        selectedRepo.clone_url,
        selectedRepo.default_branch
      );
      setLinkedRepoUrl(selectedRepo.clone_url);
      setLinkedBranch(selectedRepo.default_branch);
      setLinkedRepoName(selectedRepo.full_name);
      setSelectedRepo(null);
      toast.success(`Linked to ${selectedRepo.full_name}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to link repository");
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlinkRepo = async () => {
    setIsUnlinking(true);
    try {
      await githubApi.unlinkRepo(projectId);
      setLinkedRepoUrl(null);
      setLinkedRepoName(null);
      setLinkedBranch("main");
      setLastPushFiles([]);
      toast.success("Repository unlinked");
    } catch (err: any) {
      toast.error(err.message || "Failed to unlink repository");
    } finally {
      setIsUnlinking(false);
    }
  };

  const handleCommitAndPush = async () => {
    if (!commitMessage.trim()) {
      toast.error("Please enter a commit message");
      return;
    }
    try {
      setIsPushing(true);
      const res = await gitApi.push({
        project_id: projectId,
        message: commitMessage.trim(),
      });
      const files: string[] = res?.data?.files ?? [];
      setLastPushFiles(files);
      const msg = res?.data?.message ?? "Pushed successfully";
      toast.success(msg);
      setCommitMessage("");
    } catch (err: any) {
      toast.error(err.message || "Failed to push changes");
    } finally {
      setIsPushing(false);
    }
  };

  // -------------------------------------------------------------------------
  // Render states
  // -------------------------------------------------------------------------

  if (isLoadingStatus || isLoadingProject) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        <span className="text-xs">Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background border-r text-sm select-none">
      {/* Header */}
      <div className="p-3 border-b flex items-center justify-between shrink-0">
        <h2 className="font-semibold text-sm flex items-center gap-2">
          <GitBranch className="w-4 h-4" />
          Source Control
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => {
            fetchStatus();
            if (status?.connected && !linkedRepoUrl) loadRepos();
          }}
          title="Refresh"
        >
          <RefreshCw className="w-3 h-3" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* ================================================================
            STATE A — GitHub not connected
            ================================================================ */}
        {!status?.connected && !status?.token_expired && (
          <div className="p-4 flex flex-col items-center justify-center gap-4 h-full text-center">
            <div className="p-3 rounded-full bg-muted">
              <GitHubIcon className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">Connect GitHub</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Connect your GitHub account to commit and push code to a
                repository.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Your GitHub account can have a different email than your editor login.
              </p>
            </div>
            <Button
              className="w-full gap-2 bg-[#238636] hover:bg-[#2ea043] text-white border-0"
              onClick={() => githubApi.connect()}
            >
              <GitHubIcon className="w-4 h-4" />
              Connect GitHub
            </Button>
          </div>
        )}

        {/* ================================================================
            STATE D — Token expired
            ================================================================ */}
        {status?.token_expired && (
          <div className="p-4 flex flex-col items-center justify-center gap-3 text-center">
            <AlertCircle className="w-6 h-6 text-yellow-500" />
            <div>
              <p className="font-medium text-yellow-400 mb-1">GitHub Reconnect Needed</p>
              <p className="text-xs text-muted-foreground">
                Your GitHub token has expired. Reconnect to continue pushing code.
              </p>
              {status.github_username && (
                <p className="text-xs text-muted-foreground mt-1">
                  Was connected as{" "}
                  <span className="text-foreground font-medium">
                    @{status.github_username}
                  </span>
                </p>
              )}
            </div>
            <Button
              className="w-full gap-2"
              size="sm"
              onClick={() => githubApi.connect()}
            >
              <GitHubIcon className="w-4 h-4" />
              Reconnect GitHub
            </Button>
          </div>
        )}

        {/* ================================================================
            STATE B — Connected, no repo linked
            ================================================================ */}
        {status?.connected && !linkedRepoUrl && (
          <div className="p-3 space-y-4">
            {/* GitHub account badge */}
            <div className="flex items-center justify-between p-2.5 rounded-md bg-muted/50 border border-border/50">
              <StatusBadge
                connected={true}
                username={status.github_username}
                avatarUrl={status.avatar_url}
              />
              <span className="text-xs text-green-400">✓ Connected</span>
            </div>

            {/* Repo selector */}
            <div>
              <SectionHeader>Link a Repository</SectionHeader>
              <p className="text-xs text-muted-foreground mb-3">
                Select a repository to push your project code to.
              </p>

              {repos.length === 0 ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={loadRepos}
                  disabled={isLoadingRepos}
                >
                  {isLoadingRepos ? (
                    <><Loader2 className="w-3 h-3 mr-2 animate-spin" />Loading repos...</>
                  ) : (
                    "Load Repositories"
                  )}
                </Button>
              ) : (
                <div className="space-y-2">
                  {/* Dropdown */}
                  <div className="relative">
                    <button
                      className="w-full flex items-center justify-between px-3 py-2 rounded-md border border-border bg-muted text-xs hover:bg-muted/80 transition-colors"
                      onClick={() => setRepoDropdownOpen((p) => !p)}
                    >
                      <span className="truncate">
                        {selectedRepo
                          ? selectedRepo.full_name
                          : "Select a repository..."}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 ml-1 shrink-0 text-muted-foreground" />
                    </button>

                    {repoDropdownOpen && (
                      <div className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-md border border-border bg-popover shadow-lg">
                        {repos.map((repo) => (
                          <button
                            key={repo.id}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors flex items-center gap-2"
                            onClick={() => {
                              setSelectedRepo(repo);
                              setRepoDropdownOpen(false);
                            }}
                          >
                            <span className="truncate flex-1">{repo.full_name}</span>
                            {repo.private && (
                              <span className="text-[10px] text-muted-foreground border border-border rounded px-1">
                                private
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedRepo && (
                    <div className="text-xs text-muted-foreground px-1">
                      Branch:{" "}
                      <span className="text-foreground">
                        {selectedRepo.default_branch}
                      </span>
                    </div>
                  )}

                  <Button
                    className="w-full gap-2"
                    size="sm"
                    onClick={handleLinkRepo}
                    disabled={!selectedRepo || isLinking}
                  >
                    {isLinking ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Link2 className="w-3.5 h-3.5" />
                    )}
                    Link Repository
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================
            STATE C — Connected + repo linked — ready to push
            ================================================================ */}
        {status?.connected && linkedRepoUrl && (
          <div className="p-3 space-y-4">
            {/* GitHub + repo summary */}
            <div className="p-2.5 rounded-md bg-muted/50 border border-border/50 space-y-1.5">
              <StatusBadge
                connected={true}
                username={status.github_username}
                avatarUrl={status.avatar_url}
              />
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <GitBranch className="w-3 h-3 shrink-0" />
                <span className="truncate">{linkedRepoName ?? linkedRepoUrl}</span>
                <span className="shrink-0 text-[10px] border border-border rounded px-1">
                  {linkedBranch}
                </span>
              </div>
            </div>

            {/* Changed files */}
            <div>
              <SectionHeader>
                Changes{" "}
                {changedFileNames.length > 0 && (
                  <span className="text-foreground">({changedFileNames.length})</span>
                )}
              </SectionHeader>

              {changedFileNames.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No unsaved changes. All files will be committed as-is.
                </p>
              ) : (
                <div className="space-y-0.5 mb-1">
                  {changedFileNames.map((name) => (
                    <div
                      key={name}
                      className="flex items-center gap-2 px-2 py-1 rounded text-xs text-yellow-400"
                    >
                      <FileCode className="w-3 h-3 shrink-0" />
                      <span className="truncate">{name}</span>
                      <span className="ml-auto text-[10px] font-mono">M</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Last push summary */}
              {lastPushFiles.length > 0 && (
                <div className="mt-2 p-2 rounded bg-green-500/10 border border-green-500/20">
                  <p className="text-[10px] font-semibold text-green-400 mb-1 uppercase tracking-wide">
                    Last push included
                  </p>
                  <div className="space-y-0.5">
                    {lastPushFiles.map((name) => (
                      <div
                        key={name}
                        className="flex items-center gap-1.5 text-[11px] text-green-300/80"
                      >
                        <Check className="w-3 h-3 shrink-0" />
                        <span className="truncate">{name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Commit + Push */}
            <div className="space-y-2">
              <SectionHeader>Commit & Push</SectionHeader>
              <Input
                placeholder="Commit message (required)"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) handleCommitAndPush();
                }}
                className="text-xs h-8"
              />
              <Button
                className="w-full gap-2"
                size="sm"
                onClick={handleCommitAndPush}
                disabled={isPushing || !commitMessage.trim()}
              >
                {isPushing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                {isPushing ? "Pushing..." : "Commit & Push"}
              </Button>
            </div>

            {/* Unlink */}
            <div className="pt-2 border-t border-border/50">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground hover:text-red-400 gap-1.5"
                onClick={handleUnlinkRepo}
                disabled={isUnlinking}
              >
                <Link2Off className="w-3 h-3" />
                {isUnlinking ? "Unlinking..." : "Unlink Repository"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
