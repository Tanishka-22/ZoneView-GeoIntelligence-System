import apiClient from '../../../shared/api/axios.client';

export const usageApi = {
  getCurrent: async () => {
    const response = await apiClient.get('/usage');
    return response.data.data;
  },

  getSubscription: async () => {
    const response = await apiClient.get('/subscription');
    return response.data.data.subscription;
  },
};