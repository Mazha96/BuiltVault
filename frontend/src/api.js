import axios from 'axios';

// Use same origin so nginx handles routing correctly (no hardcoded port)
const API_BASE =
  import.meta.env.VITE_API_BASE ||
  window.location.origin;

const api = axios.create({
  baseURL: `${API_BASE.replace(/\/$/, '')}/api`
});

// Token getter — replaced at runtime by ClerkTokenProvider
let _getToken = async () => null;
export function setTokenGetter(fn) { _getToken = fn; }

api.interceptors.request.use(async cfg => {
  try {
    const token = await _getToken();
    if (token) cfg.headers.Authorization = `Bearer ${token}`;
  } catch (e) {
    console.warn('Could not get token', e);
  }
  return cfg;
});

export default api;

// Posts
export const getFeed = () => api.get('/posts/feed');
export const getComments = (postId) => api.get(`/posts/${postId}/comments`);
export const addComment = (postId, comment) => api.post(`/posts/${postId}/comments`, { comment });
export const deleteComment = (postId, commentId) => api.delete(`/posts/${postId}/comments/${commentId}`);

// Points
export const getMyPoints = () => api.get('/points/me');
export const givePoints = (projectId, amount) => api.post(`/points/${projectId}`, { amount });
export const getLeaderboard = (period = 'week') => api.get(`/points/leaderboard?period=${period}`);
