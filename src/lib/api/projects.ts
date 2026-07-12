import { fetchApi } from "../api";

export type ProjectVisibility = "PRIVATE" | "UNLISTED" | "PUBLIC";

export interface Project {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  language: string | null;
  visibility: ProjectVisibility;
  favorite: boolean;
  color: string | null;
  icon: string | null;
  slug: string;
  created_at: string;
  updated_at: string;
  last_opened_at: string;
  deleted_at: string | null;
}

export interface ProjectListResponse {
  items: Project[];
  total: number;
  page: number;
  size: number;
}

export interface CreateProjectPayload {
  name: string;
  description?: string;
  language?: string;
  visibility?: ProjectVisibility;
  color?: string;
  icon?: string;
}

export interface UpdateProjectPayload extends Partial<CreateProjectPayload> {
  favorite?: boolean;
}

export const projectsApi = {
  getProjects: async (params?: {
    page?: number;
    size?: number;
    search?: string;
    language?: string;
    favorite?: boolean;
    sort_by?: "updated_at" | "created_at" | "last_opened_at" | "name";
  }) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) query.append(key, value.toString());
      });
    }
    return fetchApi(`/projects?${query.toString()}`);
  },

  getTrash: async (params?: {
    page?: number;
    size?: number;
    search?: string;
    sort_by?: "updated_at" | "created_at" | "name";
  }) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) query.append(key, value.toString());
      });
    }
    return fetchApi(`/projects/trash?${query.toString()}`);
  },

  getProject: async (id: string) => {
    return fetchApi(`/projects/${id}`);
  },

  createProject: async (data: CreateProjectPayload) => {
    return fetchApi("/projects", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateProject: async (id: string, data: UpdateProjectPayload) => {
    return fetchApi(`/projects/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  deleteProject: async (id: string) => {
    return fetchApi(`/projects/${id}`, {
      method: "DELETE",
    });
  },

  permanentDeleteProject: async (id: string) => {
    return fetchApi(`/projects/${id}/permanent`, {
      method: "DELETE",
    });
  },

  emptyTrash: async () => {
    return fetchApi("/projects/trash", {
      method: "DELETE",
    });
  },

  restoreProject: async (id: string) => {
    return fetchApi(`/projects/${id}/restore`, {
      method: "POST",
    });
  },

  toggleFavorite: async (id: string) => {
    return fetchApi(`/projects/${id}/favorite`, {
      method: "POST",
    });
  },

  duplicateProject: async (id: string) => {
    return fetchApi(`/projects/${id}/duplicate`, {
      method: "POST",
    });
  },
};
