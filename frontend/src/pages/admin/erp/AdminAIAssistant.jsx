import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Send, Activity, RefreshCw } from 'lucide-react';
import api from '../../../utils/api';
import toast from 'react-hot-toast';

// ── Voice ─────────────────────────────────────────────────────────────────────
function speak(text, onEnd) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter    = new SpeechSynthesisUtterance(text);
  utter.lang     = 'en-IN';
  utter.rate     = 0.93;
  utter.pitch    = 0.8;
  utter.volume   = 1;
  const voices   = window.speechSynthesis.getVoices();
  const male     = voices.find(v => /male|david|mark|daniel|james/i.test(v.name) && /en/i.test(v.lang))
                || voices.find(v => /en-IN/i.test(v.lang))
                || voices.find(v => /en/i.test(v.lang));
  if (male) utter.voice = male;
  utter.onend   = onEnd;
  utter.onerror = onEnd;
  window.speechSynthesis.speak(utter);
}

// ── Stat pill ─────────────────────────────────────────────────────────────────
function Stat({ label, value }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 18, fontWeight: 700, color: '#111827', lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
    </div>
  );
}

// ── Message ───────────────────────────────────────────────────────────────────
function Message({ msg, onSpeak, onStop, speaking }) {
  const isAI = msg.role === 'ai';

  if (msg.loading) {
    return (
      <div style={{ display: 'flex', gap: 12, alignSelf: 'flex-start', maxWidth: '70%' }}>
        <div style={{ width: 2, background: '#c9a96e', borderRadius: 2, flexShrink: 0, alignSelf: 'stretch' }} />
        <div style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '14px 0' }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: '#c9a96e',
              animation: 'dot 1.2s ' + (i * 0.2) + 's ease-in-out infinite' }} />
          ))}
        </div>
      </div>
    );
  }

  if (isAI) {
    return (
      <div style={{ display: 'flex', gap: 12, alignSelf: 'flex-start', maxWidth: '78%' }}>
        <div style={{ width: 2, background: '#c9a96e', borderRadius: 2, flexShrink: 0, marginTop: 4 }} />
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#c9a96e', letterSpacing: '0.14em',
            textTransform: 'uppercase', margin: '0 0 8px' }}>NOREN AI</p>
          <p style={{ fontSize: 14, color: '#111827', lineHeight: 1.75, margin: 0,
            fontWeight: 300, letterSpacing: '0.01em', whiteSpace: 'pre-wrap' }}>{msg.content}</p>
          <div style={{ marginTop: 10, display: 'flex', gap: 12 }}>
            {speaking ? (
              <button onClick={onStop} style={ghostBtn}>
                <VolumeX size={11} /> Stop
              </button>
            ) : (
              <button onClick={() => onSpeak(msg.content)} style={ghostBtn}>
                <Volume2 size={11} /> Listen
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ alignSelf: 'flex-end', maxWidth: '60%' }}>
      <p style={{ fontSize: 13, color: '#374151', background: '#f9fafb', padding: '10px 16px',
        borderRadius: '12px 12px 2px 12px', margin: 0, lineHeight: 1.6, fontWeight: 400 }}>
        {msg.content}
      </p>
    </div>
  );
}

const ghostBtn = {
  display: 'inline-flex', alignItems: 'center', gap: 5,
  fontSize: 11, color: '#9ca3af', background: 'none',
  border: 'none', cursor: 'pointer', padding: '2px 0',
  fontFamily: 'inherit', letterSpacing: '0.04em',
};

