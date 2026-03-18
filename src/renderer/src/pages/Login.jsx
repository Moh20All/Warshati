import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { Wrench, Mail, Lock } from 'lucide-react'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const { login } = useAuth()
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            await login(email, password)
            navigate('/dashboard')
        } catch (err) {
            setError(err.response?.data?.error || 'Invalid credentials')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <div className="w-full max-w-sm animate-fade-in">
                {/* Logo */}
                <div className="flex flex-col items-center mb-8">
                    <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-primary text-primary-foreground mb-3">
                        <Wrench className="h-6 w-6" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground">RAKAM</h1>
                    <p className="text-sm font-semibold text-accent mt-0">رقم</p>
                    <p className="text-sm text-muted-foreground mt-1">Know your numbers. Own your day.</p>
                </div>

                {/* Login Card */}
                <div className="border border-border rounded-lg bg-card p-6">
                    <h2 className="text-lg font-semibold text-foreground mb-1">Welcome back</h2>
                    <p className="text-sm text-muted-foreground mb-6">Sign in to your account</p>

                    {error && (
                        <div className="mb-4 px-3 py-2 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Input
                            label="Email"
                            type="email"
                            placeholder="admin@rakam.app"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            icon={Mail}
                            required
                        />
                        <Input
                            label="Password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            icon={Lock}
                            required
                        />
                        <Button type="submit" className="w-full" loading={loading}>
                            Sign In
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    )
}
