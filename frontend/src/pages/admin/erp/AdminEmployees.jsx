import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, Plus, X, Pencil, ChevronLeft, ChevronRight,
  User, ShieldCheck, Store, Hash, Ban, CheckCircle, Trash2, Building2,
} from 'lucide-react';
import api from '../../../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';

const inp = {
  width: '100%', padding: '9px 12px', fontSize: 13,
  border: '1.5px solid #e5e7eb', borderRadius: 8, outline: 'none',
  fontFamily: 'inherit', color: '#111827', background: '#fff',
  boxSizing: 'border-box',
};
const lbl = { fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 };

const ROLE_OPTIONS = [
  'cashier', 'store_manager', 'warehouse_manager',
  'accountant', 'employee', 'store_admin', 'business_owner',
];

const ROLE_BADGE = {
  cashier:           { bg: '#dcfce7', color: '#166534' },
  store_manager:     { bg: '#dbeafe', color: '#1e40af' },
  warehouse_manager: { bg: '#ede9fe', color: '#6d28d9' },
  accountant:        { bg: '#fff7ed', color: '#c2410c' },
  employee:          { bg: '#f3f4f6', color: '#6b7280' },
  store_admin:       { bg: '#e0e7ff', color: '#3730a3' },
  business_owner:    { bg: '#fce7f3', color: '#9d174d' },
};

const roleLabel = (r) =>
  r ? r.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '';

const BLANK_FORM = {
  name: '', email: '', phone: '', role: 'employee',
  business_id: '', store_id: '', warehouse_id: '',
  employee_code: '', password: '',
};

