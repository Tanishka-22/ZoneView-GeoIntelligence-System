import apiClient from '../../../shared/api/axios.client';

export const locationsApi = {
  getAll: async (params?: { page?: number; limit?: number; search?: string }) => {
    const response = await apiClient.get('/locations', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/locations/${id}`);
    return response.data.data.location;
  },

  getDevelopments: async (id: string) => {
    const response = await apiClient.get(`/locations/${id}/developments`);
    return response.data.data.developments;
  },

  explain: async (id: string) => {
    const response = await apiClient.post(`/locations/${id}/explain`);
    return response.data.data.insight;
  },
};