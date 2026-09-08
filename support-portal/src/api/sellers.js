import client from './client';

export const getSellers = (params) => client.get('/api/support/sellers', { params });
export const getSeller = (id) => client.get(`/api/support/sellers/${id}`);
export const getSellerTickets = (id) => client.get(`/api/support/sellers/${id}/tickets`);
export const getSellerOrders = (id, params) => client.get(`/api/support/sellers/${id}/orders`, { params });
export const getSellerProducts = (id, params) => client.get(`/api/support/sellers/${id}/products`, { params });
