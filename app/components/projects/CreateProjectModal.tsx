import { useState } from "react";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { useProjectsStore } from "../../stores/useProjectsStore";
import type { ProjectVisibility } from "../../lib/api/projects";
import { Globe, Lock, Link as LinkIcon, AlertCircle } from "lucide-react";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (projectId: string) => void;
}

const LANGUAGES = ["TypeScript", "JavaScript", "Python", "Java", "C", "C++", "Rust", "Go", "HTML/CSS"];
const _COLORS = ["blue", "green", "purple", "orange", "red", "yellow", "cyan", "pink"];
const ICONS = ["💻", "📚", "⚡", "🚀", "🧠", "🔥", "✨", "🛠️"];

export function CreateProjectModal({ isOpen, onClose, onSuccess }: CreateProjectModalProps) {
  const { createProject, isLoading, error } = useProjectsStore();
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("TypeScript");
  const [visibility, setVisibility] = useState<ProjectVisibility>("PRIVATE");
  const [color, _setColor] = useState("blue");
  const [icon, setIcon] = useState("💻");

  const [validationError, setValidationError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");

    if (!name.trim()) {
      setValidationError("Project name is required");
      return;
    }
    if (name.length > 100) {
      setValidationError("Project name must be less than 100 characters");
      return;
    }

    const newProject = await createProject({
      name: name.trim(),
      description: description.trim(),
      language,
      visibility,
      color,
      icon,
    });

    if (newProject) {
      setName("");
      setDescription("");
      if (onSuccess) onSuccess(newProject.id);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create a new project">
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {(error || validationError) && (
          <div className="p-3 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-md flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p>{validationError || error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Project Name <span className="text-red-500">*</span></label>
            <Input 
              placeholder="e.g. My Awesome Project" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              maxLength={100}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground">Description (optional)</label>
            <Input 
              placeholder="What is this project about?" 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Language</label>
              <select 
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                {LANGUAGES.map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Icon</label>
              <div className="flex gap-2 p-1 border rounded-md overflow-x-auto bg-background/50">
                {ICONS.map(i => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setIcon(i)}
                    className={`flex-shrink-0 w-7 h-7 rounded flex items-center justify-center text-sm transition-colors ${icon === i ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Visibility</label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setVisibility("PRIVATE")}
                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-lg border text-sm transition-all ${visibility === "PRIVATE" ? 'border-primary bg-primary/5 text-primary' : 'hover:border-primary/50 text-muted-foreground'}`}
              >
                <Lock className="w-5 h-5" />
                <span className="font-medium">Private</span>
              </button>
              <button
                type="button"
                onClick={() => setVisibility("UNLISTED")}
                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-lg border text-sm transition-all ${visibility === "UNLISTED" ? 'border-primary bg-primary/5 text-primary' : 'hover:border-primary/50 text-muted-foreground'}`}
              >
                <LinkIcon className="w-5 h-5" />
                <span className="font-medium">Unlisted</span>
              </button>
              <button
                type="button"
                onClick={() => setVisibility("PUBLIC")}
                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-lg border text-sm transition-all ${visibility === "PUBLIC" ? 'border-primary bg-primary/5 text-primary' : 'hover:border-primary/50 text-muted-foreground'}`}
              >
                <Globe className="w-5 h-5" />
                <span className="font-medium">Public</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="ghost" type="button" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Creating..." : "Create Project"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