// ── Quick chips ───────────────────────────────────────────────────────────────
const QUICK = [
  'Give me today\'s update',
  'How many orders are pending?',
  'What\'s my revenue this month?',
  'Which UTM link has most clicks?',
  'Any low stock alerts?',
  'How many new users today?',
  'What are top selling products?',
  'What\'s my profit estimate?',
];

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AdminAIAssistant() {
  const [messages,  setMessages]  = useState([{
    id: 1, role: 'ai',
    content: 'Good day. I\'m your NOREN AI — connected live to your business data.\n\nAsk me anything about your orders, revenue, users, inventory, or marketing performance. Or tap "Business Update" for a full briefing.',
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  // Brief
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

  // Chat
  const send = async (text) => {
    const q = (text || input).trim();
    if (!q || loading || briefing) return;
    setInput('');
    const uid = Date.now();
    const aid = uid + 1;
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

  // Voice input
  const startListen = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast.error('Voice input not supported in this browser'); return; }
    const r = new SR();
    r.lang = 'en-IN'; r.interimResults = false;
    r.onresult = e => { setListening(false); send(e.results[0][0].transcript); };
    r.onerror  = () => setListening(false);
    r.onend    = () => setListening(false);
    recogRef.current = r;
    setListening(true);
    r.start();
  };

  const m = metrics;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 108px)', background: '#fff', borderRadius: 16, border: '1px solid #f3f4f6', overflow: 'hidden' }}>
      <style>{`
        @keyframes dot { 0%,80%,100%{transform:translateY(0);opacity:.4} 40%{transform:translateY(-6px);opacity:1} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.3} }
      `}</style>

      {/* ── Top bar ── */}
      <div style={{ padding: '18px 28px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            NOREN AI
          </p>
          <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0', letterSpacing: '0.02em' }}>
            Live business intelligence
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={() => { if (!voiceOn) return; handleStop(); setVoiceOn(false); if (voiceOn) setVoiceOn(true); setVoiceOn(v => !v); }}
            style={{ ...topBtn, color: voiceOn ? '#111827' : '#d1d5db', borderColor: voiceOn ? '#e5e7eb' : '#f3f4f6' }}>
            {voiceOn ? <Volume2 size={13} /> : <VolumeX size={13} />}
            <span style={{ fontSize: 11 }}>{voiceOn ? 'Voice on' : 'Voice off'}</span>
          </button>

          <button onClick={getBrief} disabled={briefing || loading} style={{ ...primaryBtn, opacity: (briefing || loading) ? 0.6 : 1 }}>
            {briefing
              ? <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> Briefing...</>
              : <><Activity size={12} /> Business Update</>
            }
          </button>
        </div>
      </div>

      {/* ── Stats bar (only when metrics loaded) ── */}
      {m && (
        <div style={{ padding: '14px 28px', borderBottom: '1px solid #f9fafb', display: 'flex', gap: 32, flexShrink: 0, overflowX: 'auto' }}>
          <Stat label="Revenue today"  value={'Rs.' + Number(m.revenue?.today||0).toLocaleString('en-IN', { maximumFractionDigits: 0 })} />
          <Stat label="Orders today"   value={m.orders?.today || 0} />
          <Stat label="Pending"        value={m.orders?.pending || 0} />
          <Stat label="New users"      value={m.users?.new_today || 0} />
          <Stat label="Low stock"      value={m.inventory?.low_stock || 0} />
          <Stat label="Online now"     value={m.active_sessions || 0} />
          {m.utm?.total_links > 0 && <Stat label="UTM clicks today" value={m.utm.clicks_today || 0} />}
          {m.utm?.total_links > 0 && <Stat label="Top source"       value={m.utm.top_source || '—'} />}
        </div>
      )}

      {/* ── Messages ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 28px 12px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {messages.map(msg => (
          <Message
            key={msg.id}
            msg={msg}
            speaking={speakId === msg.id}
            onSpeak={text => handleSpeak(text, msg.id)}
            onStop={handleStop}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* ── Quick chips ── */}
      <div style={{ padding: '8px 28px', borderTop: '1px solid #f9fafb', overflowX: 'auto', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'nowrap' }}>
          {QUICK.map(q => (
            <button key={q} onClick={() => send(q)} disabled={loading || briefing}
              style={{ flexShrink: 0, padding: '5px 14px', borderRadius: 20, border: '1px solid #e5e7eb', background: '#fff', fontSize: 12, color: '#6b7280', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#c9a96e'; e.currentTarget.style.color = '#92400e'; e.currentTarget.style.background = '#fff7ed'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.color = '#6b7280'; e.currentTarget.style.background = '#fff'; }}>
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* ── Input ── */}
      <div style={{ padding: '12px 28px 20px', borderTop: '1px solid #f3f4f6', display: 'flex', gap: 10, alignItems: 'flex-end', flexShrink: 0 }}>
        <button onClick={listening ? () => { recogRef.current?.stop(); setListening(false); } : startListen}
          style={{ width: 40, height: 40, borderRadius: 10, border: '1.5px solid ' + (listening ? '#ef4444' : '#e5e7eb'), background: listening ? '#fef2f2' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, animation: listening ? 'blink 1s infinite' : 'none' }}>
          {listening ? <MicOff size={15} color="#ef4444" /> : <Mic size={15} color="#9ca3af" />}
        </button>

        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={listening ? 'Listening...' : 'Ask anything about your business...'}
          rows={1}
          style={{ flex: 1, padding: '10px 14px', fontSize: 13, border: '1.5px solid #e5e7eb', borderRadius: 10, outline: 'none', fontFamily: 'inherit', color: '#111827', background: '#fff', resize: 'none', lineHeight: 1.6, boxSizing: 'border-box', maxHeight: 100, overflowY: 'auto', letterSpacing: '0.01em' }}
          onFocus={e => e.target.style.borderColor = '#c9a96e'}
          onBlur={e => e.target.style.borderColor = '#e5e7eb'}
        />

        <button onClick={() => send()} disabled={!input.trim() || loading || briefing}
          style={{ width: 40, height: 40, borderRadius: 10, border: 'none', background: input.trim() ? '#111827' : '#f3f4f6', cursor: input.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.2s' }}>
          <Send size={15} color={input.trim() ? '#c9a96e' : '#d1d5db'} />
        </button>
      </div>
    </div>
  );
}

const topBtn = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '7px 14px', borderRadius: 8, border: '1.5px solid #e5e7eb',
  background: '#fff', cursor: 'pointer', fontFamily: 'inherit',
  fontWeight: 500, transition: 'all 0.15s',
};

const primaryBtn = {
  display: 'inline-flex', alignItems: 'center', gap: 7,
  padding: '8px 18px', borderRadius: 8, border: 'none',
  background: '#111827', color: '#c9a96e', fontSize: 12,
  fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  letterSpacing: '0.04em',
};
