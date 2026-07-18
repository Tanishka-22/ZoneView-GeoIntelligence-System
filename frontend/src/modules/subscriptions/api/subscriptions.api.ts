import apiClient from '../../../shared/api/axios.client';

export const subscriptionsApi = {
  getPlans: async () => {
    const response = await apiClient.get('/plans');
    return response.data.data.plans;
  },
  getCurrent: async () => {
    const response = await apiClient.get('/subscription');
    return response.data.data.subscription;
  },
   createOrder: async (planType: string) => {
    const response = await apiClient.post('/subscription/create-order', { planType });
    return response.data.data;
  },
  verifyPayment: async (payload: {
    planType: string;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => {
    const response = await apiClient.post('/subscription/verify-payment', payload);
    return response.data.data.subscription;
  },
  //to delete ig
  upgrade: async (planType: string) => {
    const response = await apiClient.post('/subscription/upgrade', { planType });
    return response.data.data.subscription;
  },
};