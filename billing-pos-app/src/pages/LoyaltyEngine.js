import React, { useMemo, useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Star, Gift, Crown, Award, TrendingUp, Search, Edit2, Check, X, Settings, Save } from 'lucide-react';
import { formatCurrency } from '../utils/helpers';
import { getSetting, setSetting } from '../db/db';
import toast from 'react-hot-toast';

const DEFAULT_SETTINGS = {
  pointsPer100: 10,
  redeemRate: 0.5,
  tiers: [
    { name: 'Bronze', min: 0,    max: 499,      color: 'text-amber-700',  bg: 'bg-amber-50 dark:bg-amber-900/20',   border: 'border-amber-200 dark:border-amber-800',   benefit: 'Standard benefits' },
    { name: 'Silver', min: 500,  max: 1499,     color: 'text-gray-500',   bg: 'bg-gray-50 dark:bg-gray-800',        border: 'border-gray-200 dark:border-gray-700',     benefit: '5% extra discount' },
    { name: 'Gold',   min: 1500, max: 4999,     color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-200 dark:border-yellow-800', benefit: '10% extra + priority' },
    { name: 'Platinum', min: 5000, max: Infinity, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-900/20', border: 'border-violet-200 dark:border-violet-800', benefit: '15% extra + VIP service' },
  ],
};

const TIER_ICONS = { Bronze: Star, Silver: Award, Gold: Crown, Platinum: Crown };

function getTier(points, tiers) {
  return [...tiers].reverse().find(t => points >= t.min) || tiers[0];
}

function ProgressBar({ points, tiers }) {
  const tier = getTier(points, tiers);
  const idx = tiers.findIndex(t => t.name === tier.name);
  const nextTier = tiers[idx + 1];
  if (!nextTier) return <div className="text-xs text-violet-600 font-semibold mt-1">🏆 Max Tier!</div>;
  const progress = Math.min(100, ((points - tier.min) / (nextTier.min - tier.min)) * 100);
  return (
    <div className="mt-1">
      <div className="flex justify-between text-[10px] text-gray-400 mb-1">
        <span>{tier.name}</span><span>{nextTier.min - points} pts to {nextTier.name}</span>
      </div>
      <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full transition-all" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

export default function LoyaltyEngine() {
  const { customers, updateCustomer, invoices, company } = useApp();
  const [search, setSearch] = useState('');
  const [redeemModal, setRedeemModal] = useState(null);
  const [redeemPoints, setRedeemPoints] = useState('');
  const [adjustModal, setAdjustModal] = useState(null);
  const [adjustPoints, setAdjustPoints] = useState('');
  const [filterTier, setFilterTier] = useState('All');
  const [showSettings, setShowSettings] = useState(false);
  const [loyaltySettings, setLoyaltySettings] = useState(DEFAULT_SETTINGS);
  const [settingsDraft, setSettingsDraft] = useState(null);

  useEffect(() => {
    getSetting('loyaltySettings').then(saved => {
      if (saved) setLoyaltySettings(saved);
    }).catch(() => {});
  }, []);

  const openSettings = () => {
    setSettingsDraft(JSON.parse(JSON.stringify(loyaltySettings)));
    setShowSettings(true);
  };

  const saveSettings = async () => {
    // Validate tiers are in ascending order
    for (let i = 1; i < settingsDraft.tiers.length; i++) {
      if (Number(settingsDraft.tiers[i].min) <= Number(settingsDraft.tiers[i - 1].min)) {
        return toast.error('Tier minimums must be in ascending order');
      }
    }
    const updated = {
      ...settingsDraft,
      pointsPer100: Number(settingsDraft.pointsPer100) || 10,
      redeemRate: Number(settingsDraft.redeemRate) || 0.5,
      tiers: settingsDraft.tiers.map((t, i) => ({
        ...t,
        min: Number(t.min) || 0,
        max: i === settingsDraft.tiers.length - 1 ? Infinity : Number(settingsDraft.tiers[i + 1].min) - 1,
      })),
    };
    await setSetting('loyaltySettings', updated);
    setLoyaltySettings(updated);
    setShowSettings(false);
    toast.success('Loyalty settings saved');
  };

  const { pointsPer100, redeemRate, tiers } = loyaltySettings;

  const enriched = useMemo(() => customers.map(c => {
    const pts = Number(c.points || 0);
    const tier = getTier(pts, tiers);
    const redeemValue = pts * redeemRate;
    const custInv = invoices.filter(i => i.customerId === c.id && i.status !== 'Refund');
    const totalSpent = c.total_spent || custInv.reduce((s, i) => s + (i.total || 0), 0);
    return { ...c, pts, tier, redeemValue, totalSpent };
  }), [customers, invoices, tiers, redeemRate]);

  const filtered = useMemo(() => enriched.filter(c => {
    const matchSearch = !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search);
    const matchTier = filterTier === 'All' || c.tier.name === filterTier;
    return matchSearch && matchTier;
  }).sort((a, b) => b.pts - a.pts), [enriched, search, filterTier]);

  const stats = useMemo(() => ({
    totalPoints: enriched.reduce((s, c) => s + c.pts, 0),
    totalRedeemValue: enriched.reduce((s, c) => s + c.redeemValue, 0),
    byTier: tiers.map(t => ({ name: t.name, count: enriched.filter(c => c.tier.name === t.name).length })),
  }), [enriched, tiers]);

  const handleRedeem = async () => {
    const pts = parseInt(redeemPoints);
    if (!pts || pts <= 0) return toast.error('Enter valid points');
    if (pts > redeemModal.pts) return toast.error('Insufficient points');
    await updateCustomer({ ...redeemModal, points: redeemModal.pts - pts });
    toast.success(`Redeemed ${pts} pts = ${formatCurrency(pts * redeemRate, company.currency)}`);
    setRedeemModal(null); setRedeemPoints('');
  };

  const handleAdjust = async () => {
    const pts = parseInt(adjustPoints);
    if (isNaN(pts)) return toast.error('Enter valid number');
    await updateCustomer({ ...adjustModal, points: Math.max(0, (adjustModal.pts || 0) + pts) });
    toast.success('Points adjusted');
    setAdjustModal(null); setAdjustPoints('');
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Star className="text-amber-500" size={26} /> Loyalty Engine</h1>
          <p className="text-sm text-gray-400 mt-0.5">Earn {pointsPer100} pts per ₹100 • Redeem at ₹{redeemRate}/pt • {tiers.length} tiers</p>
        </div>
        <button onClick={openSettings} className="btn-secondary gap-2"><Settings size={15} /> Settings</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card p-4"><Star size={18} className="text-amber-500 mb-2" /><p className="text-xl font-bold">{stats.totalPoints.toLocaleString()}</p><p className="text-xs text-gray-400">Total Points Issued</p></div>
        <div className="card p-4"><Gift size={18} className="text-emerald-500 mb-2" /><p className="text-xl font-bold">{formatCurrency(stats.totalRedeemValue, company.currency)}</p><p className="text-xs text-gray-400">Total Redeem Value</p></div>
        {stats.byTier.slice(-2).reverse().map(t => (
          <div key={t.name} className="card p-4"><Crown size={18} className="text-violet-500 mb-2" /><p className="text-xl font-bold">{t.count}</p><p className="text-xs text-gray-400">{t.name} Members</p></div>
        ))}
      </div>

      {/* Tier Cards */}
      <div className="card p-5">
        <h3 className="font-semibold mb-3 flex items-center gap-2"><TrendingUp size={16} className="text-primary-500" /> Tier Structure</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {tiers.map(t => {
            const Icon = TIER_ICONS[t.name] || Star;
            return (
              <div key={t.name} className={`rounded-xl border p-3 ${t.bg} ${t.border}`}>
                <div className={`font-bold text-sm ${t.color} flex items-center gap-1`}><Icon size={14} /> {t.name}</div>
                <p className="text-xs text-gray-500 mt-1">{t.max === Infinity ? `${t.min}+ pts` : `${t.min}–${t.max} pts`}</p>
                <p className="text-xs text-gray-400 mt-1">{t.benefit}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search customer..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-40" value={filterTier} onChange={e => setFilterTier(e.target.value)}>
          <option>All</option>
          {tiers.map(t => <option key={t.name}>{t.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>{['Customer', 'Tier', 'Points', 'Redeem Value', 'Total Spent', 'Progress', 'Actions'].map(h => <th key={h} className="table-head">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {filtered.length === 0 && <tr><td colSpan={7} className="table-cell text-center text-gray-400 py-10">No customers found</td></tr>}
              {filtered.map(c => {
                const Icon = TIER_ICONS[c.tier.name] || Star;
                return (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="table-cell"><div className="font-medium">{c.name}</div><div className="text-xs text-gray-400">{c.phone}</div></td>
                    <td className="table-cell">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${c.tier.bg} ${c.tier.color} border ${c.tier.border}`}>
                        <Icon size={11} /> {c.tier.name}
                      </span>
                    </td>
                    <td className="table-cell font-bold text-amber-600">{c.pts.toLocaleString()}</td>
                    <td className="table-cell text-emerald-600 font-semibold">{formatCurrency(c.redeemValue, company.currency)}</td>
                    <td className="table-cell">{formatCurrency(c.totalSpent, company.currency)}</td>
                    <td className="table-cell min-w-[160px]"><ProgressBar points={c.pts} tiers={tiers} /></td>
                    <td className="table-cell">
                      <div className="flex gap-1">
                        <button onClick={() => { setRedeemModal(c); setRedeemPoints(''); }} className="px-2 py-1 text-xs bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-lg hover:bg-emerald-100 font-medium">Redeem</button>
                        <button onClick={() => { setAdjustModal(c); setAdjustPoints(''); }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500"><Edit2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Redeem Modal */}
      {redeemModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-bold text-lg mb-1">Redeem Points</h3>
            <p className="text-sm text-gray-500 mb-4">{redeemModal.name} — Available: <strong>{redeemModal.pts} pts</strong> = {formatCurrency(redeemModal.redeemValue, company.currency)}</p>
            <label className="label">Points to Redeem</label>
            <input className="input mb-2" type="number" min={1} max={redeemModal.pts} value={redeemPoints} onChange={e => setRedeemPoints(e.target.value)} placeholder={`Max ${redeemModal.pts}`} />
            {redeemPoints > 0 && <p className="text-xs text-emerald-600 mb-3">= {formatCurrency(parseInt(redeemPoints || 0) * redeemRate, company.currency)} discount</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={handleRedeem} className="btn-primary flex-1 justify-center"><Check size={15} /> Redeem</button>
              <button onClick={() => setRedeemModal(null)} className="btn-secondary flex-1 justify-center"><X size={15} /> Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Modal */}
      {adjustModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-bold text-lg mb-1">Adjust Points</h3>
            <p className="text-sm text-gray-500 mb-4">{adjustModal.name} — Current: <strong>{adjustModal.pts} pts</strong></p>
            <label className="label">Add / Subtract (use negative to deduct)</label>
            <input className="input mb-2" type="number" value={adjustPoints} onChange={e => setAdjustPoints(e.target.value)} placeholder="e.g. +50 or -20" />
            <div className="flex gap-2 mt-4">
              <button onClick={handleAdjust} className="btn-primary flex-1 justify-center"><Check size={15} /> Apply</button>
              <button onClick={() => setAdjustModal(null)} className="btn-secondary flex-1 justify-center"><X size={15} /> Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && settingsDraft && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-lg shadow-2xl my-4">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg flex items-center gap-2"><Settings size={18} /> Loyalty Settings</h3>
              <button onClick={() => setShowSettings(false)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><X size={16} /></button>
            </div>

            <div className="space-y-5">
              {/* Earn & Redeem rates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Points earned per ₹100</label>
                  <input className="input" type="number" min={1} value={settingsDraft.pointsPer100}
                    onChange={e => setSettingsDraft(d => ({ ...d, pointsPer100: e.target.value }))} />
                  <p className="text-xs text-gray-400 mt-1">e.g. 10 = 10 pts per ₹100 spent</p>
                </div>
                <div>
                  <label className="label">Redeem rate (₹ per point)</label>
                  <input className="input" type="number" min={0.01} step={0.01} value={settingsDraft.redeemRate}
                    onChange={e => setSettingsDraft(d => ({ ...d, redeemRate: e.target.value }))} />
                  <p className="text-xs text-gray-400 mt-1">e.g. 0.5 = 1 pt = ₹0.50</p>
                </div>
              </div>

              {/* Tier editor */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0">Tiers</label>
                  <button
                    onClick={() => setSettingsDraft(d => ({
                      ...d,
                      tiers: [...d.tiers, { name: `Tier ${d.tiers.length + 1}`, min: (d.tiers[d.tiers.length - 1]?.min || 0) + 1000, max: Infinity, color: 'text-gray-600', bg: 'bg-gray-50 dark:bg-gray-800', border: 'border-gray-200 dark:border-gray-700', benefit: 'Custom benefit' }]
                    }))}
                    className="text-xs text-primary-600 hover:underline"
                  >+ Add Tier</button>
                </div>
                <div className="space-y-3">
                  {settingsDraft.tiers.map((tier, idx) => (
                    <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-xl p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <input className="input flex-1 py-1.5 text-sm font-semibold" value={tier.name}
                          onChange={e => setSettingsDraft(d => { const t = [...d.tiers]; t[idx] = { ...t[idx], name: e.target.value }; return { ...d, tiers: t }; })}
                          placeholder="Tier name" />
                        <input className="input w-28 py-1.5 text-sm" type="number" value={tier.min}
                          onChange={e => setSettingsDraft(d => { const t = [...d.tiers]; t[idx] = { ...t[idx], min: e.target.value }; return { ...d, tiers: t }; })}
                          placeholder="Min pts" />
                        {settingsDraft.tiers.length > 1 && (
                          <button onClick={() => setSettingsDraft(d => ({ ...d, tiers: d.tiers.filter((_, i) => i !== idx) }))}
                            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg flex-shrink-0"><X size={14} /></button>
                        )}
                      </div>
                      <input className="input w-full py-1.5 text-sm" value={tier.benefit}
                        onChange={e => setSettingsDraft(d => { const t = [...d.tiers]; t[idx] = { ...t[idx], benefit: e.target.value }; return { ...d, tiers: t }; })}
                        placeholder="Benefit description" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={saveSettings} className="btn-primary flex-1 justify-center"><Save size={15} /> Save Settings</button>
              <button onClick={() => setShowSettings(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
