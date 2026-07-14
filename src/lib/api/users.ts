import { fetchApi } from "../api";

export interface ActivityData {
  date: string;
  count: number;
}

export interface ActivityHeatmapResponse {
  heatmap: ActivityData[];
  current_streak: number;
  max_streak: number;
}

export const usersApi = {
  getHeatmap: async (): Promise<ActivityHeatmapResponse> => {
    const response = await fetchApi("/users/activity/heatmap");
    return response.data;
  },
  
  recordActivity: async (): Promise<void> => {
    await fetchApi("/users/activity/record", { method: "POST" });
  }
};
