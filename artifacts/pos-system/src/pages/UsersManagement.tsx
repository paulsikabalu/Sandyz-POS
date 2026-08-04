import { useState, useEffect, useCallback } from 'react';
import { Topbar } from '../components/Topbar';
import { usersApi, type AuthUser } from '../api/client';
import { useToast } from '@/hooks/use-toast';
import {
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
  X,
  Users,
  Shield,
  ShieldCheck,
  UserCog,
  Search,
} from 'lucide-react';

type UserFormData = {
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'cashier' | 'manager';
};

const ROLE_ICONS: Record<string, React.ReactNode> = {
  admin: <ShieldCheck size={14} className="text-red-500" />,
  manager: <UserCog size={14} className="text-blue-500" />,
  cashier: <Shield size={14} className="text-green-500" />,
};

function UserFormDialog({
  initial,
  onClose,
  onSave,
}: {
  initial?: Partial<AuthUser>;
  onClose: () => void;
  onSave: (data: UserFormData) => Promise<void>;
}) {
  const [form, setForm] = useState<UserFormData>({
    email: initial?.email ?? '',
    password: '',
    name: initial?.name ?? '',
    role: (initial?.role as 'admin' | 'cashier' | 'manager') ?? 'cashier',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.email || !form.name) return;
    if (!initial && !form.password) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-base">{initial?.name ? 'Edit User' : 'New User'}</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
            <X size={14} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">Full Name *</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full h-9 border border-border rounded-xl px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full h-9 border border-border rounded-xl px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="user@example.com"
            />
          </div>

          {!initial && (
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">Password *</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full h-9 border border-border rounded-xl px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Min 6 characters"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">Role</label>
            <select
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value as 'admin' | 'cashier' | 'manager' }))}
              className="w-full h-9 border border-border rounded-xl px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary bg-card"
            >
              <option value="cashier">Cashier</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 h-9 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-muted/50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!form.email || !form.name || (!initial && !form.password) || saving}
            className="flex-1 h-9 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? 'Saving…' : initial?.name ? 'Save Changes' : 'Add User'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UsersManagement() {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editUser, setEditUser] = useState<AuthUser | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setUsers(await usersApi.list());
    } catch {
      toast({ title: 'Error', description: 'Failed to load users', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (data: UserFormData) => {
    try {
      await usersApi.create(data);
      await load();
      setShowAddForm(false);
      toast({ title: 'User Created', description: `${data.name} added successfully` });
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message ?? 'Failed to create user', variant: 'destructive' });
    }
  };

  const handleEdit = async (data: UserFormData) => {
    if (!editUser) return;
    try {
      const payload: any = { email: data.email, name: data.name, role: data.role };
      if (data.password) {
        payload.currentPassword = data.password;
        payload.newPassword = data.password;
      }
      await usersApi.update(editUser.id, payload);
      await load();
      setEditUser(null);
      toast({ title: 'User Updated', description: 'Changes saved' });
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message ?? 'Failed to update user', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await usersApi.delete(id);
      await load();
      setConfirmDelete(null);
      toast({ title: 'User Deleted', description: 'User removed successfully' });
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message ?? 'Failed to delete user', variant: 'destructive' });
    }
  };

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const getRoleBadge = (role: string) => {
    const styles: Record<string, string> = {
      admin: 'bg-red-100 text-red-700',
      manager: 'bg-blue-100 text-blue-700',
      cashier: 'bg-green-100 text-green-700',
    };
    return styles[role] ?? 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="h-[100dvh] w-full bg-background flex flex-col overflow-hidden text-foreground">
      <Topbar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 px-6 pt-5 pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-foreground">User Management</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Manage staff accounts and roles</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={load} className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:bg-muted/50">
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-1.5 h-8 px-3 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:opacity-90"
              >
                <Plus size={13} /> Add User
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative mt-4">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search users by name or email…"
              className="w-72 h-8 bg-card border border-border rounded-full pl-8 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Users List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground gap-2">
              <RefreshCw size={20} className="animate-spin opacity-40" />
              <span className="text-sm">Loading users…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
              <Users size={32} className="opacity-20" />
              <p className="text-sm">No users found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(user => (
                <div key={user.id} className="flex items-center justify-between p-3 border border-border rounded-xl hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{user.name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${getRoleBadge(user.role)}`}>
                          {user.role}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{user.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditUser(user)}
                      className="w-7 h-7 rounded-lg border border-border text-muted-foreground flex items-center justify-center hover:bg-muted/50"
                    >
                      <Pencil size={11} />
                    </button>
                    {confirmDelete === user.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleDelete(user.id)} className="h-7 px-2 rounded-lg bg-destructive text-white text-[10px] font-bold">Yes</button>
                        <button onClick={() => setConfirmDelete(null)} className="h-7 px-2 rounded-lg border border-border text-[10px]">No</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(user.id)}
                        className="w-7 h-7 rounded-lg border border-border text-muted-foreground flex items-center justify-center hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      {showAddForm && (
        <UserFormDialog onClose={() => setShowAddForm(false)} onSave={handleCreate} />
      )}
      {editUser && (
        <UserFormDialog
          initial={editUser}
          onClose={() => setEditUser(null)}
          onSave={handleEdit}
        />
      )}
    </div>
  );
}

