// API Client for Farmers Marketplace
// Base API URL - adjust based on your deployment
const API_BASE_URL = (() => {
    // If running on development server (Live Server), point to Node.js server
    if (window.location.port === '5500' || window.location.port === '5501' || window.location.protocol === 'file:') {
        return 'http://localhost:3001/api';
    }
    // Otherwise use the current origin (for production)
    return window.location.origin + '/api';
})();

// Token management
const TokenManager = {
    get: () => localStorage.getItem('farmersMarketToken'),
    set: (token) => localStorage.setItem('farmersMarketToken', token),
    remove: () => localStorage.removeItem('farmersMarketToken'),
    isValid: () => {
        const token = TokenManager.get();
        if (!token) return false;
        
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.exp * 1000 > Date.now();
        } catch (error) {
            return false;
        }
    }
};

// User management
const UserManager = {
    get: () => {
        const userStr = localStorage.getItem('farmersMarketUser');
        return userStr ? JSON.parse(userStr) : null;
    },
    set: (user) => localStorage.setItem('farmersMarketUser', JSON.stringify(user)),
    remove: () => localStorage.removeItem('farmersMarketUser'),
    isLoggedIn: () => TokenManager.isValid() && UserManager.get() !== null,
    getUserType: () => {
        const user = UserManager.get();
        return user ? user.userType : null;
    }
};

