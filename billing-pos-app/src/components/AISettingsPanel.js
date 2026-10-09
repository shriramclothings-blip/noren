import React, { useEffect, useState } from 'react';
import { Sparkles, Save, CheckCircle2, AlertCircle, Loader, ExternalLink, Key, Cpu } from 'lucide-react';
import toast from 'react-hot-toast';
import { loadGeminiConfig, saveGeminiConfig, testGeminiApiKey, DEFAULT_GEMINI_CONFIG } from '../utils/geminiService';

const MODELS = [
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash (Recommended — fast & free tier)' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (Higher quality — paid tier)' },
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (Latest fast model)' },
  { value: 'gemini-1.0-pro', label: 'Gemini 1.0 Pro (Legacy)' },
];

export default function AISettingsPanel() {
  const [config, setConfig] = useState(DEFAULT_GEMINI_CONFIG);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    loadGeminiConfig().then(setConfig);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveGeminiConfig(config);
      toast.success('AI settings saved.');
    } catch {
      toast.error('Failed to save.');
    }
    setSaving(false);
  };

  const handleTest = async () => {
    if (!config.apiKey?.trim()) {
      toast.error('Enter an API key first.');
      return;
    }
    setTesting(true);
    setTestResult(null);
    const result = await testGeminiApiKey(config.apiKey, config.model);
    setTestResult(result);
    if (result.success) toast.success('API key is valid!');
    else toast.error(result.error || 'Test failed');
    setTesting(false);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="card p-5">
        <div className="flex items-start gap-3">
          <div className="p-3 bg-violet-100 dark:bg-violet-900/30 rounded-2xl">
            <Sparkles size={22} className="text-violet-600" />
          </div>
          <div>
            <h2 className="font-bold text-lg">Gemini AI — In-App Integration</h2>
            <p className="text-sm text-gray-500 mt-1">
              Powered by Google Gemini, running directly inside this app — <strong>no separate server needed</strong>.
              Your API key is stored locally and never leaves your device.
            </p>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="card p-5 space-y-3">
        <h3 className="font-semibold flex items-center gap-2"><Cpu size={16} className="text-blue-500" /> How It Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { step: '1', icon: Key, title: 'Get Free API Key', desc: 'Create a free key at Google AI Studio (aistudio.google.com). No credit card required for the free tier.' },
            { step: '2', icon: Save, title: 'Paste & Save Here', desc: 'Paste your API key below and click Save. Your key is stored only on this device.' },
            { step: '3', icon: Sparkles, title: 'Ask AI in Reports', desc: 'Go to AI Reports and ask any question about your sales, inventory, or customers in plain English.' },
          ].map(s => (
            <div key={s.step} className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">{s.step}</span>
                <span className="font-medium text-sm">{s.title}</span>
              </div>
              <p className="text-xs text-gray-500 pl-7">{s.desc}</p>
            </div>
          ))}
        </div>
        <a
          href="https://aistudio.google.com/app/apikey"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-violet-600 hover:underline font-medium"
        >
          <ExternalLink size={14} /> Get a free Gemini API key →
        </a>
      </div>

      {/* Configuration */}
      <div className="card p-5 space-y-4">
        <h3 className="font-semibold">API Configuration</h3>

        <div>
          <label className="label">Gemini API Key</label>
          <div className="flex gap-2">
            <input
              type={showKey ? 'text' : 'password'}
              className="input flex-1 font-mono text-sm"
              placeholder="AIzaSy..."
              value={config.apiKey}
              onChange={e => setConfig(p => ({ ...p, apiKey: e.target.value.trim() }))}
            />
            <button
              type="button"
              onClick={() => setShowKey(v => !v)}
              className="btn-secondary text-xs px-3 shrink-0"
            >
              {showKey ? 'Hide' : 'Show'}
            </button>
          </div>
          {config.apiKey && (
            <p className="text-xs text-gray-400 mt-1">
              Key configured: <span className="font-mono">{config.apiKey.slice(0, 8)}•••{config.apiKey.slice(-4)}</span>
            </p>
          )}
        </div>

        <div>
          <label className="label">Model</label>
          <select
            className="input"
            value={config.model}
            onChange={e => setConfig(p => ({ ...p, model: e.target.value }))}
          >
            {MODELS.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Temperature <span className="text-gray-400 font-normal text-xs">({config.temperature})</span></label>
            <input type="range" min="0" max="1" step="0.05"
              value={config.temperature}
              onChange={e => setConfig(p => ({ ...p, temperature: Number(e.target.value) }))}
              className="w-full accent-violet-600 mt-1"
            />
            <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
              <span>Precise</span><span>Creative</span>
            </div>
          </div>
          <div>
            <label className="label">Max Response Tokens</label>
            <input type="number" className="input" min={256} max={8192} step={256}
              value={config.maxTokens}
              onChange={e => setConfig(p => ({ ...p, maxTokens: Number(e.target.value) || 2000 }))} />
            <p className="text-xs text-gray-400 mt-1">2000 is recommended for detailed analysis.</p>
          </div>
        </div>

        {/* Test */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button onClick={handleTest} disabled={testing || !config.apiKey}
            className="btn-secondary flex items-center gap-2 text-sm">
            {testing ? <Loader size={14} className="animate-spin" /> : <Sparkles size={14} />}
            Test API Key
          </button>
          {testResult && (
            <div className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg ${testResult.success ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'}`}>
              {testResult.success ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
              {testResult.success ? 'API key is valid and working!' : testResult.error}
            </div>
          )}
        </div>
      </div>

      {/* Privacy note */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl text-sm text-blue-700 dark:text-blue-300 space-y-1">
        <p className="font-semibold flex items-center gap-1.5"><Key size={14} /> Privacy & Security</p>
        <ul className="list-disc list-inside text-xs space-y-0.5 ml-1">
          <li>Your API key is stored only in this device's local database — never sent to any third-party server.</li>
          <li>Queries sent to Gemini are PII-masked (phone numbers, emails, PAN, GSTIN are removed before sending).</li>
          <li>Gemini only receives aggregated business summaries — no raw customer data.</li>
          <li>The AI is restricted to read-only analysis — it cannot modify your data.</li>
        </ul>
      </div>

      {/* Save */}
      <div className="card p-5 flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm text-gray-500">Changes take effect immediately after saving.</p>
        <button onClick={handleSave} disabled={saving} className="btn-primary shrink-0 flex items-center gap-2">
          {saving ? <Loader size={15} className="animate-spin" /> : <Save size={15} />}
          {saving ? 'Saving...' : 'Save AI Settings'}
        </button>
      </div>
    </div>
  );
}
