const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:5000/api';

export class ApiError extends Error {
    constructor(public status: number, message: string) {
        super(message);
        this.name = 'ApiError';
    }
}

async function handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new ApiError(response.status, error.error || response.statusText);
    }
    return response.json();
}

export const api = {
    get: async <T>(endpoint: string, params?: Record<string, any>): Promise<T> => {
        const url = new URL(`${API_URL}${endpoint}`);
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined) {
                    if (typeof value === 'object') {
                        url.searchParams.append(key, JSON.stringify(value));
                    } else {
                        url.searchParams.append(key, String(value));
                    }
                }
            });
        }
        const response = await fetch(url.toString());
        return handleResponse<T>(response);
    },

    post: async <T>(endpoint: string, data: any): Promise<T> => {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return handleResponse<T>(response);
    },

    put: async <T>(endpoint: string, data: any): Promise<T> => {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return handleResponse<T>(response);
    },

    delete: async <T>(endpoint: string): Promise<T> => {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'DELETE',
        });
        return handleResponse<T>(response);
    },
};
