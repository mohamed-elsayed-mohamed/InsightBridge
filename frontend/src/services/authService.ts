import { apiService } from './api';

interface LoginRequest {
    email: string;
    password: string;
}

interface RegisterRequest {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
}

interface ForgotPasswordRequest {
    email: string;
}

interface ResetPasswordRequest {
    token: string;
    email: string;
    newPassword: string;
}

interface TokenResponse {
    accessToken: string;
    refreshToken: string;
    expiresAt: string;
}

interface UserResponse {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    roles: string[];
}

class AuthService {
    private readonly TOKEN_KEY = 'token';
    private readonly REFRESH_TOKEN_KEY = 'refreshToken';

    async login(request: LoginRequest): Promise<void> {
        const response = await apiService.post<TokenResponse>('/api/auth/login', request);
        this.setTokens(response.data);
    }

    async register(request: RegisterRequest): Promise<void> {
        const response = await apiService.post<TokenResponse>('/api/auth/register', request);
        this.setTokens(response.data);
    }

    async forgotPassword(request: ForgotPasswordRequest): Promise<void> {
        await apiService.post('/api/auth/forgot-password', request);
    }

    async resetPassword(request: ResetPasswordRequest): Promise<void> {
        await apiService.post('/api/auth/reset-password', request);
    }

    async refreshToken(): Promise<void> {
        const refreshToken = this.getRefreshToken();
        if (!refreshToken) {
            throw new Error('No refresh token available');
        }

        const response = await apiService.post<TokenResponse>('/api/auth/refresh-token', refreshToken);
        this.setTokens(response.data);
    }

    async getAllUsers(): Promise<UserResponse[]> {
        const response = await apiService.get<UserResponse[]>('/api/auth/users');
        return response.data;
    }

    async updateUserRoles(userId: string, roles: string[]): Promise<void> {
        await apiService.put(`/api/auth/users/${userId}/roles`, roles);
    }

    logout(): void {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.REFRESH_TOKEN_KEY);
        window.location.href = '/login';
    }

    getToken(): string | null {
        return localStorage.getItem(this.TOKEN_KEY);
    }

    private getRefreshToken(): string | null {
        return localStorage.getItem(this.REFRESH_TOKEN_KEY);
    }

    private setTokens(tokens: TokenResponse): void {
        localStorage.setItem(this.TOKEN_KEY, tokens.accessToken);
        localStorage.setItem(this.REFRESH_TOKEN_KEY, tokens.refreshToken);
    }

    isAuthenticated(): boolean {
        return !!this.getToken();
    }

    hasRole(role: string): boolean {
        const token = this.getToken();
        if (!token) return false;

        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.role === role;
        } catch {
            return false;
        }
    }
}

export const authService = new AuthService(); 