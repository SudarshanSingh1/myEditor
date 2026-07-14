import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FolderPlus, LayoutGrid, List } from "lucide-react";
import { useProjectsStore } from "../../stores/useProjectsStore";
import { PageHeader } from "../../components/ui/PageHeader";
import { ProjectCard } from "../../components/ui/ProjectCard";
import { SearchInput } from "../../components/ui/SearchInput";
import { EmptyState } from "../../components/ui/EmptyState";
import { Button } from "../../components/ui/Button";
import { CreateProjectModal } from "../../components/projects/CreateProjectModal";
import { LoadingSkeleton } from "../../components/ui/LoadingSkeleton";

export default function Projects() {
  const navigate = useNavigate();

  const {
    projects,
    toggleFavorite,
    fetchProjects,
    isLoading,
  } = useProjectsStore();

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProjects({
        search: search || undefined,
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [search, fetchProjects]);

  return (
    <div className="p-6 md:p-8 lg:p-10 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Projects"
        description="Manage your workspaces and cloud environments."
        action={
          <Button
            className="gap-2"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <FolderPlus className="h-4 w-4" />
            New Project
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <SearchInput
          className="max-w-md"
          placeholder="Search projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="flex items-center gap-2 self-end sm:self-auto border rounded-md p-1 bg-background">
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 px-2 ${viewMode === "grid" ? "bg-muted" : ""}`}
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className={`h-8 px-2 ${viewMode === "list" ? "bg-muted" : ""}`}
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading && projects.length === 0 ? (
        <div
          className={`grid gap-6 ${
            viewMode === "grid"
              ? "md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              : "grid-cols-1"
          }`}
        >
          <LoadingSkeleton className="h-[120px] w-full rounded-xl" />
          <LoadingSkeleton className="h-[120px] w-full rounded-xl" />
          <LoadingSkeleton className="h-[120px] w-full rounded-xl" />
          <LoadingSkeleton className="h-[120px] w-full rounded-xl" />
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderPlus}
          title="No projects found"
          description={
            search
              ? "Try adjusting your search query."
              : "You haven't created any projects yet."
          }
          action={
            !search && (
              <Button onClick={() => setIsCreateModalOpen(true)}>
                Create your first project
              </Button>
            )
          }
        />
      ) : (
        <div
          className={`grid gap-6 ${
            viewMode === "grid"
              ? "md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              : "grid-cols-1"
          }`}
        >
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              {...project}
              onFavorite={toggleFavorite}
              onOpen={(id) => navigate(`/app/projects/${id}/editor`)}
            />
          ))}
        </div>
      )}

      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(projectId) => {
          setIsCreateModalOpen(false);

          fetchProjects();

          navigate(`/app/projects/${projectId}`);
        }}
      />
    </div>
  );
}