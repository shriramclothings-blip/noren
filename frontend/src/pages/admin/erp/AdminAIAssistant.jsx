import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Send, Activity, RefreshCw,
         TrendingUp, ShoppingBag, Users, Package, IndianRupee, Wifi } from 'lucide-react';
import api from '../../../utils/api';
import toast from 'react-hot-toast';

// ── Voice ─────────────────────────────────────────────────────────────────────
function speak(text, onEnd) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter  = new SpeechSynthesisUtterance(text);
  utter.lang   = 'en-IN'; utter.rate = 0.93; utter.pitch = 0.8; utter.volume = 1;
  const voices = window.speechSynthesis.getVoices();
  const male   = voices.find(v => /male|david|mark|daniel|james/i.test(v.name) && /en/i.test(v.lang))
              || voices.find(v => /en-IN/i.test(v.lang))
              || voices.find(v => /en/i.test(v.lang));
  if (male) utter.voice = male;
  utter.onend = onEnd; utter.onerror = onEnd;
  window.speechSynthesis.speak(utter);
}

// ── Metric card ───────────────────────────────────────────────────────────────
function MetricCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 16,
      border: '1px solid #f0ebe3',
      padding: '18px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      position: 'relative',
      overflow: 'hidden',
      flex: '1 1 140px',
      minWidth: 130,
    }}>
      {/* accent line top */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: accent || '#c9a96e' }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: (accent || '#c9a96e') + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={14} color={accent || '#c9a96e'} />
        </div>
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#111827', lineHeight: 1 }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{sub}</div>}
      </div>
    </div>
  );
}

