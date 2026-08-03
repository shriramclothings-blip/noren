import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Save, X, MapPin, Package, RefreshCw } from 'lucide-react';
import api from '../../../utils/api';
import toast from 'react-hot-toast';

const inp = {
  width: '100%', padding: '8px 10px', fontSize: 13,
  border: '1.5px solid #e5e7eb', borderRadius: 8, outline: 'none',
  fontFamily: 'inherit', color: '#111827', background: '#fff', boxSizing: 'border-box',
};
const lbl = { fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 };

const ZONE_TYPES = ['storage', 'receiving', 'dispatch', 'returns', 'damaged', 'quarantine'];

const BLANK_ZONE = { warehouse_id: '', name: '', zone_type: 'storage', capacity: 0 };
const BLANK_BIN  = { zone_id: '', warehouse_id: '', bin_code: '', description: '' };

export default function AdminWarehouseZones({ warehouses = [] }) {
  const [zones, setZones]     = useState([]);
  const [bins, setBins]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [selectedZone, setSelectedZone] = useState('');
  const [showZoneForm, setShowZoneForm] = useState(false);
  const [showBinForm, setShowBinForm]   = useState(false);
  const [zoneForm, setZoneForm] = useState(BLANK_ZONE);
  const [binForm, setBinForm]   = useState(BLANK_BIN);
  const [savingZone, setSavingZone] = useState(false);
  const [savingBin, setSavingBin]   = useState(false);
  const [editZoneId, setEditZoneId] = useState(null);
  const [editBinId, setEditBinId]   = useState(null);

  const loadZones = useCallback(async () => {
    if (!selectedWarehouse) { setZones([]); setBins([]); return; }
    setLoading(true);
    try {
      const res = await api.get(`/erp/warehouse/zones?warehouse_id=${selectedWarehouse}`);
      setZones(res.data.zones || []);
    } catch { toast.error('Failed to load zones'); }
    finally { setLoading(false); }
  }, [selectedWarehouse]);

  const loadBins = useCallback(async () => {
    if (!selectedZone) { setBins([]); return; }
    try {
      const res = await api.get(`/erp/warehouse/bins?zone_id=${selectedZone}`);
      setBins(res.data.bins || []);
    } catch {}
  }, [selectedZone]);

  useEffect(() => { loadZones(); }, [loadZones]);
  useEffect(() => { loadBins(); }, [loadBins]);

  const saveZone = async () => {
    if (!zoneForm.warehouse_id || !zoneForm.name) return toast.error('Warehouse and zone name are required');
    setSavingZone(true);
    try {
      if (editZoneId) {
        const res = await api.put(`/erp/warehouse/zones/${editZoneId}`, zoneForm);
        setZones(prev => prev.map(z => z.id === editZoneId ? res.data.zone : z));
        toast.success('Zone updated');
      } else {
        const res = await api.post('/erp/warehouse/zones', zoneForm);
        setZones(prev => [res.data.zone, ...prev]);
        toast.success('Zone created');
      }
      setShowZoneForm(false); setZoneForm(BLANK_ZONE); setEditZoneId(null);
    } catch (err) { toast.error(err.response?.data?.message || 'Save failed'); }
    finally { setSavingZone(false); }
  };

  const saveBin = async () => {
    if (!binForm.zone_id || !binForm.bin_code) return toast.error('Zone and bin code are required');
    setSavingBin(true);
    try {
      if (editBinId) {
        const res = await api.put(`/erp/warehouse/bins/${editBinId}`, binForm);
        setBins(prev => prev.map(b => b.id === editBinId ? res.data.bin : b));
        toast.success('Bin updated');
      } else {
        const res = await api.post('/erp/warehouse/bins', binForm);
        setBins(prev => [res.data.bin, ...prev]);
        toast.success('Bin created');
      }
      setShowBinForm(false); setBinForm(BLANK_BIN); setEditBinId(null);
    } catch (err) { toast.error(err.response?.data?.message || 'Save failed'); }
    finally { setSavingBin(false); }
  };

  const typeColor = (t) => ({ storage: '#3b82f6', receiving: '#22c55e', dispatch: '#c9a96e', returns: '#8b5cf6', damaged: '#ef4444', quarantine: '#f59e0b' }[t] || '#6b7280');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Warehouse selector */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={selectedWarehouse} onChange={e => { setSelectedWarehouse(e.target.value); setSelectedZone(''); }}
          style={{ ...inp, maxWidth: 260 }}>
          <option value=""> Select Warehouse </option>
          {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        {selectedWarehouse && (
          <button onClick={() => { setZoneForm({ ...BLANK_ZONE, warehouse_id: selectedWarehouse }); setEditZoneId(null); setShowZoneForm(true); }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: 'none', background: '#c9a96e', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
            <Plus size={13} /> New Zone
          </button>
        )}
        <button onClick={loadZones} disabled={loading} style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', color: '#6b7280' }}>
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>

      {/* Zone form modal */}
      {showZoneForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setShowZoneForm(false); }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 440 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{editZoneId ? 'Edit Zone' : 'Create Zone'}</span>
              <button onClick={() => setShowZoneForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              <div><label style={lbl}>Zone Name *</label><input value={zoneForm.name} onChange={e => setZoneForm(p => ({ ...p, name: e.target.value }))} style={inp} placeholder="e.g. Zone A" /></div>
              <div><label style={lbl}>Zone Type</label>
                <select value={zoneForm.zone_type} onChange={e => setZoneForm(p => ({ ...p, zone_type: e.target.value }))} style={inp}>
                  {ZONE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
              <div><label style={lbl}>Capacity (units)</label><input type="number" min="0" value={zoneForm.capacity} onChange={e => setZoneForm(p => ({ ...p, capacity: e.target.value }))} style={inp} /></div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button onClick={saveZone} disabled={savingZone}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: '#c9a96e', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                  {savingZone ? 'Saving' : editZoneId ? 'Update' : 'Create Zone'}
                </button>
                <button onClick={() => setShowZoneForm(false)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bin form modal */}
      {showBinForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setShowBinForm(false); }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 440 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{editBinId ? 'Edit Bin' : 'Create Bin Location'}</span>
              <button onClick={() => setShowBinForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              <div><label style={lbl}>Zone *</label>
                <select value={binForm.zone_id} onChange={e => setBinForm(p => ({ ...p, zone_id: e.target.value }))} style={inp}>
                  <option value=""> Select Zone </option>
                  {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                </select>
              </div>
              <div><label style={lbl}>Bin Code *</label><input value={binForm.bin_code} onChange={e => setBinForm(p => ({ ...p, bin_code: e.target.value }))} style={inp} placeholder="e.g. A-01-B" /></div>
              <div><label style={lbl}>Description</label><input value={binForm.description} onChange={e => setBinForm(p => ({ ...p, description: e.target.value }))} style={inp} placeholder="Optional description" /></div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button onClick={saveBin} disabled={savingBin}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: '#c9a96e', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                  {savingBin ? 'Saving' : editBinId ? 'Update' : 'Create Bin'}
                </button>
                <button onClick={() => setShowBinForm(false)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Zones grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: 12 }}>
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 12 }} />)}
        </div>
      ) : zones.length === 0 && selectedWarehouse ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 13 }}>No zones yet. Create the first zone for this warehouse.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: 12 }}>
          {zones.map(zone => {
            const c = typeColor(zone.zone_type);
            const isSelected = selectedZone === String(zone.id);
            return (
              <div key={zone.id} onClick={() => setSelectedZone(isSelected ? '' : String(zone.id))}
                style={{ background: '#fff', borderRadius: 12, border: `2px solid ${isSelected ? c : '#f3f4f6'}`, padding: 16, cursor: 'pointer', transition: 'border-color 0.15s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ background: `${c}18`, borderRadius: 8, padding: '4px 8px' }}>
                    <MapPin size={14} color={c} />
                  </div>
                  <button onClick={e => { e.stopPropagation(); setZoneForm({ warehouse_id: zone.warehouse_id, name: zone.name, zone_type: zone.zone_type, capacity: zone.capacity }); setEditZoneId(zone.id); setShowZoneForm(true); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 2 }}>
                    <Pencil size={12} />
                  </button>
                </div>
                <div style={{ fontWeight: 700, color: '#111827', fontSize: 14 }}>{zone.name}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <span style={{ background: `${c}18`, color: c, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 100 }}>{zone.zone_type}</span>
                  <span style={{ fontSize: 11, color: '#6b7280' }}>{zone.bin_count || 0} bins</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bins section */}
      {selectedZone && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>
              Bins  {zones.find(z => String(z.id) === selectedZone)?.name}
            </div>
            <button onClick={() => { setBinForm({ ...BLANK_BIN, zone_id: selectedZone, warehouse_id: selectedWarehouse }); setEditBinId(null); setShowBinForm(true); }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: 'none', background: '#c9a96e', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
              <Plus size={12} /> Add Bin
            </button>
          </div>
          {bins.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: '#9ca3af', fontSize: 13, background: '#fff', borderRadius: 12, border: '1px solid #f3f4f6' }}>No bins in this zone yet.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px,1fr))', gap: 10 }}>
              {bins.map(bin => (
                <div key={bin.id} style={{ background: '#fff', borderRadius: 10, border: '1px solid #f3f4f6', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: '#111827', fontFamily: 'monospace', fontSize: 13 }}>{bin.bin_code}</div>
                    {bin.description && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{bin.description}</div>}
                    <span style={{ background: bin.is_active ? '#dcfce7' : '#f3f4f6', color: bin.is_active ? '#166534' : '#6b7280', fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 100 }}>{bin.is_active ? 'Active' : 'Inactive'}</span>
                  </div>
                  <button onClick={() => { setBinForm({ zone_id: bin.zone_id, warehouse_id: bin.warehouse_id, bin_code: bin.bin_code, description: bin.description || '' }); setEditBinId(bin.id); setShowBinForm(true); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><Pencil size={12} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
