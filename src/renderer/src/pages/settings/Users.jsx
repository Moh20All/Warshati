import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, UserX, UserCheck } from 'lucide-react'
import api from '../../lib/api'
import { useToast } from '../../components/ui/Toast'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Table from '../../components/ui/Table'
import Badge from '../../components/ui/Badge'
import Modal, { ConfirmModal } from '../../components/ui/Modal'

export default function Users() {
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
            toast.success('User created successfully')
        },
        onError: (err) => {
            toast.error(err.response?.data?.error || 'Failed to create user')
        }
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, ...data }) => api.put(`/users/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] })
            setEditUser(null)
            toast.success('User updated successfully')
        },
        onError: (err) => {
            toast.error(err.response?.data?.error || 'Failed to update user')
        }
    })

    const deactivateMutation = useMutation({
        mutationFn: (id) => api.delete(`/users/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] })
            setDeleteUser(null)
            toast.success('User deactivated')
        },
        onError: (err) => {
            toast.error(err.response?.data?.error || 'Failed to deactivate user')
        }
    })

    const reactivateMutation = useMutation({
        mutationFn: (id) => api.put(`/users/${id}`, { isActive: true }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] })
            toast.success('User reactivated')
        },
        onError: (err) => {
            toast.error(err.response?.data?.error || 'Failed to reactivate user')
        }
    })

    const columns = [
        { key: 'name', label: 'Name', sortable: true },
        { key: 'email', label: 'Email', sortable: true },
        {
            key: 'role',
            label: 'Role',
            render: (val) => (
                <Badge color={val === 'OWNER' ? 'primary' : 'default'}>
                    {val}
                </Badge>
            )
        },
        {
            key: 'isActive',
            label: 'Status',
            render: (val) => (
                <Badge color={val ? 'success' : 'danger'} dot>
                    {val ? 'Active' : 'Inactive'}
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
                        title="Edit"
                    >
                        <Pencil className="h-3.5 w-3.5" />
                    </button>
                    {row.isActive ? (
                        <button
                            onClick={(e) => { e.stopPropagation(); setDeleteUser(row) }}
                            className="p-1.5 rounded-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
                            title="Deactivate"
                        >
                            <UserX className="h-3.5 w-3.5" />
                        </button>
                    ) : (
                        <button
                            onClick={(e) => { e.stopPropagation(); reactivateMutation.mutate(row.id) }}
                            className="p-1.5 rounded-sm text-muted-foreground hover:bg-success/10 hover:text-success transition-colors cursor-pointer"
                            title="Reactivate"
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
                    <h1 className="text-2xl font-bold text-foreground">Users</h1>
                    <p className="text-sm text-muted-foreground mt-1">Manage staff accounts</p>
                </div>
                <Button onClick={() => setShowAddModal(true)}>
                    <Plus className="h-4 w-4" />
                    Add User
                </Button>
            </div>

            {isLoading ? (
                <div className="text-center py-12 text-sm text-muted-foreground">Loading...</div>
            ) : (
                <Table
                    columns={columns}
                    data={data || []}
                    emptyTitle="No users"
                    emptyDescription="Create your first staff account to get started."
                />
            )}

            {/* Add User Modal */}
            <UserFormModal
                open={showAddModal}
                onClose={() => setShowAddModal(false)}
                onSubmit={(data) => createMutation.mutate(data)}
                loading={createMutation.isPending}
                title="Add User"
            />

            {/* Edit User Modal */}
            <UserFormModal
                open={!!editUser}
                onClose={() => setEditUser(null)}
                onSubmit={(data) => updateMutation.mutate({ id: editUser?.id, ...data })}
                loading={updateMutation.isPending}
                title="Edit User"
                defaultValues={editUser}
                isEdit
            />

            {/* Deactivate Confirm */}
            <ConfirmModal
                open={!!deleteUser}
                onClose={() => setDeleteUser(null)}
                onConfirm={() => deactivateMutation.mutate(deleteUser?.id)}
                title="Deactivate User"
                message={`Are you sure you want to deactivate ${deleteUser?.name}? They will no longer be able to log in.`}
                confirmText="Deactivate"
                loading={deactivateMutation.isPending}
            />
        </div>
    )
}

function UserFormModal({ open, onClose, onSubmit, loading, title, defaultValues, isEdit }) {
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
                    <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
                    <Button onClick={handleSubmit} loading={loading}>
                        {isEdit ? 'Save Changes' : 'Create User'}
                    </Button>
                </>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="Name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                />
                <Input
                    label="Email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                />
                <Input
                    label={isEdit ? 'New Password (leave blank to keep)' : 'Password'}
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required={!isEdit}
                />
                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Role</label>
                    <select
                        value={form.role}
                        onChange={(e) => setForm({ ...form, role: e.target.value })}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                    >
                        <option value="STAFF">Staff</option>
                        <option value="OWNER">Owner</option>
                    </select>
                </div>
            </form>
        </Modal>
    )
}
