import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

class ApiService {
    private api = axios.create({
        baseURL: API_URL,
        headers: {
            'Content-Type': 'application/json',
        },
    });

    constructor() {
        this.setupInterceptors();
    }

    private setupInterceptors() {
        this.api.interceptors.request.use(
            (config) => {
                const token = localStorage.getItem('token');
                if (token && config.headers) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => {
                return Promise.reject(error);
            }
        );

        this.api.interceptors.response.use(
            (response) => response,
            async (error) => {
                if (error && typeof error === 'object' && 'response' in error && error.response?.status === 401) {
                    // Handle token refresh or logout
                    localStorage.removeItem('token');
                    window.location.href = '/login';
                }
                return Promise.reject(error);
            }
        );
    }

    // Health check endpoints
    async getHealth() {
        return this.api.get('/api/health');
    }

    async getVersion() {
        return this.api.get('/api/health/version');
    }

    // Generic request methods
    async get<T>(url: string, config?: any) {
        return this.api.get<T>(url, config);
    }

    async post<T>(url: string, data: unknown, config?: any) {
        return this.api.post<T>(url, data, config);
    }

    async put<T>(url: string, data: unknown, config?: any) {
        return this.api.put<T>(url, data, config);
    }

    async delete<T>(url: string, config?: any) {
        return this.api.delete<T>(url, config);
    }
}

export const apiService = new ApiService(); 