// HTTP Client with error handling
class APIClient {
    static async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const token = TokenManager.get();
        
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` }),
                ...options.headers
            },
            ...options
        };
        
        // Handle FormData (for file uploads)
        if (options.body instanceof FormData) {
            delete config.headers['Content-Type'];
        }
        
        try {
            const response = await fetch(url, config);
            const data = await response.json();
            
            if (!response.ok) {
                throw new APIError(data.message || 'Request failed', response.status, data.errors);
            }
            
            return data;
        } catch (error) {
            if (error instanceof APIError) {
                throw error;
            }
            
            // Handle network errors
            throw new APIError('Network error. Please check your connection.', 0);
        }
    }
    
    static get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        
        return this.request(url, { method: 'GET' });
    }
    
    static post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: data instanceof FormData ? data : JSON.stringify(data)
        });
    }
    
    static patch(endpoint, data) {
        return this.request(endpoint, {
            method: 'PATCH',
            body: data instanceof FormData ? data : JSON.stringify(data)
        });
    }
    
    static delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
}

// Custom API Error class
class APIError extends Error {
    constructor(message, status, errors = []) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.errors = errors;
    }
}

// Authentication API
const AuthAPI = {
    async register(userData) {
        const response = await APIClient.post('/auth/register', userData);
        
        if (response.success && response.data.token) {
            TokenManager.set(response.data.token);
            UserManager.set(response.data.user);
        }
        
        return response;
    },
    
    async login(credentials) {
        const response = await APIClient.post('/auth/login', credentials);
        
        if (response.success && response.data.token) {
            TokenManager.set(response.data.token);
            UserManager.set(response.data.user);
        }
        
        return response;
    },
    
    async logout() {
        try {
            await APIClient.post('/auth/logout');
        } catch (error) {
            console.warn('Logout request failed:', error.message);
        } finally {
            TokenManager.remove();
            UserManager.remove();
        }
    },
    
    async getProfile() {
        const response = await APIClient.get('/auth/profile');
        
        if (response.success) {
            UserManager.set(response.data.user);
        }
        
        return response;
    },
    
    async updateProfile(profileData) {
        const response = await APIClient.patch('/auth/profile', profileData);
        
        if (response.success) {
            UserManager.set(response.data.user);
        }
        
        return response;
    },
    
    async changePassword(passwordData) {
        return await APIClient.patch('/auth/change-password', passwordData);
    },
    
    async forgotPassword(email) {
        return await APIClient.post('/auth/forgot-password', { email });
    },
    
    async resetPassword(token, password) {
        return await APIClient.patch(`/auth/reset-password/${token}`, { password });
    }
};

// Crops API
const CropsAPI = {
    async getCrops(params = {}) {
        return await APIClient.get('/crops', params);
    },
    
    async getCrop(id) {
        return await APIClient.get(`/crops/${id}`);
    },
    
    async createCrop(cropData) {
        return await APIClient.post('/crops', cropData);
    },
    
    async updateCrop(id, cropData) {
        return await APIClient.patch(`/crops/${id}`, cropData);
    },
    
    async deleteCrop(id) {
        return await APIClient.delete(`/crops/${id}`);
    },
    
    async getFarmerCrops() {
        return await APIClient.get('/crops/farmer/my-crops');
    },
    
    async searchCrops(searchTerm, filters = {}) {
        const params = { search: searchTerm, ...filters };
        return await APIClient.get('/crops/search', params);
    },
    
    async getCropCategories() {
        return await APIClient.get('/crops/categories');
    },
    
    async toggleCropStatus(id) {
        return await APIClient.patch(`/crops/${id}/toggle-status`);
    }
};

// Admin API
const AdminAPI = {
    async getDashboardStats() {
        return await APIClient.get('/admin/dashboard/stats');
    },
    
    async getUsers(params = {}) {
        return await APIClient.get('/admin/users', params);
    },
    
    async getUserDetails(id) {
        return await APIClient.get(`/admin/users/${id}`);
    },
    
    async updateUserStatus(id, status) {
        return await APIClient.patch(`/admin/users/${id}/status`, { status });
    },
    
    async deleteUser(id) {
        return await APIClient.delete(`/admin/users/${id}`);
    },
    
    async getCropsForModeration(params = {}) {
        return await APIClient.get('/admin/crops/moderation', params);
    },
    
    async moderateCrop(id, action, notes = '') {
        return await APIClient.patch(`/admin/crops/${id}/moderate`, { action, notes });
    },
    
    async getSystemLogs(params = {}) {
        return await APIClient.get('/admin/logs', params);
    },
    
    async getReport(type, params = {}) {
        return await APIClient.get(`/admin/reports/${type}`, params);
    }
};

// Utility functions
const APIUtils = {
    formatError(error) {
        if (error instanceof APIError) {
            if (error.errors && error.errors.length > 0) {
                return error.errors.map(err => err.msg || err.message).join(', ');
            }
            return error.message;
        }
        return 'An unexpected error occurred';
    },
    
    showErrorMessage(error, containerId = 'errorContainer') {
        const container = document.getElementById(containerId);
        const errorMessage = this.formatError(error);
        
        if (container) {
            container.innerHTML = `
                <div class="alert alert-error">
                    <span class="alert-icon">⚠️</span>
                    <span class="alert-message">${errorMessage}</span>
                </div>
            `;
            container.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            alert(errorMessage);
        }
    },
    
    showSuccessMessage(message, containerId = 'messageContainer') {
        const container = document.getElementById(containerId);
        
        if (container) {
            container.innerHTML = `
                <div class="alert alert-success">
                    <span class="alert-icon">✅</span>
                    <span class="alert-message">${message}</span>
                </div>
            `;
            container.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            alert(message);
        }
    },
    
    clearMessages(containerId = 'messageContainer') {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = '';
        }
    },
    
    isAuthenticated() {
        return UserManager.isLoggedIn();
    },
    
    requireAuth(redirectUrl = '/') {
        if (!this.isAuthenticated()) {
            window.location.href = redirectUrl;
            return false;
        }
        return true;
    },
    
    checkUserType(requiredType) {
        const userType = UserManager.getUserType();
        return userType === requiredType;
    },
    
    redirectBasedOnUserType() {
        if (!this.isAuthenticated()) {
            return;
        }
        
        const userType = UserManager.getUserType();
        const currentPath = window.location.pathname;
        
        // Redirect users to their appropriate portals
        if (userType === 'farmer' && !currentPath.includes('farmer-portal')) {
            window.location.href = '/public/farmer-portal.html';
        } else if (userType === 'buyer' && !currentPath.includes('buyer-portal')) {
            window.location.href = '/public/buyer-portal.html';
        } else if (userType === 'admin' && !currentPath.includes('admin')) {
            window.location.href = '/public/admin-panel.html';
        }
    },
    
    formatDate(dateString) {
        const options = { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return new Date(dateString).toLocaleDateString('en-US', options);
    },
    
    formatCurrency(amount, currency = 'ZMW') {
        return new Intl.NumberFormat('en-ZM', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2
        }).format(amount);
    },
    
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};

// Loading state management
const LoadingManager = {
    show(element, text = 'Loading...') {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        
        if (element) {
            element.innerHTML = `
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <span>${text}</span>
                </div>
            `;
        }
    },
    
    hide(element) {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        
        if (element) {
            const spinner = element.querySelector('.loading-spinner');
            if (spinner) {
                spinner.remove();
            }
        }
    },
    
    showButton(button, text = 'Loading...') {
        if (typeof button === 'string') {
            button = document.getElementById(button);
        }
        
        if (button) {
            button.disabled = true;
            button.dataset.originalText = button.textContent;
            button.innerHTML = `<span class="spinner-small"></span> ${text}`;
        }
    },
    
    hideButton(button) {
        if (typeof button === 'string') {
            button = document.getElementById(button);
        }
        
        if (button) {
            button.disabled = false;
            button.textContent = button.dataset.originalText || 'Submit';
            delete button.dataset.originalText;
        }
    }
};

// Export for use in other files
if (typeof window !== 'undefined') {
    window.APIClient = APIClient;
    window.AuthAPI = AuthAPI;
    window.CropsAPI = CropsAPI;
    window.AdminAPI = AdminAPI;
    window.APIUtils = APIUtils;
    window.UserManager = UserManager;
    window.TokenManager = TokenManager;
    window.LoadingManager = LoadingManager;
    window.APIError = APIError;
}