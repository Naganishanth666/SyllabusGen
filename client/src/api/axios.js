import axios from 'axios';

// Safely construct the API base URL without duplicating /api or slashes
let baseValue = import.meta.env.VITE_API_URL || '';
// Strip trailing slashes
baseValue = baseValue.replace(/\/+$/, '');
// Strip /api if the user accidentally included it in their Vercel environment variable
if (baseValue.endsWith('/api')) {
    baseValue = baseValue.slice(0, -4);
}
const apiUrl = baseValue ? `${baseValue}/api` : '/api';

const api = axios.create({
    baseURL: apiUrl,
    headers: {
        'Content-Type': 'application/json'
    },
});

// Add a request interceptor to add the auth token to headers
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['x-auth-token'] = token;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Add a response interceptor to handle 401 errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            // Redirect to login
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
