import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../lib/auth'
import { Mail, Lock, KeyRound } from 'lucide-react'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import api from '../lib/api'
import markTile from '../assets/brand/mark-trace-tile.svg'

export default function Login() {
    const { t } = useTranslation()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [recovering, setRecovering] = useState(false)
    const [notice, setNotice] = useState('')
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
                    <img src={markTile} alt="" className="h-[52px] w-[52px] mb-3" />
                    <h1 className="text-base font-bold tracking-[.08em] text-foreground">WARSHATI</h1>
                    <p className="text-xl font-bold text-primary font-arabic mt-0">ورشتي</p>
                    <p className="text-sm text-muted-foreground mt-1">{t('auth.slogan')}</p>
                </div>

                {recovering ? <Recover onDone={(found) => {
                    setRecovering(false)
                    if (found) { setEmail(found); setPassword(''); setError(''); setNotice(t('auth.recover_done')) }
                }} /> : (
                /* Login Card */
                <div className="border border-border rounded-md bg-card p-6">
                    <h2 className="text-lg font-semibold text-foreground mb-1">{t('auth.login_title')}</h2>
                    <p className="text-sm text-muted-foreground mb-6">{t('auth.login_subtitle')}</p>

                    {error && (
                        <div className="mb-4 px-3 py-2 text-sm text-destructive-soft-foreground bg-destructive-soft rounded-sm">
                            {error}
                        </div>
                    )}
                    {notice && !error && (
                        <div className="mb-4 px-3 py-2 text-sm text-success-soft-foreground bg-success-soft rounded-sm">
                            {notice}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Input
                            label={t('auth.email')}
                            type="email"
                            placeholder="admin@warshati.app"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            icon={Mail}
                            required
                        />
                        <Input
                            label={t('auth.password')}
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            icon={Lock}
                            required
                        />
                        <Button type="submit" variant="flux" size="lg" className="w-full" loading={loading}>
                            {t('auth.sign_in')}
                        </Button>
                    </form>
                    <button type="button" onClick={() => setRecovering(true)} className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground">
                        {t('auth.forgot')}
                    </button>
                </div>
                )}
            </div>
        </div>
    )
}

// Owner forgot the email or password: the license key shows the email and sets a new password (works offline)
function Recover({ onDone }) {
    const { t } = useTranslation()
    const [key, setKey] = useState('')
    const [email, setEmail] = useState(null)
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const messageFor = (err) => {
        const code = err.response?.data?.error
        if (code === 'wrong_key') return t('auth.recover_wrong_key')
        if (code === 'short_password') return t('auth.recover_short')
        return code || t('common.error', 'Error')
    }

    const submit = async (e) => {
        e.preventDefault()
        setError('')
        if (email && password.length < 6) return setError(t('auth.recover_short'))
        if (email && password !== confirm) return setError(t('auth.recover_mismatch'))
        setLoading(true)
        try {
            const { data } = await api.post('/auth/recover', email ? { key, password } : { key })
            if (email) onDone(data.email)
            else setEmail(data.email)
        } catch (err) {
            setError(messageFor(err))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="border border-border rounded-md bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground mb-1">{t('auth.recover_title')}</h2>
            <p className="text-sm text-muted-foreground mb-6">{email ? t('auth.recover_new_desc') : t('auth.recover_desc')}</p>

            {error && (
                <div className="mb-4 px-3 py-2 text-sm text-destructive-soft-foreground bg-destructive-soft rounded-sm">
                    {error}
                </div>
            )}

            <form onSubmit={submit} className="space-y-4">
                {!email ? (
                    <Input
                        label={t('auth.recover_key')}
                        placeholder={t('activation.ph_key')}
                        dir="ltr"
                        value={key}
                        onChange={(e) => setKey(e.target.value)}
                        icon={KeyRound}
                        className="font-mono"
                        required
                        autoFocus
                    />
                ) : (
                    <>
                        <div className="px-3 py-2 rounded-sm bg-muted text-sm">
                            <span className="text-muted-foreground">{t('auth.recover_your_email')} </span>
                            <span className="font-semibold text-foreground select-all" dir="ltr">{email}</span>
                        </div>
                        <Input label={t('auth.recover_new_password')} type="password" value={password} onChange={(e) => setPassword(e.target.value)} icon={Lock} required autoFocus />
                        <Input label={t('auth.recover_confirm')} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} icon={Lock} required />
                    </>
                )}
                <Button type="submit" variant="flux" size="lg" className="w-full" loading={loading}>
                    {email ? t('auth.recover_save') : t('auth.recover_continue')}
                </Button>
            </form>
            <p className="mt-4 text-xs text-muted-foreground">{t('auth.recover_lost_key')}</p>
            <button type="button" onClick={() => onDone(null)} className="mt-3 w-full text-center text-sm text-muted-foreground hover:text-foreground">
                {t('auth.recover_back')}
            </button>
        </div>
    )
}
