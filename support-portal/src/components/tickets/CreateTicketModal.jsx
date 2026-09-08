import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Select } from '../ui/Select';
import { createTicket } from '../../api/support';
import toast from 'react-hot-toast';
import { Spinner } from '../ui/Spinner';

const CATEGORIES = ['order', 'payment', 'account', 'return', 'technical', 'seller', 'influencer', 'other'];
const PRIORITIES = ['low', 'normal', 'high', 'urgent', 'critical'];

export default function CreateTicketModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', subject: '', description: '',
    category: 'order', priority: 'normal', order_id: '', source: 'portal',
  });
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.subject || !form.description) {
      toast.error('Fill all required fields'); return;
    }
    setLoading(true);
    try {
      await createTicket(form);
      toast.success('Ticket created');
      onCreated();
      setForm({ name: '', email: '', phone: '', subject: '', description: '', category: 'order', priority: 'normal', order_id: '', source: 'portal' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create ticket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create Ticket"
      size="lg"
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose} disabled={loading}>Cancel</button>
          <button form="create-ticket-form" type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <><Spinner size="sm" /> Creating…</> : 'Create Ticket'}
          </button>
        </>
      }
    >
      <form id="create-ticket-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Customer Name *</label>
            <input className="input" value={form.name} onChange={e => set('name', e.target.value)} required />
          </div>
          <div>
            <label className="label">Email *</label>
            <input type="email" className="input" value={form.email} onChange={e => set('email', e.target.value)} required />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.phone} onChange={e => set('phone', e.target.value)} />
          </div>
          <div>
            <label className="label">Order ID</label>
            <input className="input" value={form.order_id} onChange={e => set('order_id', e.target.value)} placeholder="SRC123ABC" />
          </div>
          <Select
            label="Category"
            value={form.category}
            onChange={v => set('category', v)}
            options={CATEGORIES.map(c => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))}
          />
          <Select
            label="Priority"
            value={form.priority}
            onChange={v => set('priority', v)}
            options={PRIORITIES.map(p => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) }))}
          />
        </div>
        <div>
          <label className="label">Subject *</label>
          <input className="input" value={form.subject} onChange={e => set('subject', e.target.value)} required />
        </div>
        <div>
          <label className="label">Description *</label>
          <textarea
            className="input resize-none"
            rows={4}
            value={form.description}
            onChange={e => set('description', e.target.value)}
            required
          />
        </div>
      </form>
    </Modal>
  );
}
