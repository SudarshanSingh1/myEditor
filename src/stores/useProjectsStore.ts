import { create } from "zustand";
import { projectsApi } from "../lib/api/projects";
import type { 
  Project, 
  CreateProjectPayload, 
  UpdateProjectPayload 
} from "../lib/api/projects";

interface ProjectsState {
  projects: Project[];
  trash: Project[];
  selectedProject: Project | null;
  totalProjects: number;
  isLoading: boolean;
  error: string | null;
  
  // Fetching
  fetchProjects: (params?: Parameters<typeof projectsApi.getProjects>[0]) => Promise<void>;
  fetchTrash: (params?: Parameters<typeof projectsApi.getTrash>[0]) => Promise<void>;
  fetchProject: (id: string) => Promise<Project | null>;
  
  // Actions
  createProject: (data: CreateProjectPayload) => Promise<Project | null>;
  updateProject: (id: string, data: UpdateProjectPayload) => Promise<Project | null>;
  deleteProject: (id: string) => Promise<boolean>;
  permanentDeleteProject: (id: string) => Promise<boolean>;
  emptyTrash: () => Promise<boolean>;
  restoreProject: (id: string) => Promise<boolean>;
  toggleFavorite: (id: string) => Promise<boolean>;
  duplicateProject: (id: string) => Promise<Project | null>;
  
  // Selection
  selectProject: (project: Project | null) => void;
}

export const useProjectsStore = create<ProjectsState>((set, get) => ({
  projects: [],
  trash: [],
  selectedProject: null,
  totalProjects: 0,
  isLoading: false,
  error: null,

  fetchProjects: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const response = await projectsApi.getProjects(params);
      if (response.success) {
        set({ 
          projects: response.data.items,
          totalProjects: response.data.total
        });
      } else {
        set({ error: response.message });
      }
    } catch (error: any) {
      set({ error: error.message || "Failed to fetch projects" });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchTrash: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const response = await projectsApi.getTrash(params);
      if (response.success) {
        set({ trash: response.data.items });
      } else {
        set({ error: response.message });
      }
    } catch (error: any) {
      set({ error: error.message || "Failed to fetch trash" });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchProject: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await projectsApi.getProject(id);
      if (response.success) {
        set({ selectedProject: response.data });
        return response.data;
      }
      return null;
    } catch (error: any) {
      set({ error: error.message || "Failed to fetch project" });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  createProject: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await projectsApi.createProject(data);
      if (response.success) {
        const newProject = response.data;
        set((state) => ({ 
          projects: [newProject, ...state.projects],
          totalProjects: state.totalProjects + 1
        }));
        return newProject;
      }
      set({ error: response.message });
      return null;
    } catch (error: any) {
      set({ error: error.message || "Failed to create project" });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  updateProject: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await projectsApi.updateProject(id, data);
      if (response.success) {
        const updated = response.data;
        set((state) => ({
          projects: state.projects.map(p => p.id === id ? updated : p),
          selectedProject: state.selectedProject?.id === id ? updated : state.selectedProject
        }));
        return updated;
      }
      set({ error: response.message });
      return null;
    } catch (error: any) {
      set({ error: error.message || "Failed to update project" });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  deleteProject: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await projectsApi.deleteProject(id);
      if (response.success) {
        const deletedProject = response.data;
        set((state) => ({
          projects: state.projects.filter(p => p.id !== id),
          trash: [deletedProject, ...state.trash],
          totalProjects: Math.max(0, state.totalProjects - 1),
          selectedProject: state.selectedProject?.id === id ? null : state.selectedProject
        }));
        return true;
      }
      set({ error: response.message });
      return false;
    } catch (error: any) {
      set({ error: error.message || "Failed to delete project" });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  permanentDeleteProject: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await projectsApi.permanentDeleteProject(id);
      if (response.success) {
        set((state) => ({
          trash: state.trash.filter(p => p.id !== id)
        }));
        return true;
      }
      set({ error: response.message });
      return false;
    } catch (error: any) {
      set({ error: error.message || "Failed to permanently delete project" });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  emptyTrash: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await projectsApi.emptyTrash();
      if (response.success) {
        set({ trash: [] });
        return true;
      }
      set({ error: response.message });
      return false;
    } catch (error: any) {
      set({ error: error.message || "Failed to empty trash" });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  restoreProject: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await projectsApi.restoreProject(id);
      if (response.success) {
        const restoredProject = response.data;
        set((state) => ({
          trash: state.trash.filter(p => p.id !== id),
          projects: [restoredProject, ...state.projects],
          totalProjects: state.totalProjects + 1
        }));
        return true;
      }
      set({ error: response.message });
      return false;
    } catch (error: any) {
      set({ error: error.message || "Failed to restore project" });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  toggleFavorite: async (id) => {
    try {
      // Optimistic update
      set((state) => ({
        projects: state.projects.map(p => p.id === id ? { ...p, favorite: !p.favorite } : p),
        selectedProject: state.selectedProject?.id === id ? { ...state.selectedProject, favorite: !state.selectedProject.favorite } : state.selectedProject
      }));
      
      const response = await projectsApi.toggleFavorite(id);
      if (!response.success) {
        // Revert on failure
        set((state) => ({
          projects: state.projects.map(p => p.id === id ? { ...p, favorite: !p.favorite } : p),
          error: response.message
        }));
        return false;
      }
      return true;
    } catch (error: any) {
      // Revert on error
      set((state) => ({
        projects: state.projects.map(p => p.id === id ? { ...p, favorite: !p.favorite } : p),
        error: error.message || "Failed to toggle favorite"
      }));
      return false;
    }
  },

  duplicateProject: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await projectsApi.duplicateProject(id);
      if (response.success) {
        const newProject = response.data;
        set((state) => ({
          projects: [newProject, ...state.projects],
          totalProjects: state.totalProjects + 1
        }));
        return newProject;
      }
      set({ error: response.message });
      return null;
    } catch (error: any) {
      set({ error: error.message || "Failed to duplicate project" });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  selectProject: (project) => {
    set({ selectedProject: project });
  }
}));
