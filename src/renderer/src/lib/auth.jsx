import { createContext, useContext, useState, useEffect } from 'react'
import api from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [token, setToken] = useState(localStorage.getItem('warshati_token'))
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (token) {
            // Verify token is still valid
            api.get('/auth/me')
                .then(res => {
                    setUser(res.data.user)
                })
                .catch(() => {
                    // Token invalid, clear everything
                    localStorage.removeItem('warshati_token')
                    localStorage.removeItem('warshati_user')
                    setToken(null)
                    setUser(null)
                })
                .finally(() => setLoading(false))
        } else {
            setLoading(false)
        }
    }, [token])

    const login = async (email, password) => {
        const res = await api.post('/auth/login', { email, password })
        const { token: newToken, user: userData } = res.data
        localStorage.setItem('warshati_token', newToken)
        localStorage.setItem('warshati_user', JSON.stringify(userData))
        setToken(newToken)
        setUser(userData)
        return userData
    }

    const logout = () => {
        localStorage.removeItem('warshati_token')
        localStorage.removeItem('warshati_user')
        setToken(null)
        setUser(null)
    }

    const value = {
        user,
        token,
        loading,
        login,
        logout,
        isAuthenticated: !!token && !!user,
        isOwner: user?.role === 'OWNER'
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
