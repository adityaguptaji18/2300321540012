import axios from 'axios';

const BASE_URL = 'http://localhost:4000/api';

export const getAllNotifications = async () => {
  const { data } = await axios.get(`${BASE_URL}/notifications`);
  return data.data || [];
};

export const getPriorityNotifications = async (limit = 10, type = '') => {
  const params = new URLSearchParams();
  params.append('limit', limit);
  if (type) params.append('notification_type', type);
  const { data } = await axios.get(`${BASE_URL}/priority-notifications?${params}`);
  return data.data || [];
};