// ── AI Avatar ─────────────────────────────────────────────────────────────────
function AIAvatar({ speaking, loading }) {
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div style={{
        width: 38, height: 38, borderRadius: '50%',
        background: 'linear-gradient(135deg, #1a1a18 0%, #3d3d39 100%)',
        border: '2px solid ' + (speaking ? '#c9a96e' : '#e5e7eb'),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: speaking ? '0 0 0 4px rgba(201,169,110,0.15)' : 'none',
        transition: 'all 0.3s',
      }}>
        <span style={{
          fontSize: 13, fontWeight: 800, color: '#c9a96e',
          letterSpacing: '-0.03em', fontFamily: "'Cormorant Garamond', Georgia, serif",
        }}>N</span>
      </div>
      {loading && (
        <div style={{ position: 'absolute', bottom: -2, right: -2, width: 12, height: 12, borderRadius: '50%', background: '#fff', border: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#c9a96e', animation: 'pulse 1s infinite' }} />
        </div>
      )}
    </div>
  );
}

// ── Message ───────────────────────────────────────────────────────────────────
function Message({ msg, onSpeak, onStop, speaking }) {
  const isAI = msg.role === 'ai';

  if (msg.loading) {
    return (
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <AIAvatar speaking={false} loading={true} />
        <div style={{ background: '#faf9f7', borderRadius: '4px 16px 16px 16px', padding: '14px 18px', border: '1px solid #f0ebe3' }}>
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#c9a96e', animation: 'dot 1.2s ' + (i*0.2) + 's ease-in-out infinite' }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isAI) {
    return (
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', maxWidth: '80%' }}>
        <AIAvatar speaking={speaking} loading={false} />
        <div style={{ flex: 1 }}>
          <div style={{ background: '#faf9f7', borderRadius: '4px 16px 16px 16px', padding: '16px 20px', border: '1px solid #f0ebe3' }}>
            <p style={{ fontSize: 13, color: '#1a1a18', lineHeight: 1.8, margin: 0, fontWeight: 400, whiteSpace: 'pre-wrap' }}>
              {msg.content}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 6, paddingLeft: 4 }}>
            {speaking ? (
              <button onClick={onStop} style={actionBtn}>
                <VolumeX size={11} /> Stop voice
              </button>
            ) : (
              <button onClick={() => onSpeak(msg.content)} style={actionBtn}>
                <Volume2 size={11} /> Listen
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ maxWidth: '65%', background: 'linear-gradient(135deg,#1a1a18,#2d2d2a)', borderRadius: '16px 4px 16px 16px', padding: '14px 18px' }}>
        <p style={{ fontSize: 13, color: '#faf9f7', lineHeight: 1.7, margin: 0, fontWeight: 300 }}>
          {msg.content}
        </p>
      </div>
    </div>
  );
}

const actionBtn = {
  display: 'inline-flex', alignItems: 'center', gap: 5,
  fontSize: 11, color: '#9ca3af', background: 'none',
  border: 'none', cursor: 'pointer', fontFamily: 'inherit',
  padding: '2px 0', letterSpacing: '0.03em',
};

// ── Quick chips ───────────────────────────────────────────────────────────────
const QUICK = [
  "Today's full update",
  'Pending orders?',
  'Revenue this month',
  'UTM performance',
  'Low stock alerts',
  'New users today',
  'Top products',
  'Profit estimate',
];

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AdminAIAssistant() {
  const [messages,  setMessages]  = useState([{
    id: 1, role: 'ai',
    content: "Good day. I'm NOREN AI — connected live to your store, orders, inventory, users, and marketing data.\n\nTap \"Business Update\" for your full briefing, or ask me anything.",
  }]);
  const [input,     setInput]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [briefing,  setBriefing]  = useState(false);
  const [metrics,   setMetrics]   = useState(null);
  const [voiceOn,   setVoiceOn]   = useState(true);
  const [speakId,   setSpeakId]   = useState(null);
  const [listening, setListening] = useState(false);

  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const recogRef  = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
  }, []);

  const handleSpeak = useCallback((text, id) => {
    if (!voiceOn) return;
    setSpeakId(id);
    speak(text, () => setSpeakId(null));
  }, [voiceOn]);

  const handleStop = useCallback(() => {
    window.speechSynthesis?.cancel();
    setSpeakId(null);
  }, []);

  const appendAI = (id, content) =>
    setMessages(prev => prev.map(m => m.id === id ? { ...m, content, loading: false } : m));

  const getBrief = async () => {
    if (briefing || loading) return;
    setBriefing(true);
    const lid = Date.now();
    setMessages(prev => [...prev, { id: lid, role: 'ai', content: '', loading: true }]);
    try {
      const res = await api.post('/erp/ai/brief');
      setMetrics(res.data.metrics);
      appendAI(lid, res.data.brief);
      if (voiceOn) handleSpeak(res.data.brief, lid);
    } catch (err) {
      appendAI(lid, err.response?.data?.message || 'Unable to generate briefing.');
    } finally { setBriefing(false); }
  };

  const send = async (text) => {
    const q = (text || input).trim();
    if (!q || loading || briefing) return;
    setInput('');
    const uid = Date.now(), aid = uid + 1;
    setMessages(prev => [
      ...prev,
      { id: uid, role: 'user', content: q },
      { id: aid, role: 'ai', content: '', loading: true },
    ]);
    setLoading(true);
    try {
      const history = messages.slice(-8).map(m => ({ role: m.role, content: m.content }));
      const res = await api.post('/erp/ai/chat', { message: q, history });
      if (res.data.metrics) setMetrics(res.data.metrics);
      appendAI(aid, res.data.response);
      if (voiceOn) handleSpeak(res.data.response, aid);
    } catch (err) {
      appendAI(aid, err.response?.data?.message || 'Something went wrong.');
    } finally { setLoading(false); }
  };

  const startListen = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast.error('Voice input not supported'); return; }
    const r = new SR();
    r.lang = 'en-IN'; r.interimResults = false;
    r.onresult = e => { setListening(false); send(e.results[0][0].transcript); };
    r.onerror = r.onend = () => setListening(false);
    recogRef.current = r;
    setListening(true);
    r.start();
  };

  const m = metrics;
  const fmt = v => Number(v||0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, height: 'calc(100vh - 108px)', minHeight: 500 }}>
      <style>{`
        @keyframes dot{0%,80%,100%{transform:translateY(0);opacity:.4}40%{transform:translateY(-5px);opacity:1}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .ai-quick:hover{background:#fff7ed!important;border-color:#c9a96e!important;color:#92400e!important}
        .ai-send:hover{background:#c9a96e!important}
        @media(max-width:640px){.ai-cards{flex-wrap:wrap!important}.ai-header-btns{flex-direction:column!important;align-items:flex-start!important}}
      `}</style>

      {/* ── Header ── */}
      <div style={{
        background: 'linear-gradient(135deg, #1a1a18 0%, #2a2a26 100%)',
        borderRadius: '16px 16px 0 0',
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
        flexShrink: 0,
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'linear-gradient(135deg,#c9a96e,#a8834a)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: '#1a1a18', fontFamily: "'Cormorant Garamond', Georgia, serif", letterSpacing: '-0.02em' }}>N</span>
          </div>
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#faf9f7', margin: 0, letterSpacing: '0.12em', textTransform: 'uppercase' }}>NOREN AI</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', animation: 'pulse 2s infinite' }} />
              <span style={{ fontSize: 11, color: 'rgba(250,249,247,0.45)', letterSpacing: '0.06em' }}>Live data connected</span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="ai-header-btns" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => { handleStop(); setVoiceOn(v => !v); }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: voiceOn ? '#c9a96e' : 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.04em', transition: 'all 0.2s' }}>
            {voiceOn ? <Volume2 size={13} /> : <VolumeX size={13} />}
            {voiceOn ? 'Voice On' : 'Voice Off'}
          </button>

          <button onClick={getBrief} disabled={briefing || loading} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 20px', borderRadius: 10, border: 'none', background: '#c9a96e', color: '#1a1a18', fontSize: 12, fontWeight: 700, cursor: (briefing||loading) ? 'default' : 'pointer', fontFamily: 'inherit', letterSpacing: '0.06em', opacity: (briefing||loading) ? 0.7 : 1, textTransform: 'uppercase', transition: 'all 0.2s' }}>
            {briefing
              ? <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />Briefing...</>
              : <><Activity size={12} />Business Update</>
            }
          </button>
        </div>
      </div>

      {/* ── Live metric cards ── */}
      <div style={{ background: '#faf9f7', borderLeft: '1px solid #f0ebe3', borderRight: '1px solid #f0ebe3', padding: '16px 20px', flexShrink: 0 }}>
        <div className="ai-cards" style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 2 }}>
          <MetricCard icon={IndianRupee} label="Revenue Today"   value={'Rs.' + fmt(m?.revenue?.today)}        sub={'Month: Rs.' + fmt(m?.revenue?.this_month)}  accent="#10b981" />
          <MetricCard icon={ShoppingBag} label="Orders Today"    value={m?.orders?.today ?? '—'}               sub={fmt(m?.orders?.pending) + ' pending'}        accent="#c9a96e" />
          <MetricCard icon={Users}       label="New Users Today" value={m?.users?.new_today ?? '—'}            sub={'Total: ' + fmt(m?.users?.total)}             accent="#8b5cf6" />
          <MetricCard icon={Package}     label="Low Stock"       value={m?.inventory?.low_stock ?? '—'}        sub={(m?.inventory?.out_of_stock ?? '—') + ' out of stock'} accent="#ef4444" />
          <MetricCard icon={TrendingUp}  label="Profit Est."     value={'Rs.' + fmt(m?.revenue?.profit_estimate)} sub={'Expenses: Rs.' + fmt(m?.revenue?.expenses_month)} accent="#3b82f6" />
          <MetricCard icon={Wifi}        label="Online Now"      value={m?.active_sessions ?? '—'}            sub={m?.utm?.clicks_today != null ? 'UTM clicks: ' + m.utm.clicks_today : 'Active sessions'} accent="#14b8a6" />
        </div>
      </div>

      {/* ── Messages ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 8px', display: 'flex', flexDirection: 'column', gap: 20, background: '#fff', borderLeft: '1px solid #f0ebe3', borderRight: '1px solid #f0ebe3' }}>
        {messages.map(msg => (
          <Message
            key={msg.id} msg={msg}
            speaking={speakId === msg.id}
            onSpeak={text => handleSpeak(text, msg.id)}
            onStop={handleStop}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* ── Quick chips ── */}
      <div style={{ background: '#fff', borderLeft: '1px solid #f0ebe3', borderRight: '1px solid #f0ebe3', borderTop: '1px solid #f9fafb', padding: '10px 20px', overflowX: 'auto', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'nowrap' }}>
          {QUICK.map(q => (
            <button key={q} className="ai-quick" onClick={() => send(q)} disabled={loading || briefing}
              style={{ flexShrink: 0, padding: '6px 14px', borderRadius: 20, border: '1px solid #e5e7eb', background: '#fff', fontSize: 12, color: '#6b7280', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* ── Input bar ── */}
      <div style={{ background: '#fff', borderRadius: '0 0 16px 16px', border: '1px solid #f0ebe3', borderTop: '2px solid #f0ebe3', padding: '14px 20px 16px', flexShrink: 0, display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        {/* Mic */}
        <button
          onClick={listening ? () => { recogRef.current?.stop(); setListening(false); } : startListen}
          style={{ width: 42, height: 42, borderRadius: 12, border: '1.5px solid ' + (listening ? '#ef4444' : '#e5e7eb'), background: listening ? '#fef2f2' : '#f9fafb', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}>
          {listening ? <MicOff size={16} color="#ef4444" /> : <Mic size={16} color="#9ca3af" />}
        </button>

        {/* Input */}
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={listening ? '🎙 Listening...' : 'Ask anything — revenue, orders, UTM, inventory...'}
          rows={1}
          style={{ flex: 1, padding: '11px 16px', fontSize: 13, border: '1.5px solid #e5e7eb', borderRadius: 12, outline: 'none', fontFamily: 'inherit', color: '#111827', background: '#fff', resize: 'none', lineHeight: 1.6, boxSizing: 'border-box', maxHeight: 110, overflowY: 'auto', letterSpacing: '0.01em', transition: 'border-color 0.2s' }}
          onFocus={e => e.target.style.borderColor = '#c9a96e'}
          onBlur={e => e.target.style.borderColor = '#e5e7eb'}
        />

        {/* Send */}
        <button className="ai-send" onClick={() => send()} disabled={!input.trim() || loading || briefing}
          style={{ width: 42, height: 42, borderRadius: 12, border: 'none', background: input.trim() ? '#1a1a18' : '#f3f4f6', cursor: input.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.2s' }}>
          <Send size={16} color={input.trim() ? '#c9a96e' : '#d1d5db'} />
        </button>
      </div>
    </div>
  );
}
