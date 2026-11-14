import axios from 'axios'

// This PC's own API, or the shop's main PC when this PC is connected to it (shop network, Pro and VIP).
// The headers carry the per-launch key (own API) or the shop's pairing code (main PC).
const target = window.api?.apiTarget || { base: 'http://127.0.0.1:3456/api', headers: {} }

const api = axios.create({
    baseURL: target.base,
    headers: {
        'Content-Type': 'application/json',
        ...target.headers
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
