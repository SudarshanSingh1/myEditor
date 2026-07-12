import { fetchApi } from '../api';

export interface ExecutionRequest {
  project_id: string;
  file_id: string;
  language: string;
  input?: string;
}

export interface ExecutionResponse {
  language: string;
  compile_time_ms: number;
  execution_time_ms: number;
  memory_used_kb: number;
  exit_code: number;
  output: string;
  status: string;
}

export const executionApi = {
  run: async (request: ExecutionRequest): Promise<ExecutionResponse> => {
    const response = await fetchApi('/execution/run', {
      method: 'POST',
      body: JSON.stringify(request)
    });
    return response.data;
  },
  
  stop: async (container_id: string): Promise<void> => {
    await fetchApi(`/execution/run/stop?container_id=${container_id}`, { method: 'POST' });
  }
};
