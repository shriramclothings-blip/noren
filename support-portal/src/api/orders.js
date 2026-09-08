import client from './client';

export const getOrders = (params) => client.get('/api/support/orders', { params });
export const getOrder = (id) => client.get(`/api/support/orders/${id}`);
export const getOrderTickets = (id) => client.get(`/api/support/orders/${id}/tickets`);
