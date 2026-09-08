import client from './client';

export const getCustomers = (params) => client.get('/api/support/customers', { params });
export const getCustomer = (id) => client.get(`/api/support/customers/${id}`);
export const getCustomerOrders = (id, params) => client.get(`/api/support/customers/${id}/orders`, { params });
export const getCustomerTickets = (id) => client.get(`/api/support/customers/${id}/tickets`);
export const getCustomerActivity = (id) => client.get(`/api/support/customers/${id}/activity`);
export const getCustomerSessions = (id) => client.get(`/api/support/customers/${id}/sessions`);
