import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// Auth
export const getAuthStatus = () => api.get('/auth/status');
export const getAuthUrl = () => api.get('/auth/connect');
export const disconnect = () => api.post('/auth/disconnect');

// Listings
export const getListings = () => api.get('/listings');

// Analytics
export const getTrafficData = (days = 30) =>
  api.get(`/analytics/traffic?days=${days}`);
export const getDailyTraffic = (days = 30) =>
  api.get(`/analytics/traffic/daily?days=${days}`);

// Sales
export const getSales = (days = 90) => api.get(`/sales?days=${days}`);
export const getTopSellers = (days = 365) =>
  api.get(`/sales/top-sellers?days=${days}`);

// Promotions
export const getPromotions = () => api.get('/promotions');
export const getPromotionSettings = () => api.get('/promotions/settings');
export const updatePromotionSettings = (settings) =>
  api.put('/promotions/settings', settings);
export const runAutoPromotion = () => api.post('/promotions/run-now');
export const promoteListingManually = (listingId, adRate) =>
  api.post(`/promotions/promote/${listingId}`, { adRate });

export default api;
