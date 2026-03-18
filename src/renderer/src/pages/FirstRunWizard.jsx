import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Wrench, Store, UserPlus, CheckCircle } from 'lucide-react'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import api from '../lib/api'

const steps = ['Welcome', 'Store Info', 'Owner Account', 'Done']

export default function FirstRunWizard() {
    const [step, setStep] = useState(0)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const navigate = useNavigate()

    const [form, setForm] = useState({
        storeName: '',
        storePhone: '',
        storeAddress: '',
        currency: 'DZD',
        warrantyDays: 30,
        userName: '',
        email: '',
        password: '',
        confirmPassword: ''
    })

    const update = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }))
    }

    const handleSetup = async () => {
        if (form.password !== form.confirmPassword) {
            setError('Passwords do not match')
            return
        }
        if (form.password.length < 6) {
            setError('Password must be at least 6 characters')
            return
        }

        setError('')
        setLoading(true)
        try {
            await api.post('/auth/setup', {
                storeName: form.storeName,
                storePhone: form.storePhone,
                storeAddress: form.storeAddress,
                currency: form.currency,
                warrantyDays: form.warrantyDays,
                userName: form.userName,
                email: form.email,
                password: form.password
            })
            setStep(3) // Done
        } catch (err) {
            setError(err.response?.data?.error || 'Setup failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <div className="w-full max-w-lg animate-fade-in">
                {/* Step indicators */}
                <div className="flex items-center justify-center gap-2 mb-8">
                    {steps.map((s, i) => (
                        <div key={s} className="flex items-center gap-2">
                            <div className={`
                flex items-center justify-center h-7 w-7 rounded-full text-xs font-medium
                ${i <= step
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground'
                                }
              `}>
                                {i < step ? '✓' : i + 1}
                            </div>
                            {i < steps.length - 1 && (
                                <div className={`w-8 h-px ${i < step ? 'bg-primary' : 'bg-border'}`} />
                            )}
                        </div>
                    ))}
                </div>

                <div className="border border-border rounded-lg bg-card p-6">
                    {/* Step 0: Welcome */}
                    {step === 0 && (
                        <div className="text-center">
                            <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-primary text-primary-foreground mx-auto mb-4">
                                <Wrench className="h-6 w-6" />
                            </div>
                            <h1 className="text-xl font-bold text-foreground mb-2">Welcome to Rakam</h1>
                            <p className="text-sm text-muted-foreground mb-6">
                                Let's set up your phone repair shop in just a few steps.
                            </p>
                            <Button onClick={() => setStep(1)} className="w-full">
                                Get Started
                            </Button>
                        </div>
                    )}

                    {/* Step 1: Store Info */}
                    {step === 1 && (
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <Store className="h-5 w-5 text-muted-foreground" />
                                <h2 className="text-lg font-semibold">Store Information</h2>
                            </div>
                            <div className="space-y-4">
                                <Input
                                    label="Store Name"
                                    placeholder="My Repair Shop"
                                    value={form.storeName}
                                    onChange={(e) => update('storeName', e.target.value)}
                                    required
                                />
                                <Input
                                    label="Phone Number"
                                    placeholder="+213 555 1234"
                                    value={form.storePhone}
                                    onChange={(e) => update('storePhone', e.target.value)}
                                />
                                <Input
                                    label="Address"
                                    placeholder="123 Main Street, Algiers"
                                    value={form.storeAddress}
                                    onChange={(e) => update('storeAddress', e.target.value)}
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        label="Currency"
                                        value={form.currency}
                                        onChange={(e) => update('currency', e.target.value)}
                                    />
                                    <Input
                                        label="Default Warranty (days)"
                                        type="number"
                                        value={form.warrantyDays}
                                        onChange={(e) => update('warrantyDays', parseInt(e.target.value) || 30)}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2 mt-6">
                                <Button variant="outline" onClick={() => setStep(0)} className="flex-1">
                                    Back
                                </Button>
                                <Button
                                    onClick={() => setStep(2)}
                                    className="flex-1"
                                    disabled={!form.storeName}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Owner Account */}
                    {step === 2 && (
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <UserPlus className="h-5 w-5 text-muted-foreground" />
                                <h2 className="text-lg font-semibold">Create Owner Account</h2>
                            </div>

                            {error && (
                                <div className="mb-4 px-3 py-2 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-4">
                                <Input
                                    label="Your Name"
                                    placeholder="John Doe"
                                    value={form.userName}
                                    onChange={(e) => update('userName', e.target.value)}
                                    required
                                />
                                <Input
                                    label="Email"
                                    type="email"
                                    placeholder="admin@rakam.app"
                                    value={form.email}
                                    onChange={(e) => update('email', e.target.value)}
                                    required
                                />
                                <Input
                                    label="Password"
                                    type="password"
                                    placeholder="Min 6 characters"
                                    value={form.password}
                                    onChange={(e) => update('password', e.target.value)}
                                    required
                                />
                                <Input
                                    label="Confirm Password"
                                    type="password"
                                    placeholder="Re-enter password"
                                    value={form.confirmPassword}
                                    onChange={(e) => update('confirmPassword', e.target.value)}
                                    required
                                />
                            </div>
                            <div className="flex gap-2 mt-6">
                                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                                    Back
                                </Button>
                                <Button
                                    onClick={handleSetup}
                                    className="flex-1"
                                    loading={loading}
                                    disabled={!form.userName || !form.email || !form.password}
                                >
                                    Create Account
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Done */}
                    {step === 3 && (
                        <div className="text-center">
                            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-success/15 text-success mx-auto mb-4">
                                <CheckCircle className="h-6 w-6" />
                            </div>
                            <h2 className="text-xl font-bold text-foreground mb-2">All Set!</h2>
                            <p className="text-sm text-muted-foreground mb-6">
                                Your store has been set up. You can now sign in with your account.
                            </p>
                            <Button onClick={() => navigate('/login')} className="w-full">
                                Go to Login
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
