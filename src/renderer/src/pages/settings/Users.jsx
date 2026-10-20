import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, UserX, UserCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import api from '../../lib/api'
import { useToast } from '../../components/ui/Toast'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Table from '../../components/ui/Table'
import Badge from '../../components/ui/Badge'
import Modal, { ConfirmModal } from '../../components/ui/Modal'

export default function Users() {
    const { t } = useTranslation()
    const queryClient = useQueryClient()
    const toast = useToast()
    const [showAddModal, setShowAddModal] = useState(false)
    const [editUser, setEditUser] = useState(null)
    const [deleteUser, setDeleteUser] = useState(null)

    const { data, isLoading } = useQuery({
        queryKey: ['users'],
        queryFn: () => api.get('/users').then((r) => r.data.users)
    })

    const createMutation = useMutation({
        mutationFn: (userData) => api.post('/users', userData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] })
            setShowAddModal(false)
            toast.success(t('users.success_created'))
        },
        onError: (err) => {
            toast.error(err.response?.data?.error || t('users.err_create'))
        }
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, ...data }) => api.put(`/users/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] })
            setEditUser(null)
            toast.success(t('users.success_updated'))
        },
        onError: (err) => {
            toast.error(err.response?.data?.error || t('users.err_update'))
        }
    })

    const deactivateMutation = useMutation({
        mutationFn: (id) => api.delete(`/users/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] })
            setDeleteUser(null)
            toast.success(t('users.success_deactivated'))
        },
        onError: (err) => {
            toast.error(err.response?.data?.error || t('users.err_deactivate'))
        }
    })

    const reactivateMutation = useMutation({
        mutationFn: (id) => api.put(`/users/${id}`, { isActive: true }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] })
            toast.success(t('users.success_reactivated'))
        },
        onError: (err) => {
            toast.error(err.response?.data?.error || t('users.err_reactivate'))
        }
    })

    const columns = [
        { key: 'name', label: t('users.col_name'), sortable: true },
        { key: 'email', label: t('users.col_email'), sortable: true },
        {
            key: 'role',
            label: t('users.col_role'),
            render: (val) => (
                <Badge color={val === 'OWNER' ? 'primary' : 'default'}>
                    {val === 'OWNER' ? t('users.role_owner') : t('users.role_staff')}
                </Badge>
            )
        },
        {
            key: 'isActive',
            label: t('users.col_status'),
            render: (val) => (
                <Badge color={val ? 'success' : 'danger'} dot>
                    {val ? t('users.active') : t('users.inactive')}
                </Badge>
            )
        },
        {
            key: 'actions',
            label: '',
            className: 'text-right',
            render: (_, row) => (
                <div className="flex items-center justify-end gap-1">
                    <button
                        onClick={(e) => { e.stopPropagation(); setEditUser(row) }}
                        className="p-1.5 rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
                        title={t('users.edit_title')}
                    >
                        <Pencil className="h-3.5 w-3.5" />
                    </button>
                    {row.isActive ? (
                        <button
                            onClick={(e) => { e.stopPropagation(); setDeleteUser(row) }}
                            className="p-1.5 rounded-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
                            title={t('users.btn_deactivate')}
                        >
                            <UserX className="h-3.5 w-3.5" />
                        </button>
                    ) : (
                        <button
                            onClick={(e) => { e.stopPropagation(); reactivateMutation.mutate(row.id) }}
                            className="p-1.5 rounded-sm text-muted-foreground hover:bg-success/10 hover:text-success transition-colors cursor-pointer"
                            title={t('users.success_reactivated')}
                        >
                            <UserCheck className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
            )
        }
    ]

    return (
        <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">{t('users.title')}</h1>
                    <p className="text-sm text-muted-foreground mt-1">{t('users.subtitle')}</p>
                </div>
                <Button onClick={() => setShowAddModal(true)}>
                    <Plus className="h-4 w-4" />
                    {t('users.btn_add')}
                </Button>
            </div>

            {isLoading ? (
                <div className="text-center py-12 text-sm text-muted-foreground">{t('users.loading')}</div>
            ) : (
                <Table
                    columns={columns}
                    data={data || []}
                    emptyTitle={t('users.empty_title')}
                    emptyDescription={t('users.empty_desc')}
                />
            )}

            {/* Add User Modal */}
            <UserFormModal
                open={showAddModal}
                onClose={() => setShowAddModal(false)}
                onSubmit={(data) => createMutation.mutate(data)}
                loading={createMutation.isPending}
                title={t('users.add_title')}
                t={t}
            />

            {/* Edit User Modal */}
            <UserFormModal
                open={!!editUser}
                onClose={() => setEditUser(null)}
                onSubmit={(data) => updateMutation.mutate({ id: editUser?.id, ...data })}
                loading={updateMutation.isPending}
                title={t('users.edit_title')}
                defaultValues={editUser}
                isEdit
                t={t}
            />

            {/* Deactivate Confirm */}
            <ConfirmModal
                open={!!deleteUser}
                onClose={() => setDeleteUser(null)}
                onConfirm={() => deactivateMutation.mutate(deleteUser?.id)}
                title={t('users.modal_deactivate_title')}
                message={t('users.modal_deactivate_msg', { name: deleteUser?.name })}
                confirmText={t('users.btn_deactivate')}
                loading={deactivateMutation.isPending}
            />
        </div>
    )
}

function UserFormModal({ open, onClose, onSubmit, loading, title, defaultValues, isEdit, t }) {
    const [form, setForm] = useState({
        name: defaultValues?.name || '',
        email: defaultValues?.email || '',
        password: '',
        role: defaultValues?.role || 'STAFF'
    })

    // Reset form when modal opens with new values
    useState(() => {
        if (open && defaultValues) {
            setForm({
                name: defaultValues.name || '',
                email: defaultValues.email || '',
                password: '',
                role: defaultValues.role || 'STAFF'
            })
        }
    }, [open, defaultValues])

    const handleSubmit = (e) => {
        e.preventDefault()
        const data = { name: form.name, email: form.email, role: form.role }
        if (form.password) data.password = form.password
        onSubmit(data)
    }

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={title}
            footer={
                <>
                    <Button variant="outline" onClick={onClose} disabled={loading}>{t('users.btn_cancel')}</Button>
                    <Button onClick={handleSubmit} loading={loading}>
                        {isEdit ? t('users.btn_save') : t('users.btn_create')}
                    </Button>
                </>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label={t('users.lbl_name')}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                />
                <Input
                    label={t('users.lbl_email')}
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                />
                <Input
                    label={isEdit ? t('users.lbl_pwd_edit') : t('users.lbl_pwd')}
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required={!isEdit}
                />
                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">{t('users.lbl_role')}</label>
                    <select
                        value={form.role}
                        onChange={(e) => setForm({ ...form, role: e.target.value })}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                    >
                        <option value="STAFF">{t('users.role_staff')}</option>
                        <option value="OWNER">{t('users.role_owner')}</option>
                    </select>
                </div>
            </form>
        </Modal>
    )
}
