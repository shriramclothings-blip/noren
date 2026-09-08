import client from './client';

export const login = (email, password) =>
  client.post('/api/auth/login', { email, password });

export const getMe = () => client.get('/api/auth/me');

export const logout = () => client.post('/api/auth/logout');

export const changePassword = (data) => client.post('/api/auth/change-password', data);

export const forgotPassword = (email) => client.post('/api/auth/forgot-password', { email });

export const resetPassword = (data) => client.post('/api/auth/reset-password', data);
