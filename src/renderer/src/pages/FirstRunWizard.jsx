import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Wrench, Store, UserPlus, CheckCircle } from 'lucide-react'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import api from '../lib/api'

export default function FirstRunWizard() {
    const { t } = useTranslation()
    const steps = [t('setup.steps.welcome'), t('setup.steps.store_info'), t('setup.steps.owner_account'), t('setup.steps.done')]
    
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
            setError(t('setup.err_pwd_match'))
            return
        }
        if (form.password.length < 6) {
            setError(t('setup.err_pwd_length'))
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
            setError(err.response?.data?.error || t('setup.err_setup'))
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
                        <div key={i} className="flex items-center gap-2">
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
                            <h1 className="text-xl font-bold text-foreground mb-2">{t('setup.welcome_title')}</h1>
                            <p className="text-sm text-muted-foreground mb-6">
                                {t('setup.welcome_subtitle')}
                            </p>
                            <Button onClick={() => setStep(1)} className="w-full">
                                {t('setup.get_started')}
                            </Button>
                        </div>
                    )}

                    {/* Step 1: Store Info */}
                    {step === 1 && (
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <Store className="h-5 w-5 text-muted-foreground" />
                                <h2 className="text-lg font-semibold">{t('setup.store_title')}</h2>
                            </div>
                            <div className="space-y-4">
                                <Input
                                    label={t('setup.store_name')}
                                    placeholder="My Repair Shop"
                                    value={form.storeName}
                                    onChange={(e) => update('storeName', e.target.value)}
                                    required
                                />
                                <Input
                                    label={t('setup.phone')}
                                    placeholder="+213 555 1234"
                                    value={form.storePhone}
                                    onChange={(e) => update('storePhone', e.target.value)}
                                />
                                <Input
                                    label={t('setup.address')}
                                    placeholder="Algiers"
                                    value={form.storeAddress}
                                    onChange={(e) => update('storeAddress', e.target.value)}
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-foreground">{t('setup.currency')}</label>
                                        <select value={form.currency} onChange={(e) => update('currency', e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                                            <option value="DZD">DZD (Algerian Dinar)</option>
                                            <option value="USD">USD (US Dollar)</option>
                                            <option value="EUR">EUR (Euro)</option>
                                            <option value="SAR">SAR (Saudi Riyal)</option>
                                            <option value="MAD">MAD (Moroccan Dirham)</option>
                                            <option value="TND">TND (Tunisian Dinar)</option>
                                        </select>
                                    </div>
                                    <Input
                                        label={t('setup.warranty')}
                                        type="number"
                                        value={form.warrantyDays}
                                        onChange={(e) => update('warrantyDays', parseInt(e.target.value) || 30)}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2 mt-6">
                                <Button variant="outline" onClick={() => setStep(0)} className="flex-1">
                                    {t('setup.back')}
                                </Button>
                                <Button
                                    onClick={() => setStep(2)}
                                    className="flex-1"
                                    disabled={!form.storeName}
                                >
                                    {t('setup.next')}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Owner Account */}
                    {step === 2 && (
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <UserPlus className="h-5 w-5 text-muted-foreground" />
                                <h2 className="text-lg font-semibold">{t('setup.owner_title')}</h2>
                            </div>

                            {error && (
                                <div className="mb-4 px-3 py-2 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-4">
                                <Input
                                    label={t('setup.your_name')}
                                    placeholder="John Doe"
                                    value={form.userName}
                                    onChange={(e) => update('userName', e.target.value)}
                                    required
                                />
                                <Input
                                    label={t('setup.email')}
                                    type="email"
                                    placeholder="admin@warshati.app"
                                    value={form.email}
                                    onChange={(e) => update('email', e.target.value)}
                                    required
                                />
                                <Input
                                    label={t('setup.password')}
                                    type="password"
                                    placeholder="••••••••"
                                    value={form.password}
                                    onChange={(e) => update('password', e.target.value)}
                                    required
                                />
                                <Input
                                    label={t('setup.confirm_password')}
                                    type="password"
                                    placeholder="••••••••"
                                    value={form.confirmPassword}
                                    onChange={(e) => update('confirmPassword', e.target.value)}
                                    required
                                />
                            </div>
                            <div className="flex gap-2 mt-6">
                                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                                    {t('setup.back')}
                                </Button>
                                <Button
                                    onClick={handleSetup}
                                    className="flex-1"
                                    loading={loading}
                                    disabled={!form.userName || !form.email || !form.password}
                                >
                                    {t('setup.create_account')}
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
                            <h2 className="text-xl font-bold text-foreground mb-2">{t('setup.done_title')}</h2>
                            <p className="text-sm text-muted-foreground mb-6">
                                {t('setup.done_subtitle')}
                            </p>
                            <Button onClick={() => navigate('/login')} className="w-full">
                                {t('setup.go_login')}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
