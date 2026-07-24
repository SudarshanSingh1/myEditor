import { fetchApi } from '../api';

export interface Folder {
  id: string;
  project_id: string;
  parent_id: string | null;
  name: string;
  path: string;
  depth: number;
  created_at: string;
  updated_at: string;
}

export interface FileNode {
  id: string;
  project_id: string;
  folder_id: string | null;
  name: string;
  extension: string | null;
  language: string | null;
  content: string | null;
  size: number;
  encoding: string | null;
  version: number;
  is_read_only: boolean;
  created_at: string;
  updated_at: string;
}

export interface FolderTree extends Folder {
  children: FolderTree[];
  files: FileNode[];
}

export interface ProjectTree {
  project_id: string;
  folders: FolderTree[];
  files: FileNode[];
}

export const workspaceApi = {
  getProjectTree: async (projectId: string): Promise<ProjectTree> => {
    const res = await fetchApi(`/workspace/projects/${projectId}/tree`);
    return res.data;
  },

  createFolder: async (data: { project_id: string; name: string; parent_id?: string | null }) => {
    const res = await fetchApi('/workspace/folders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  updateFolder: async (folderId: string, data: { name?: string; parent_id?: string | null }) => {
    const res = await fetchApi(`/workspace/folders/${folderId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  deleteFolder: async (folderId: string) => {
    await fetchApi(`/workspace/folders/${folderId}`, {
      method: 'DELETE',
    });
  },

  getFile: async (fileId: string): Promise<FileNode> => {
    const res = await fetchApi(`/workspace/files/${fileId}`);
    return res.data;
  },

  createFile: async (data: { project_id: string; name: string; folder_id?: string | null; content?: string }) => {
    const res = await fetchApi('/workspace/files', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  updateFile: async (fileId: string, data: { name?: string; content?: string; folder_id?: string | null }) => {
    const res = await fetchApi(`/workspace/files/${fileId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  deleteFile: async (fileId: string) => {
    await fetchApi(`/workspace/files/${fileId}`, {
      method: 'DELETE',
    });
  },

  duplicateFile: async (fileId: string) => {
    const res = await fetchApi(`/workspace/files/${fileId}/duplicate`, {
      method: 'POST',
    });
    return res.data;
  },

  saveFile: async (data: { id: string; content: string; expected_version: number }): Promise<FileNode> => {
    const res = await fetchApi('/workspace/files/save', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  saveBatch: async (data: { files: Array<{ id: string; content: string; expected_version: number }> }): Promise<FileNode[]> => {
    const res = await fetchApi('/workspace/files/save-batch', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },
};
