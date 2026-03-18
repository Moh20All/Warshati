import axios from 'axios'

const api = axios.create({
    baseURL: 'http://localhost:3456/api',
    headers: {
        'Content-Type': 'application/json'
    }
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('rakam_token')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

// Handle 401 responses — redirect to login
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('rakam_token')
            localStorage.removeItem('rakam_user')
            // Only redirect if not already on login/setup
            if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/setup')) {
                window.location.href = '/login'
            }
        }
        return Promise.reject(error)
    }
)

export default api
