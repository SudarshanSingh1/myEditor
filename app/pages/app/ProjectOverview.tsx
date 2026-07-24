import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useProjectsStore } from "../../stores/useProjectsStore";
import { fetchApi } from "../../lib/api";
import { 
  Code, FolderOpen, Clock, Users, PlaySquare, Calendar, 
  Settings, ArrowLeft, Terminal, GitBranch, ChevronRight, Activity 
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { LoadingSkeleton } from "../../components/ui/LoadingSkeleton";
import { PageHeader } from "../../components/ui/PageHeader";

export default function ProjectOverview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { projects } = useProjectsStore();
  
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try to get from store first
    const existing = projects.find(p => p.id === id);
    if (existing) {
      setProject(existing);
      setLoading(false);
    } else {
      // Fetch directly if not in store
      fetchApi(`/projects/${id}`)
        .then(res => {
          if (res?.success) setProject(res.data);
        })
        .finally(() => setLoading(false));
    }
  }, [id, projects]);

  if (loading) {
    return (
      <div className="p-6 md:p-8 lg:p-10 max-w-7xl mx-auto space-y-8">
        <LoadingSkeleton className="h-24 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <LoadingSkeleton className="h-64 rounded-2xl md:col-span-2" />
          <LoadingSkeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6 text-center py-24">
        <FolderOpen className="mx-auto h-12 w-12 text-gray-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">Project Not Found</h2>
        <p className="text-gray-400 mb-6">The project you're looking for doesn't exist or you don't have access.</p>
        <Button onClick={() => navigate("/app/dashboard")}>Back to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 lg:p-10 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <button 
            onClick={() => navigate("/app/dashboard")}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-3"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-violet-500/10 rounded-xl">
              <Code className="w-6 h-6 text-violet-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">{project.name}</h1>
              <p className="text-sm text-gray-400 mt-1">{project.description || "No description provided"}</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button 
            variant="outline" 
            className="flex-1 md:flex-none gap-2"
            onClick={() => {}}
          >
            <Settings className="w-4 h-4" /> Settings
          </Button>
          <Button 
            className="flex-1 md:flex-none gap-2 bg-violet-600 hover:bg-violet-700"
            onClick={() => navigate(`/app/projects/${id}/editor`)}
          >
            <Terminal className="w-4 h-4" /> Open Editor
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-white/10 bg-[#18181b] p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-violet-400" /> Recent Activity
            </h3>
            <div className="text-center py-12 border border-dashed border-white/10 rounded-xl">
              <p className="text-gray-500 text-sm">No recent activity found for this project.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#18181b] p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <PlaySquare className="w-5 h-5 text-blue-400" /> Execution History
            </h3>
            <div className="text-center py-12 border border-dashed border-white/10 rounded-xl">
              <p className="text-gray-500 text-sm">You haven't run any code in this project yet.</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4"
                onClick={() => navigate(`/app/projects/${id}/editor`)}
              >
                Run Code Now
              </Button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-[#18181b] p-6 shadow-xl">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Project Details</h3>
            <ul className="space-y-4">
              <li className="flex items-center gap-3 text-sm">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-gray-400">Created:</span>
                <span className="text-white ml-auto">{new Date(project.created_at).toLocaleDateString()}</span>
              </li>
              <li className="flex items-center gap-3 text-sm">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-gray-400">Updated:</span>
                <span className="text-white ml-auto">{new Date(project.updated_at).toLocaleDateString()}</span>
              </li>
              <li className="flex items-center gap-3 text-sm">
                <GitBranch className="w-4 h-4 text-gray-500" />
                <span className="text-gray-400">Environment:</span>
                <span className="text-white ml-auto capitalize">{project.env_type || "Node.js"}</span>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#18181b] p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Members</h3>
              <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">Invite</Button>
            </div>
            <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-white/5">
              <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-xs font-bold">
                Me
              </div>
              <div>
                <p className="text-sm font-medium text-white">You</p>
                <p className="text-xs text-gray-500">Owner</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
