import { fetchApi } from '../api';

export const githubApi = {
  getRepos: () => fetchApi('/github/repos', { method: 'GET' }),
  createRepo: (data: { name: string; description?: string; private?: boolean }) => 
    fetchApi('/github/repos', { method: 'POST', body: JSON.stringify(data) }),
};

export const gitApi = {
  clone: (data: { project_id: string; repo_url: string; branch?: string }) => 
    fetchApi('/git/clone', { method: 'POST', body: JSON.stringify(data) }),
  push: (data: { project_id: string; message: string }) => 
    fetchApi('/git/push', { method: 'POST', body: JSON.stringify(data) }),
};
