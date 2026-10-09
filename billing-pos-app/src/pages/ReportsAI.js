import React, { useEffect, useState } from 'react';
import { dbGetAll } from '../db/db';
import { useApp } from '../context/AppContext';
import { Send, Loader, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { queryGemini, loadGeminiConfig } from '../utils/geminiService';

export default function ReportsAI() {
  const { company } = useApp();
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [topSkus, setTopSkus] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [customersSummary, setCustomersSummary] = useState([]);
  const [geminiConfigured, setGeminiConfigured] = useState(false);

  // Chat state
  const [query, setQuery] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    void runSnapshot();
    loadGeminiConfig().then((cfg) => setGeminiConfigured(Boolean(cfg?.apiKey)));
  }, []);

  const runSnapshot = async () => {
    setLoading(true);
    try {
      const invoices = await dbGetAll('invoices');
      const products = await dbGetAll('products');
      const variants = await dbGetAll('variants');
      const customers = await dbGetAll('customers');

      const now = new Date();
      const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const recent = (invoices || []).filter(i => i?.date && new Date(i.date) >= since);
      const totalSales = recent.reduce((s, r) => s + Number(r.total || 0), 0);
      const count = recent.length;
      const refunds = recent.filter(r => Number(r.total || 0) < 0).reduce((s, r) => s + Number(r.total || 0), 0);
      const aov = count ? (totalSales / count) : 0;
      setSummary({ totalSales, count, refunds, aov });

      const since90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      const recent90 = (invoices || []).filter(i => i?.date && new Date(i.date) >= since90);
      const skuMap = new Map();
      for (const inv of recent90) {
        for (const it of inv.items || []) {
          const key = it.variantId || it.productId || (it.sku || it.name || 'unknown');
          const qty = Number(it.qty || 0);
          const revenue = Number(it.total || (it.price ? it.price * qty : 0));
          const cur = skuMap.get(key) || { qty: 0, revenue: 0, name: null, id: key };
          cur.qty += qty; cur.revenue += revenue;
          skuMap.set(key, cur);
        }
      }
      const skuArr = Array.from(skuMap.values());
      const prodById = new Map((products || []).map(p => [p.id, p]));
      const varById = new Map((variants || []).map(v => [v.id, v]));
      const enriched = skuArr.map(s => {
        let name = s.name;
        if (!name) {
          if (varById.has(s.id)) name = varById.get(s.id).label || varById.get(s.id).sku || `${s.id}`;
          else if (prodById.has(s.id)) name = prodById.get(s.id).name || `${s.id}`;
          else name = String(s.id);
        }
        return { ...s, name };
      }).sort((a, b) => b.revenue - a.revenue).slice(0, 20);
      setTopSkus(enriched);

      const low = [];
      for (const v of variants || []) {
        if (Number(v.stock || 0) <= 5) low.push({ id: v.id, name: v.label || v.sku || `Variant ${v.id}`, stock: Number(v.stock || 0) });
      }
      for (const p of products || []) {
        if ((!p.variants || p.variants.length === 0) && Number(p.stock || 0) <= 5) {
          low.push({ id: p.id, name: p.name || `Product ${p.id}`, stock: Number(p.stock || 0) });
        }
      }
      setLowStock(low.slice(0, 50));

      const custTop = (customers || []).map(c => ({ id: c.id, name: c.name || c.phone || `C${c.id}`, total_spent: Number(c.total_spent || 0) }))
        .sort((a, b) => b.total_spent - a.total_spent).slice(0, 20);
      setCustomersSummary(custTop);
    } catch (err) {
      console.error('ReportsAI snapshot failed', err);
      toast.error('Failed to load snapshot');
    } finally {
      setLoading(false);
    }
  };

  const handleAskAI = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    const userQuery = query.trim();
    setQuery('');
    setAiLoading(true);

    const result = await queryGemini(userQuery, { summary, topSkus, lowStock });

    if (result.success) {
      setChatHistory(prev => [...prev, {
        id: result.queryId,
        query: userQuery,
        answer: result.answer,
        sql: result.sql,
        sources: result.sources,
        confidence: result.confidence,
        timestamp: result.timestamp,
        error: null,
      }]);
      toast.success('Analysis complete!');
    } else {
      setChatHistory(prev => [...prev, {
        id: Date.now(),
        query: userQuery,
        answer: null,
        error: result.error,
        timestamp: new Date().toISOString(),
      }]);
      toast.error(result.error || 'AI analysis failed');
    }
    setAiLoading(false);
  };

  const currency = company?.currency || '₹';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles size={22} className="text-violet-500" />
            AI Reports & Analysis
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Ask natural-language questions about your business — powered by Google Gemini, running entirely within this app.
          </p>
        </div>
        {!geminiConfigured && (
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl text-sm text-amber-700 dark:text-amber-400">
            <AlertCircle size={15} />
            <span>Configure your Gemini API key in <strong>Settings → AI & Integrations</strong></span>
          </div>
        )}
        {geminiConfigured && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-full text-xs text-emerald-700 dark:text-emerald-400 font-medium">
            <CheckCircle2 size={13} />
            Gemini Ready — No backend needed
          </div>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader size={16} className="animate-spin" />
          <span>Loading data snapshot...</span>
        </div>
      )}

      {/* Quick Stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Sales (30d)', value: `${currency}${summary.totalSales.toFixed(0)}` },
            { label: 'Invoices (30d)', value: summary.count },
            { label: 'Refunds (30d)', value: `${currency}${Math.abs(summary.refunds).toFixed(0)}` },
            { label: 'Avg. Order Value', value: `${currency}${summary.aov.toFixed(0)}` },
          ].map(s => (
            <div key={s.label} className="card p-4">
              <div className="text-xs text-gray-400 mb-1">{s.label}</div>
              <div className="text-xl font-bold text-gray-800 dark:text-white">{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Chat Interface */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-violet-500" />
          <h3 className="font-semibold">Ask Gemini AI Analyst</h3>
          <span className="ml-auto text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
            Runs in-app · No server required
          </span>
        </div>

        {/* Chat History */}
        <div className="max-h-96 overflow-y-auto space-y-3 border border-gray-100 dark:border-gray-700 rounded-xl p-3 bg-gray-50 dark:bg-gray-900/50">
          {chatHistory.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <Sparkles size={28} className="text-violet-300 mx-auto" />
              <p className="text-xs text-gray-400">No questions asked yet.</p>
              <p className="text-xs text-gray-400">Try: <em>"What were our top 5 products this month?"</em></p>
            </div>
          ) : (
            chatHistory.map(msg => (
              <div key={msg.id} className="space-y-1.5">
                <div className="text-sm font-semibold text-violet-600 dark:text-violet-400">Q: {msg.query}</div>
                {msg.error ? (
                  <div className="flex gap-2 p-2.5 bg-red-50 dark:bg-red-900/20 rounded-lg text-xs text-red-700 dark:text-red-300">
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                    <span>{msg.error}</span>
                  </div>
                ) : (
                  <>
                    <div className="text-sm text-gray-700 dark:text-gray-300 pl-3 py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 leading-relaxed">
                      {msg.answer}
                    </div>
                    {(msg.sql || (msg.sources && msg.sources.length > 0)) && (
                      <button onClick={() => setExpandedId(expandedId === msg.id ? null : msg.id)} className="text-xs text-violet-600 hover:underline ml-3">
                        {expandedId === msg.id ? '▼ Hide Details' : '▶ Show SQL & Sources'}
                      </button>
                    )}
                    {expandedId === msg.id && (
                      <div className="text-xs space-y-1.5 ml-3 p-2.5 bg-gray-100 dark:bg-gray-700/60 rounded-lg">
                        {msg.confidence && (
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold">Confidence:</span>
                            <span className={`px-1.5 py-0.5 rounded text-white text-[10px] font-bold ${msg.confidence >= 0.7 ? 'bg-emerald-500' : msg.confidence >= 0.4 ? 'bg-amber-500' : 'bg-red-500'}`}>
                              {(msg.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                        )}
                        {msg.sql && (
                          <div>
                            <span className="font-semibold">SQL Query:</span>
                            <code className="block bg-gray-900 text-green-300 p-2 mt-0.5 rounded-lg overflow-x-auto font-mono text-[11px] leading-relaxed">{msg.sql}</code>
                          </div>
                        )}
                        {msg.sources && msg.sources.length > 0 && (
                          <div><span className="font-semibold">Data Sources:</span> {msg.sources.join(', ')}</div>
                        )}
                        {msg.timestamp && (
                          <div className="text-gray-400">{new Date(msg.timestamp).toLocaleString('en-IN')}</div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))
          )}
        </div>

        {/* Chat Input */}
        <form onSubmit={handleAskAI} className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask about sales, inventory, customers, profit..."
            className="flex-1 px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            disabled={aiLoading || !geminiConfigured}
          />
          <button
            type="submit"
            disabled={aiLoading || !query.trim() || !geminiConfigured}
            className="px-4 py-2.5 bg-violet-600 text-white rounded-xl hover:bg-violet-700 disabled:opacity-50 flex gap-2 items-center text-sm font-medium transition-colors"
          >
            {aiLoading ? <Loader size={16} className="animate-spin" /> : <Send size={16} />}
            {aiLoading ? 'Analyzing...' : 'Ask'}
          </button>
        </form>

        {!geminiConfigured && (
          <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
            Add your free Gemini API key in Settings → AI & Integrations to enable AI analysis.
          </p>
        )}
      </div>

      {/* Snapshot Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section>
          <h3 className="text-base font-semibold mb-3">Top SKUs (90d)</h3>
          <div className="overflow-auto card max-h-64">
            <table className="w-full text-left text-sm">
              <thead><tr className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
                <th className="px-3 py-2">Rank</th><th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Qty</th><th className="px-3 py-2">Revenue</th>
              </tr></thead>
              <tbody>
                {topSkus.map((s, idx) => (
                  <tr key={s.id} className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-3 py-2 font-medium text-gray-500">{idx + 1}</td>
                    <td className="px-3 py-2 truncate max-w-[160px]">{s.name}</td>
                    <td className="px-3 py-2">{s.qty}</td>
                    <td className="px-3 py-2 font-medium">{currency}{s.revenue.toFixed(0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section>
          <h3 className="text-base font-semibold mb-3">Low Stock Alert</h3>
          <div className="overflow-auto card max-h-64">
            <table className="w-full text-left text-sm">
              <thead><tr className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
                <th className="px-3 py-2">Item</th><th className="px-3 py-2">Stock</th>
              </tr></thead>
              <tbody>
                {lowStock.map(l => (
                  <tr key={l.id} className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-3 py-2 truncate max-w-[180px]">{l.name}</td>
                    <td className="px-3 py-2"><span className="font-semibold text-orange-600">{l.stock}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      <section>
        <h3 className="text-base font-semibold mb-3">Top Customers</h3>
        <div className="overflow-auto card max-h-64">
          <table className="w-full text-left text-sm">
            <thead><tr className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
              <th className="px-3 py-2">Rank</th><th className="px-3 py-2">Customer</th><th className="px-3 py-2">Total Spent</th>
            </tr></thead>
            <tbody>
              {customersSummary.map((c, idx) => (
                <tr key={c.id} className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-3 py-2 font-medium text-gray-500">{idx + 1}</td>
                  <td className="px-3 py-2">{c.name}</td>
                  <td className="px-3 py-2 font-medium">{currency}{c.total_spent.toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
