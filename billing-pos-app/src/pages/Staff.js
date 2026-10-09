import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, Edit2, Trash2, Shield, Eye, EyeOff } from 'lucide-react';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';

const EMPTY = { name: '', username: '', password: '', role: 'staff', pin: '', active: true };

export default function Staff() {
  const { staff, addStaff, updateStaff, deleteStaff, currentUser } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [showPass, setShowPass] = useState(false);

  if (currentUser?.role !== 'admin') {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-center text-gray-400">
          <Shield size={48} className="mx-auto mb-3 opacity-30" />
          <p>Admin access required</p>
        </div>
      </div>
    );
  }

  const openAdd = () => { setForm(EMPTY); setEditItem(null); setShowModal(true); };
  const openEdit = (s) => { setForm({ ...s }); setEditItem(s); setShowModal(true); };

  const handleSave = async () => {
    if (!form.name || !form.username || !form.password) return toast.error('Name, username & password required');
    if (form.pin && form.pin.length !== 4) return toast.error('PIN must be 4 digits');
    if (editItem) { await updateStaff({ ...form, id: editItem.id }); toast.success('Staff updated!'); }
    else { await addStaff(form); toast.success('Staff added!'); }
    setShowModal(false);
  };

  const ROLE_COLORS = { admin: 'badge-red', staff: 'badge-blue', cashier: 'badge-green' };

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Staff Management</h1>
        <button onClick={openAdd} className="btn-primary"><Plus size={16} /> Add Staff</button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {staff.map(s => (
          <div key={s.id} className="card p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center text-white text-xl font-bold">
                {s.name?.[0]?.toUpperCase()}
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(s)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500"><Edit2 size={14} /></button>
                {s.id !== currentUser?.id && (
                  <button onClick={() => { if (window.confirm('Delete staff?')) deleteStaff(s.id); }} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-500"><Trash2 size={14} /></button>
                )}
              </div>
            </div>
            <h3 className="font-semibold">{s.name}</h3>
            <p className="text-sm text-gray-400">@{s.username}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={ROLE_COLORS[s.role] || 'badge-blue'}>{s.role}</span>
              <span className={s.active ? 'badge-green' : 'badge-red'}>{s.active ? 'Active' : 'Inactive'}</span>
            </div>
          </div>
        ))}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editItem ? 'Edit Staff' : 'Add Staff'} size="sm">
        <div className="space-y-4">
          {[
            { label: 'Full Name *', key: 'name', type: 'text' },
            { label: 'Username *', key: 'username', type: 'text' },
          ].map(f => (
            <div key={f.key}>
              <label className="label">{f.label}</label>
              <input className="input" type={f.type} value={form[f.key] || ''} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
            </div>
          ))}
          <div>
            <label className="label">Password *</label>
            <div className="relative">
              <input className="input pr-10" type={showPass ? 'text' : 'password'} value={form.password || ''} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
              <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className="label">4-Digit PIN (for lock screen)</label>
            <input className="input" type="password" maxLength={4} value={form.pin || ''} onChange={e => setForm(p => ({ ...p, pin: e.target.value }))} placeholder="••••" />
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
              <option value="admin">Admin</option>
              <option value="staff">Staff</option>
              <option value="cashier">Cashier</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="active" checked={form.active} onChange={e => setForm(p => ({ ...p, active: e.target.checked }))} className="rounded" />
            <label htmlFor="active" className="text-sm text-gray-700 dark:text-gray-300">Active</label>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={handleSave} className="btn-primary flex-1 justify-center">Save Staff</button>
          <button onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
        </div>
      </Modal>
    </div>
  );
}
