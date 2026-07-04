import apiClient from '../../../shared/api/axios.client';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    avatarUrl: string | null;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export const authApi = {
  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/login', payload);
    return response.data.data;
  },

  register: async (payload: RegisterPayload): Promise<{ user: AuthResponse['user'] }> => {
    const response = await apiClient.post('/auth/register', payload);
    return response.data.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout').catch(() => {});
    // Always clear local state even if the server call fails
  },

  getMe: async (): Promise<AuthResponse['user']> => {
    const response = await apiClient.get('/users/me');
    return response.data.data.user;
  },
};