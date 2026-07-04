import apiClient from '../../../shared/api/axios.client';

export const reportsApi = {
  create: async (payload: { locationId: string; title?: string }) => {
    const response = await apiClient.post('/reports', payload);
    return response.data.data;
  },

  getAll: async () => {
    const response = await apiClient.get('/reports');
    return response.data.data.reports;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/reports/${id}`);
    return response.data.data.report;
  },

  getDownloadUrl: async (id: string) => {
    const response = await apiClient.get(`/reports/${id}/download`);
    return response.data.data;
  },
};