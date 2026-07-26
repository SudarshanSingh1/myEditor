/* eslint-disable react-hooks/exhaustive-deps */
/* oxlint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from "react";
import { Trash2, RotateCcw, AlertTriangle } from "lucide-react";
import { useProjectsStore } from "../../stores/useProjectsStore";
import { PageHeader } from "../../components/ui/PageHeader";
import { SearchInput } from "../../components/ui/SearchInput";
import { EmptyState } from "../../components/ui/EmptyState";
import { Button } from "../../components/ui/Button";
import { LoadingSkeleton } from "../../components/ui/LoadingSkeleton";
import { Card, CardContent } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { useConfirm } from "../../components/ui/ConfirmProvider";

export default function Trash() {
  const { trash, fetchTrash, restoreProject, permanentDeleteProject, emptyTrash, isLoading } = useProjectsStore();
  const { confirm } = useConfirm();
  const [search, setSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTrash({ search: search || undefined });
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="p-6 md:p-8 lg:p-10 max-w-7xl mx-auto space-y-6">
      <PageHeader 
        title="Trash" 
        description="Items in trash will be permanently deleted after 30 days."
        showBack
      />

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <SearchInput 
          className="max-w-md" 
          placeholder="Search deleted projects..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button 
          variant="destructive" 
          size="sm" 
          disabled={trash.length === 0} 
          className="gap-2"
          onClick={async () => {
            const confirmed = await confirm({
              title: "Empty Trash",
              description: "Are you sure you want to permanently delete all items in the trash? This action cannot be undone.",
              confirmText: "Empty Trash",
              variant: "destructive"
            });
            if (confirmed) {
              emptyTrash();
            }
          }}
        >
          <AlertTriangle className="w-4 h-4" /> Empty Trash
        </Button>
      </div>

      {isLoading && trash.length === 0 ? (
        <div className="space-y-4">
          <LoadingSkeleton className="h-20 w-full rounded-xl" />
          <LoadingSkeleton className="h-20 w-full rounded-xl" />
        </div>
      ) : trash.length === 0 ? (
        <EmptyState 
          icon={Trash2}
          title="Trash is empty"
          description={search ? "Try adjusting your search query." : "Deleted projects will appear here."}
        />
      ) : (
        <div className="space-y-4">
          {trash.map((project) => {
            const deletedAt = project.deleted_at ? new Date(project.deleted_at).toLocaleDateString() : 'Unknown';
            return (
              <Card key={project.id} className="group">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg border bg-muted/50 flex items-center justify-center shrink-0">
                      {project.icon || "📁"}
                    </div>
                    <div>
                      <h4 className="font-semibold">{project.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Deleted on {deletedAt}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {project.language && (
                      <Badge variant="secondary" className="font-mono text-[10px] uppercase hidden sm:flex">
                        {project.language}
                      </Badge>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-2 ml-2"
                      onClick={() => restoreProject(project.id)}
                    >
                      <RotateCcw className="w-4 h-4" /> Restore
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      className="gap-2"
                      onClick={async () => {
                        const confirmed = await confirm({
                          title: "Delete Project",
                          description: `Are you sure you want to permanently delete "${project.name}"? This cannot be undone.`,
                          confirmText: "Delete",
                          variant: "destructive"
                        });
                        if (confirmed) {
                          permanentDeleteProject(project.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
