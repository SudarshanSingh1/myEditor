import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Code,
  Cloud,
  Terminal,
  GitMerge,
  FilePlus,
  FolderUp,
} from "lucide-react";

import { useUserStore } from "../../stores/useUserStore";
import { useProjectsStore } from "../../stores/useProjectsStore";

import { PageHeader } from "../../components/ui/PageHeader";
import { StatCard } from "../../components/ui/StatCard";
import { ProjectCard } from "../../components/ui/ProjectCard";
import { Button } from "../../components/ui/Button";
import { CreateProjectModal } from "../../components/projects/CreateProjectModal";
import { LoadingSkeleton } from "../../components/ui/LoadingSkeleton";

export default function Dashboard() {
  const navigate = useNavigate();

  const { user } = useUserStore();

  const {
    projects,
    totalProjects,
    toggleFavorite,
    fetchProjects,
    isLoading,
  } = useProjectsStore();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    fetchProjects({
      size: 3,
      sort_by: "last_opened_at",
    });
  }, [fetchProjects]);

  const recentProjects = projects.slice(0, 3);

  return (
    <div className="p-6 md:p-8 lg:p-10 max-w-7xl mx-auto space-y-8">
      {/* Welcome Banner */}
      <div className="rounded-xl border bg-card p-6 md:p-8 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Terminal className="h-40 w-40" />
        </div>

        <div className="relative z-10">
          <h2 className="text-2xl font-bold tracking-tight mb-2">
            Welcome back, {user?.first_name || user?.username} 👋
          </h2>

          <p className="text-muted-foreground mb-6 max-w-lg">
            Ready to build something amazing today? You have {totalProjects} active
            projects.
          </p>

          <div className="flex flex-wrap gap-4">
            <Button
              className="gap-2"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <FilePlus className="h-4 w-4" />
              New Project
            </Button>

            <Button variant="outline" className="gap-2" disabled onClick={() => {}}>
              <FolderUp className="h-4 w-4" />
              Import Project
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Projects"
          value={totalProjects.toString()}
          icon={Code}
          description="Your workspaces"
        />

        <StatCard
          title="Role"
          value={(user?.role || "USER").toUpperCase()}
          icon={Cloud}
          description="Current access level"
        />

        <StatCard
          title="Deployments"
          value="0"
          icon={Terminal}
          description="Coming soon"
        />

        <StatCard
          title="Collaborators"
          value="0"
          icon={GitMerge}
          description="Coming soon"
        />
      </div>

      {/* Recent Projects */}
      <div>
        <PageHeader
          title="Continue Coding"
          action={
            <Button variant="ghost" size="sm">
              View All
            </Button>
          }
          className="pb-4"
        />

        {isLoading && projects.length === 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <LoadingSkeleton className="h-[120px] w-full rounded-xl" />
            <LoadingSkeleton className="h-[120px] w-full rounded-xl" />
            <LoadingSkeleton className="h-[120px] w-full rounded-xl" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12 border rounded-xl border-dashed">
            <Code className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />

            <h3 className="text-lg font-medium mb-1">
              No projects yet
            </h3>

            <p className="text-muted-foreground mb-4">
              Create your first project to get started.
            </p>

            <Button onClick={() => setIsCreateModalOpen(true)}>
              Create Project
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {recentProjects.map((project) => (
              <ProjectCard
                key={project.id}
                {...project}
                onFavorite={toggleFavorite}
                onOpen={(id) => navigate(`/app/projects/${id}`)}
              />
            ))}
          </div>
        )}
      </div>

      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(projectId) => {
          setIsCreateModalOpen(false);

          fetchProjects({
            size: 3,
            sort_by: "last_opened_at",
          });

          navigate(`/app/projects/${projectId}`);
        }}
      />
    </div>
  );
}