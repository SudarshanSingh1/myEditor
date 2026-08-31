import { fetchApi } from '../api';

export interface GitHubRepo {
  id: number;
  full_name: string;
  name: string;
  owner: string;
  private: boolean;
  default_branch: string;
  html_url: string;
  clone_url: string;
}

export const githubApi = {
  /** Check if GitHub is connected and who it's connected as */
  getStatus: () => fetchApi('/github/status', { method: 'GET' }),

  /** Redirect to GitHub OAuth to connect an account (for logged-in users) */
  connect: () => {
    sessionStorage.setItem('oauth_redirect_url', window.location.pathname);
    window.location.href = '/api/v1/auth/oauth/github/connect';
  },

  /** Disconnect the connected GitHub account */
  disconnect: () => fetchApi('/github/disconnect', { method: 'DELETE' }),

  /** List repos accessible by the connected GitHub account */
  getRepos: (): Promise<{ data: GitHubRepo[] }> =>
    fetchApi('/github/repos', { method: 'GET' }),

  /** Create a new repo on GitHub */
  createRepo: (data: { name: string; description?: string; private?: boolean }) =>
    fetchApi('/github/repos', { method: 'POST', body: JSON.stringify(data) }),

  /** Link an editor project to a GitHub repo URL */
  linkRepo: (projectId: string, repoUrl: string, defaultBranch: string) =>
    fetchApi(`/github/projects/${projectId}/link`, {
      method: 'POST',
      body: JSON.stringify({ repo_url: repoUrl, default_branch: defaultBranch }),
    }),

  /** Remove the GitHub repo link from a project */
  unlinkRepo: (projectId: string) =>
    fetchApi(`/github/projects/${projectId}/link`, { method: 'DELETE' }),
};

export const gitApi = {
  clone: (data: { project_id: string; repo_url: string; branch?: string }) =>
    fetchApi('/git/clone', { method: 'POST', body: JSON.stringify(data) }),

  push: (data: { project_id: string; message: string }) =>
    fetchApi('/git/push', { method: 'POST', body: JSON.stringify(data) }),
};
