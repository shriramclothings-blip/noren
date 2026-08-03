import { useState, useEffect, useCallback } from 'react';
import { Plus, Check, X, RefreshCw, ArrowRightLeft, Clock } from 'lucide-react';
import api from '../../../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';

const inp = {
  width: '100%', padding: '8px 10px', fontSize: 13,
  border: '1.5px solid #e5e7eb', borderRadius: 8, outline: 'none',
  fontFamily: 'inherit', color: '#111827', background: '#fff', boxSizing: 'border-box',
};
const lbl = { fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 };

const STATUS_COLORS = {
  pending_approval: { bg: '#fef9c3', color: '#854d0e' },
  completed:        { bg: '#dcfce7', color: '#166534' },
  rejected:         { bg: '#fee2e2', color: '#991b1b' },
};

const BLANK_FORM = { inventory_item_id: '', from_warehouse_id: '', to_warehouse_id: '', quantity: '', notes: '' };

export default function AdminTransferRequests({ warehouses = [] }) {
  const { user } = useAuth();
  const canApprove = ['super_admin', 'admin', 'business_owner', 'store_admin', 'warehouse_manager'].includes(user?.role)
    || (user?.permissions || []).includes('erp.approve_transfers');

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending_approval');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState([]);
  const [itemSearch, setItemSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (statusFilter) p.set('status', statusFilter);
      const res = await api.get(`/erp/warehouse/transfer-requests?${p}`);
      setRequests(res.data.transfer_requests || []);
    } catch { toast.error('Failed to load transfer requests'); }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const searchItems = async (q) => {
    if (!q || q.length < 2) { setSearchResults([]); return; }
    try {
      const res = await api.get(`/erp/inventory/items?search=${encodeURIComponent(q)}&limit=10`);
      setSearchResults(res.data.items || []);
    } catch {}
  };

  const handleCreate = async () => {
    if (!form.inventory_item_id || !form.from_warehouse_id || !form.to_warehouse_id || !form.quantity) {
      return toast.error('All fields are required');
    }
    setSaving(true);
    try {
      const res = await api.post('/erp/warehouse/transfer-requests', { ...form, quantity: Number(form.quantity) });
      setRequests(prev => [res.data.transfer_request, ...prev]);
      setShowForm(false); setForm(BLANK_FORM); setItemSearch(''); setSearchResults([]);
      toast.success('Transfer request submitted');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to submit'); }
    finally { setSaving(false); }
  };

  const handleApprove = async (id) => {
    try {
      const res = await api.post(`/erp/warehouse/transfer-requests/${id}/approve`);
      setRequests(prev => prev.map(r => r.id === id ? res.data.transfer_request : r));
      toast.success('Transfer approved and stock moved');
    } catch (err) { toast.error(err.response?.data?.message || 'Approval failed'); }
  };

  const handleReject = async () => {
    if (!rejectId) return;
    try {
      const res = await api.post(`/erp/warehouse/transfer-requests/${rejectId}/reject`, { reason: rejectReason });
      setRequests(prev => prev.map(r => r.id === rejectId ? res.data.transfer_request : r));
      setRejectId(null); setRejectReason('');
      toast.success('Transfer rejected');
    } catch (err) { toast.error(err.response?.data?.message || 'Rejection failed'); }
  };

  const fmt = (n) => `${Number(n || 0).toLocaleString('en-IN')}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {['pending_approval', 'completed', 'rejected', ''].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              style={{ padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: statusFilter === s ? 700 : 500,
                background: statusFilter === s ? '#c9a96e' : '#f3f4f6', color: statusFilter === s ? '#fff' : '#6b7280' }}>
              {s === '' ? 'All' : s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </button>
          ))}
          <button onClick={load} disabled={loading} style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', color: '#6b7280' }}>
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>
        <button onClick={() => setShowForm(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: 'none', background: '#c9a96e', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
          <Plus size={13} /> New Transfer Request
        </button>
      </div>

      {/* Create form modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>New Transfer Request</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Request will need approval before stock moves</div>
              </div>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <label style={lbl}>Inventory Item *</label>
                <div style={{ position: 'relative' }}>
                  <input value={itemSearch} onChange={e => { setItemSearch(e.target.value); searchItems(e.target.value); }}
                    placeholder="Search by name or SKU" style={inp} />
                  {searchResults.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 8, zIndex: 50, maxHeight: 200, overflowY: 'auto', marginTop: 3 }}>
                      {searchResults.map(item => (
                        <div key={item.id} onMouseDown={() => { setForm(p => ({ ...p, inventory_item_id: item.id })); setItemSearch(item.title); setSearchResults([]); }}
                          style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 12, borderBottom: '1px solid #f3f4f6' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <div style={{ fontWeight: 600, color: '#111827' }}>{item.title}</div>
                          <div style={{ color: '#6b7280', fontSize: 11 }}>SKU: {item.sku} ?? Stock: {item.current_stock}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {form.inventory_item_id && <div style={{ fontSize: 11, color: '#16a34a', marginTop: 3 }}> Item selected (ID: {form.inventory_item_id})</div>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={lbl}>From Warehouse *</label>
                  <select value={form.from_warehouse_id} onChange={e => setForm(p => ({ ...p, from_warehouse_id: e.target.value }))} style={inp}>
                    <option value=""> Select </option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>To Warehouse *</label>
                  <select value={form.to_warehouse_id} onChange={e => setForm(p => ({ ...p, to_warehouse_id: e.target.value }))} style={inp}>
                    <option value=""> Select </option>
                    {warehouses.filter(w => String(w.id) !== String(form.from_warehouse_id)).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={lbl}>Quantity *</label>
                <input type="number" min="1" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} style={inp} placeholder="Units to transfer" />
              </div>
              <div>
                <label style={lbl}>Notes</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} style={{ ...inp, resize: 'vertical' }} placeholder="Optional notes" />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button onClick={handleCreate} disabled={saving}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: '#c9a96e', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                  {saving ? 'Submitting' : 'Submit Request'}
                </button>
                <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {rejectId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 400 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#111827', marginBottom: 12 }}>Reject Transfer Request</div>
            <label style={lbl}>Rejection Reason (optional)</label>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={2} style={{ ...inp, marginBottom: 14, resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleReject} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: '#ef4444', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Confirm Reject</button>
              <button onClick={() => { setRejectId(null); setRejectReason(''); }} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Requests table */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['ID', 'Item', 'From', 'To', 'Qty', 'Requested By', 'Status', 'Date', canApprove ? 'Actions' : ''].filter(Boolean).map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '9px 12px', fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}><td colSpan={8} style={{ padding: '9px 12px' }}><div className="skeleton" style={{ height: 24, borderRadius: 7 }} /></td></tr>
              )) : requests.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                  <ArrowRightLeft size={28} color="#e5e7eb" style={{ margin: '0 auto 8px', display: 'block' }} />
                  No transfer requests found.
                </td></tr>
              ) : requests.map(r => {
                const sc = STATUS_COLORS[r.status] || { bg: '#f3f4f6', color: '#6b7280' };
                return (
                  <tr key={r.id} style={{ borderTop: '1px solid #f9fafb' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '9px 12px', color: '#9ca3af', fontSize: 11 }}>#{r.id}</td>
                    <td style={{ padding: '9px 12px', fontWeight: 600, color: '#111827' }}>
                      <div>{r.item_title || ''}</div>
                      <div style={{ fontSize: 10, color: '#9ca3af' }}>{r.sku}</div>
                    </td>
                    <td style={{ padding: '9px 12px', color: '#374151' }}>{r.from_warehouse_name || ''}</td>
                    <td style={{ padding: '9px 12px', color: '#374151' }}>{r.to_warehouse_name || ''}</td>
                    <td style={{ padding: '9px 12px', fontWeight: 700, color: '#c9a96e' }}>{r.quantity}</td>
                    <td style={{ padding: '9px 12px', color: '#6b7280' }}>{r.requested_by_name || ''}</td>
                    <td style={{ padding: '9px 12px' }}>
                      <span style={{ ...sc, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100 }}>
                        {r.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '9px 12px', color: '#6b7280', fontSize: 11, whiteSpace: 'nowrap' }}>
                      {r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : ''}
                    </td>
                    {canApprove && (
                      <td style={{ padding: '9px 12px' }}>
                        {r.status === 'pending_approval' && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => handleApprove(r.id)}
                              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 7, border: 'none', background: '#dcfce7', color: '#166534', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                              <Check size={11} /> Approve
                            </button>
                            <button onClick={() => setRejectId(r.id)}
                              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 7, border: 'none', background: '#fee2e2', color: '#991b1b', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                              <X size={11} /> Reject
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
