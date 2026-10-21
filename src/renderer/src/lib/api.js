import axios from 'axios'

const api = axios.create({
    baseURL: 'http://127.0.0.1:3456/api',
    headers: {
        'Content-Type': 'application/json',
        // Per-launch key handed over by the preload; the local API refuses requests without it
        'X-Warshati-Key': window.api?.apiKey || ''
    }
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('warshati_token')
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
            localStorage.removeItem('warshati_token')
            localStorage.removeItem('warshati_user')
            // Only redirect if not already on login/setup (app uses HashRouter, so routes live in the hash)
            if (!window.location.hash.includes('/login') && !window.location.hash.includes('/setup')) {
                window.location.hash = '#/login'
            }
        }
        return Promise.reject(error)
    }
)

export default api
