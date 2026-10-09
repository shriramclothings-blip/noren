import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate } from '../utils/helpers';
import { Plus, Trash2 } from 'lucide-react';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';

const CATEGORIES = ['Rent', 'Salary', 'Utilities', 'Transport', 'Marketing', 'Maintenance', 'Other'];

export default function Expenses() {
  const { expenses, addExpense, deleteExpense, company } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', amount: '', category: 'Other', date: new Date().toISOString().split('T')[0], notes: '' });

  const handleSave = async () => {
    if (!form.title || !form.amount) return toast.error('Title and amount required');
    await addExpense({ ...form, amount: parseFloat(form.amount) });
    toast.success('Expense added!');
    setShowModal(false);
    setForm({ title: '', amount: '', category: 'Other', date: new Date().toISOString().split('T')[0], notes: '' });
  };

  const total = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const byCategory = CATEGORIES.map(c => ({ cat: c, total: expenses.filter(e => e.category === c).reduce((s, e) => s + (e.amount || 0), 0) })).filter(c => c.total > 0);

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Expenses</h1>
        <button onClick={() => setShowModal(true)} className="btn-primary"><Plus size={16} /> Add Expense</button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4"><p className="text-xl font-bold text-red-500">{formatCurrency(total, company.currency)}</p><p className="text-xs text-gray-400">Total Expenses</p></div>
        <div className="card p-4"><p className="text-xl font-bold text-primary-600">{expenses.length}</p><p className="text-xs text-gray-400">Total Entries</p></div>
      </div>

      {byCategory.length > 0 && (
        <div className="card p-4">
          <h3 className="font-semibold mb-3 text-sm">By Category</h3>
          <div className="flex flex-wrap gap-2">
            {byCategory.map(c => (
              <div key={c.cat} className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm">
                <span className="text-gray-500">{c.cat}: </span>
                <span className="font-semibold text-red-500">{formatCurrency(c.total, company.currency)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>{['Title','Category','Date','Amount','Notes','Action'].map(h => <th key={h} className="table-head">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {expenses.length === 0 && <tr><td colSpan={6} className="table-cell text-center text-gray-400 py-12">No expenses recorded</td></tr>}
              {[...expenses].sort((a, b) => new Date(b.date) - new Date(a.date)).map(e => (
                <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                  <td className="table-cell font-medium">{e.title}</td>
                  <td className="table-cell"><span className="badge-blue">{e.category}</span></td>
                  <td className="table-cell">{formatDate(e.date)}</td>
                  <td className="table-cell font-semibold text-red-500">{formatCurrency(e.amount, company.currency)}</td>
                  <td className="table-cell text-xs text-gray-400">{e.notes || '-'}</td>
                  <td className="table-cell">
                    <button onClick={() => { if (window.confirm('Delete expense?')) deleteExpense(e.id); }} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-500"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Expense" size="sm">
        <div className="space-y-4">
          <div><label className="label">Title *</label><input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
          <div><label className="label">Amount *</label><input className="input" type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
          <div><label className="label">Category</label>
            <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div><label className="label">Date</label><input className="input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
          <div><label className="label">Notes</label><textarea className="input resize-none" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={handleSave} className="btn-primary flex-1 justify-center">Save Expense</button>
          <button onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
        </div>
      </Modal>
    </div>
  );
}
