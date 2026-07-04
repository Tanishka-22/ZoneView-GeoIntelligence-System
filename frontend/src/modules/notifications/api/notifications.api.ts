import apiClient from '../../../shared/api/axios.client';

export const notificationsApi = {
  getAll: async () => {
    const response = await apiClient.get('/notifications');
    return response.data.data.notifications;
  },

  markAsRead: async (id: string) => {
    const response = await apiClient.patch(`/notifications/${id}/read`);
    return response.data;
  },
};