//  Component 
export default function AdminEmployees() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin' || user?.role === 'admin';

  //  List state 
  const [employees, setEmployees] = useState([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [page, setPage]           = useState(1);
  const [limit]                   = useState(20);
  const [search, setSearch]       = useState('');
  const debounceRef               = useRef(null);

  //  Panel state 
  const [showPanel, setShowPanel]   = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm]             = useState(BLANK_FORM);
  const [saving, setSaving]         = useState(false);

  //  Data for selects 
  const [businesses, setBusinesses]         = useState([]);
  const [stores, setStores]                 = useState([]);
  const [warehouses, setWarehouses]         = useState([]);
  const [filteredStores, setFilteredStores] = useState([]);
  const [filteredWarehouses, setFilteredWarehouses] = useState([]);

  //  Load businesses (super_admin/admin), stores + warehouses once 
  useEffect(() => {
    if (isSuperAdmin) {
      api.get('/erp/businesses').then(r => setBusinesses(r.data.businesses || [])).catch(() => {});
    }
    api.get('/erp/stores').then(r => setStores(r.data.stores || [])).catch(() => {});
    api.get('/erp/warehouses').then(r => setWarehouses(r.data.warehouses || [])).catch(() => {});
  }, [isSuperAdmin]);

  // Filter stores+warehouses when business_id changes (super_admin only)
  useEffect(() => {
    if (!isSuperAdmin) {
      setFilteredStores(stores);
      setFilteredWarehouses(warehouses);
      return;
    }
    if (!form.business_id) {
      setFilteredStores([]);
      setFilteredWarehouses([]);
    } else {
      const bid = parseInt(form.business_id);
      setFilteredStores(stores.filter(s => s.business_id === bid));
      setFilteredWarehouses(warehouses.filter(w => w.business_id === bid));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.business_id, stores, warehouses, isSuperAdmin]);

  //  Fetch employees 
  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page, limit });
      if (search) p.set('search', search);
      const res = await api.get(`/erp/employees?${p}`);
      setEmployees(res.data.employees || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search]);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  //  Debounced search 
  const handleSearch = (val) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(val);
      setPage(1);
    }, 300);
  };

  //  Panel helpers 
  const openAdd = () => {
    setEditTarget(null);
    setForm({
      ...BLANK_FORM,
      business_id: !isSuperAdmin && user?.business_id ? String(user.business_id) : '',
    });
    setShowPanel(true);
  };

  const openEdit = (emp) => {
    setEditTarget(emp);
    setForm({
      name:          emp.name          || '',
      email:         emp.email         || '',
      phone:         emp.phone         || '',
      role:          emp.role          || 'employee',
      business_id:   emp.business_id   ? String(emp.business_id)   : '',
      store_id:      emp.store_id      ? String(emp.store_id)      : '',
      warehouse_id:  emp.warehouse_id  ? String(emp.warehouse_id)  : '',
      employee_code: emp.employee_code || '',
      password:      '',
    });
    setShowPanel(true);
  };

  const closePanel = () => {
    setShowPanel(false);
    setEditTarget(null);
  };

  const f = (v) => setForm((p) => ({ ...p, ...v }));

  //  Submit 
  const handleDelete = async (emp) => {
    if (!window.confirm(`Delete employee "${emp.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/erp/employees/${emp.id}`);
      toast.success('Employee deleted');
      fetchEmployees();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim())  return toast.error('Name is required');
    if (!form.email.trim()) return toast.error('Email is required');
    if (isSuperAdmin && !editTarget && !form.business_id) {
      return toast.error('Please select a business for this employee');
    }

    setSaving(true);
    try {
      const payload = {
        name:          form.name.trim(),
        email:         form.email.trim(),
        phone:         form.phone.trim()  || undefined,
        role:          form.role,
        store_id:      form.store_id      ? parseInt(form.store_id)      : undefined,
        warehouse_id:  form.warehouse_id  ? parseInt(form.warehouse_id)  : undefined,
        employee_code: form.employee_code.trim() || undefined,
      };

      // super_admin must pass business_id explicitly
      if (isSuperAdmin && form.business_id) {
        payload.business_id = parseInt(form.business_id);
      }

      if (editTarget) {
        await api.put(`/erp/employees/${editTarget.id}`, payload);
        toast.success('Employee updated');
      } else {
        if (form.password.trim()) payload.password = form.password.trim();
        await api.post('/erp/employees', payload);
        toast.success('Employee created');
      }
      closePanel();
      fetchEmployees();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save employee');
    } finally {
      setSaving(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  //  Render 
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/*  Toolbar  */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
          <input
            defaultValue=""
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search name, email, code"
            style={{ ...inp, paddingLeft: 32, width: 240 }}
          />
        </div>
        <button
          onClick={openAdd}
          className="btn-orange"
          style={{ padding: '9px 18px', borderRadius: 10, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Plus size={15} /> Add Employee
        </button>
      </div>

      {/*  Main layout: table + optional slide-in panel  */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

        {/*  Employee table  */}
        <div style={{ flex: 1, minWidth: 0, background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid #f3f4f6' }}>
            <span style={{ fontSize: 12, color: '#6b7280' }}>{total} employee{total !== 1 ? 's' : ''}</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['Name', 'Email', 'Phone', 'Role', 'Store', 'Employee Code', 'Status', 'Actions'].map((h) => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 12px', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 7 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={8} style={{ padding: '10px 12px' }}>
                        <div className="skeleton" style={{ height: 28, borderRadius: 8 }} />
                      </td>
                    </tr>
                  ))
                ) : employees.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '48px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                      No employees found. Click "Add Employee" to get started.
                    </td>
                  </tr>
                ) : employees.map((emp) => {
                  const badge = ROLE_BADGE[emp.role] || ROLE_BADGE.employee;
                  return (
                    <tr
                      key={emp.id}
                      style={{ borderTop: '1px solid #f9fafb', transition: 'background 0.12s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#fafafa'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: '#111827', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <User size={13} color="#9ca3af" />
                          </div>
                          {emp.name}
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', color: '#6b7280', whiteSpace: 'nowrap', fontSize: 12 }}>{emp.email}</td>
                      <td style={{ padding: '10px 12px', color: '#6b7280', whiteSpace: 'nowrap' }}>{emp.phone || ''}</td>
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                        <span style={{ ...badge, fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 100, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <ShieldCheck size={10} />
                          {roleLabel(emp.role)}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', color: '#6b7280', whiteSpace: 'nowrap', fontSize: 12 }}>
                        {emp.store_name ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Store size={11} color="#9ca3af" /> {emp.store_name}
                          </span>
                        ) : emp.warehouse_name ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#7c3aed' }}>
                            <Store size={11} /> {emp.warehouse_name}
                          </span>
                        ) : ''}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#6b7280', fontFamily: 'monospace', fontSize: 12, whiteSpace: 'nowrap' }}>
                        {emp.employee_code ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <Hash size={11} color="#9ca3af" />{emp.employee_code}
                          </span>
                        ) : ''}
                      </td>
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                        {emp.is_banned ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#fee2e2', color: '#991b1b', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 100 }}>
                            <Ban size={10} /> Banned
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#dcfce7', color: '#166534', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 100 }}>
                            <CheckCircle size={10} /> Active
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => openEdit(emp)}
                            title="Edit"
                            style={{ width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer', background: '#fff7ed', color: '#c9a96e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(emp)}
                            title="Delete"
                            style={{ width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer', background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ padding: '12px 16px', borderTop: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: '#9ca3af' }}>Page {page} of {totalPages}</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{ width: 30, height: 30, borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: page === 1 ? 0.4 : 1 }}
                >
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let p;
                  if (totalPages <= 5)          p = i + 1;
                  else if (page <= 3)            p = i + 1;
                  else if (page >= totalPages - 2) p = totalPages - 4 + i;
                  else                           p = page - 2 + i;
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      style={{ width: 30, height: 30, borderRadius: 8, border: '1.5px solid', cursor: 'pointer', fontWeight: page === p ? 700 : 400, borderColor: page === p ? '#c9a96e' : '#e5e7eb', background: page === p ? '#fff7ed' : '#fff', color: page === p ? '#c9a96e' : '#374151', fontSize: 13 }}
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={{ width: 30, height: 30, borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: page === totalPages ? 0.4 : 1 }}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/*  Add / Edit slide-in panel  */}
        {showPanel && (
          <div style={{ width: 400, flexShrink: 0, background: '#fff', borderRadius: 14, border: '1.5px solid #fed7aa', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {/* Panel header */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff7ed' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>
                {editTarget ? 'Edit Employee' : 'Add Employee'}
              </span>
              <button onClick={closePanel} style={{ width: 28, height: 28, borderRadius: 7, border: 'none', cursor: 'pointer', background: '#f3f4f6', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={14} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 13, overflowY: 'auto', maxHeight: 700 }}>

              {/* ── Business — super_admin / admin only ── */}
              {isSuperAdmin && (
                <div>
                  <label style={{ ...lbl, color: '#c9a96e', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Building2 size={11} /> Business *
                  </label>
                  <select
                    required={!editTarget}
                    value={form.business_id}
                    onChange={(e) => f({ business_id: e.target.value, store_id: '', warehouse_id: '' })}
                    style={{ ...inp, cursor: 'pointer', borderColor: !form.business_id && !editTarget ? '#f59e0b' : '#e5e7eb' }}
                  >
                    <option value="">— Select Business —</option>
                    {businesses.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                  {!form.business_id && !editTarget && businesses.length === 0 && (
                    <p style={{ fontSize: 11, color: '#ef4444', marginTop: 3 }}>
                      No businesses found. Create one in Super Admin → Businesses first.
                    </p>
                  )}
                  {!form.business_id && !editTarget && businesses.length > 0 && (
                    <p style={{ fontSize: 11, color: '#f59e0b', marginTop: 3 }}>
                      Select a business — Stores &amp; Warehouses will update accordingly
                    </p>
                  )}
                </div>
              )}

              {/* Name */}
              <div>
                <label style={lbl}>Employee Name *</label>
                <input required value={form.name} onChange={(e) => f({ name: e.target.value })} placeholder="Full name" style={inp} />
              </div>

              {/* Email */}
              <div>
                <label style={lbl}>Email *</label>
                <input
                  required type="email" value={form.email}
                  onChange={(e) => f({ email: e.target.value })}
                  placeholder="employee@example.com"
                  disabled={!!editTarget}
                  style={{ ...inp, background: editTarget ? '#f9fafb' : '#fff', color: editTarget ? '#9ca3af' : '#111827' }}
                />
                {editTarget && <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>Email cannot be changed after creation</p>}
              </div>

              {/* Phone */}
              <div>
                <label style={lbl}>Phone *</label>
                <input type="tel" value={form.phone} onChange={(e) => f({ phone: e.target.value })} placeholder="Mobile number" style={inp} />
              </div>

              {/* Role */}
              <div>
                <label style={lbl}>Role *</label>
                <select required value={form.role} onChange={(e) => f({ role: e.target.value })} style={{ ...inp, cursor: 'pointer' }}>
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>{roleLabel(r)}</option>
                  ))}
                </select>
              </div>

              {/* Location section divider */}
              <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 4 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px 0' }}>
                  Location Assignment
                </p>

                {/* Store */}
                <div style={{ marginBottom: 13 }}>
                  <label style={lbl}>Store</label>
                  <select
                    value={form.store_id}
                    onChange={(e) => f({ store_id: e.target.value, warehouse_id: '' })}
                    disabled={isSuperAdmin && !form.business_id}
                    style={{ ...inp, cursor: isSuperAdmin && !form.business_id ? 'not-allowed' : 'pointer', opacity: isSuperAdmin && !form.business_id ? 0.5 : 1 }}
                  >
                    <option value="">No Store</option>
                    {(isSuperAdmin ? filteredStores : stores).map((s) => (
                      <option key={s.id} value={s.id}>{s.name}{s.store_code ? ` (${s.store_code})` : ''}</option>
                    ))}
                  </select>
                  {isSuperAdmin && !form.business_id && (
                    <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>Select a business first</p>
                  )}
                </div>

                {/* Warehouse */}
                <div>
                  <label style={lbl}>Warehouse</label>
                  <select
                    value={form.warehouse_id}
                    onChange={(e) => f({ warehouse_id: e.target.value, store_id: '' })}
                    disabled={isSuperAdmin && !form.business_id}
                    style={{ ...inp, cursor: isSuperAdmin && !form.business_id ? 'not-allowed' : 'pointer', opacity: isSuperAdmin && !form.business_id ? 0.5 : 1 }}
                  >
                    <option value="">No Warehouse</option>
                    {(isSuperAdmin ? filteredWarehouses : warehouses).map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Employee Code */}
              <div>
                <label style={lbl}>Employee Code</label>
                <input value={form.employee_code} onChange={(e) => f({ employee_code: e.target.value })} placeholder="e.g. EMP-001" style={inp} />
              </div>

              {/* Password — new employees only */}
              {!editTarget && (
                <div>
                  <label style={lbl}>
                    Password{' '}
                    <span style={{ fontWeight: 400, color: '#9ca3af', textTransform: 'none' }}>(leave blank to auto-generate)</span>
                  </label>
                  <input
                    type="password" value={form.password}
                    onChange={(e) => f({ password: e.target.value })}
                    placeholder="Min 6 characters"
                    autoComplete="new-password" style={inp}
                  />
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                <button type="submit" disabled={saving} className="btn-orange"
                  style={{ flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 600 }}>
                  {saving ? 'Saving…' : editTarget ? 'Update Employee' : 'Add Employee'}
                </button>
                <button type="button" onClick={closePanel}
                  style={{ padding: '10px 18px', borderRadius: 10, fontSize: 13, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', color: '#374151', fontWeight: 500 }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
