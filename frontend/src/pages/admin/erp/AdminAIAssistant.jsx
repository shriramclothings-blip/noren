import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Send, Activity, RefreshCw,
         TrendingUp, ShoppingBag, Users, Package, IndianRupee, Wifi, ChevronDown, ChevronUp } from 'lucide-react';
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

// ── Animated AI Avatar ────────────────────────────────────────────────────────
// States: idle | loading | speaking
function AIAvatar({ state = 'idle', size = 38 }) {
  const isSpeaking = state === 'speaking';
  const isLoading  = state === 'loading';

  return (
    <div style={{ position: 'relative', flexShrink: 0, width: size, height: size }}>
      {/* Outer pulse rings when speaking */}
      {isSpeaking && <>
        <div style={{ position: 'absolute', inset: -6, borderRadius: '50%', border: '1.5px solid rgba(201,169,110,0.4)', animation: 'ring 1.4s ease-out infinite' }} />
        <div style={{ position: 'absolute', inset: -12, borderRadius: '50%', border: '1px solid rgba(201,169,110,0.2)', animation: 'ring 1.4s 0.4s ease-out infinite' }} />
      </>}

      {/* Main circle */}
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: 'linear-gradient(135deg, #1a1a18 0%, #2d2d2a 100%)',
        border: '2px solid ' + (isSpeaking ? '#c9a96e' : isLoading ? '#c9a96e88' : '#e5e7eb'),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: isSpeaking ? '0 0 0 3px rgba(201,169,110,0.2), 0 4px 16px rgba(0,0,0,0.15)' : '0 2px 8px rgba(0,0,0,0.08)',
        transition: 'border-color 0.3s, box-shadow 0.3s',
        position: 'relative', zIndex: 1,
      }}>
        {/* Sound wave bars when speaking */}
        {isSpeaking ? (
          <div style={{ display: 'flex', gap: 2, alignItems: 'center', height: 16 }}>
            {[0,1,2,3,4].map(i => (
              <div key={i} style={{
                width: 2.5, borderRadius: 2,
                background: '#c9a96e',
                animation: 'wave 0.8s ' + (i * 0.12) + 's ease-in-out infinite',
              }} />
            ))}
          </div>
        ) : isLoading ? (
          <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: '#c9a96e', animation: 'dot 1.2s ' + (i*0.2) + 's ease-in-out infinite' }} />
            ))}
          </div>
        ) : (
          <span style={{ fontSize: size * 0.34, fontWeight: 800, color: '#c9a96e', fontFamily: "'Cormorant Garamond', Georgia, serif", letterSpacing: '-0.02em', lineHeight: 1 }}>N</span>
        )}
      </div>
    </div>
  );
}

// ── Metric card ───────────────────────────────────────────────────────────────
function MetricCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f0ebe3', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8, position: 'relative', overflow: 'hidden', flex: '1 1 130px', minWidth: 120 }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2.5, background: accent }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
        <div style={{ width: 26, height: 26, borderRadius: 8, background: accent + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={12} color={accent} />
        </div>
      </div>
      <div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#111827', lineHeight: 1 }}>{value}</div>
        {sub && <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 3 }}>{sub}</div>}
      </div>
    </div>
  );
}

// ── Message ───────────────────────────────────────────────────────────────────
function Message({ msg, avatarState, onSpeak, onStop, speaking }) {
  const isAI = msg.role === 'ai';

  if (msg.loading) return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <AIAvatar state="loading" size={36} />
      <div style={{ background: '#faf9f7', borderRadius: '4px 16px 16px 16px', padding: '14px 18px', border: '1px solid #f0ebe3' }}>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center', height: 16 }}>
          {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#c9a96e', animation: 'dot 1.2s ' + (i*0.2) + 's ease-in-out infinite' }} />)}
        </div>
      </div>
    </div>
  );

  if (isAI) return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <AIAvatar state={speaking ? 'speaking' : 'idle'} size={36} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ background: '#faf9f7', borderRadius: '4px 16px 16px 16px', padding: '16px 20px', border: '1px solid #f0ebe3' }}>
          <p style={{ fontSize: 13.5, color: '#1a1a18', lineHeight: 1.85, margin: 0, fontWeight: 400, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {msg.content}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 6, paddingLeft: 2 }}>
          {speaking ? (
            <button onClick={onStop} style={actBtn}><VolumeX size={11}/> Stop</button>
          ) : (
            <button onClick={() => onSpeak(msg.content)} style={actBtn}><Volume2 size={11}/> Listen</button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ maxWidth: '70%', background: 'linear-gradient(135deg,#1a1a18,#2d2d2a)', borderRadius: '16px 4px 16px 16px', padding: '13px 18px' }}>
        <p style={{ fontSize: 13.5, color: '#faf9f7', lineHeight: 1.75, margin: 0, fontWeight: 300, wordBreak: 'break-word' }}>
          {msg.content}
        </p>
      </div>
    </div>
  );
}

const actBtn = {
  display: 'inline-flex', alignItems: 'center', gap: 5,
  fontSize: 11, color: '#b8a898', background: 'none',
  border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0,
};

const QUICK = [
  "Today's full update", 'Pending orders?', 'Revenue this month',
  'UTM performance', 'Low stock alerts', 'New users today',
  'Top products', 'Profit estimate',
];

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AdminAIAssistant() {
  const [messages,     setMessages]     = useState([{ id: 1, role: 'ai', content: "Good day. I'm NOREN AI — connected live to your store, orders, inventory, users, and marketing data.\n\nTap \"Business Update\" for your full briefing, or ask me anything." }]);
  const [input,        setInput]        = useState('');
  const [loading,      setLoading]      = useState(false);
  const [briefing,     setBriefing]     = useState(false);
  const [metrics,      setMetrics]      = useState(null);
  const [voiceOn,      setVoiceOn]      = useState(true);
  const [speakId,      setSpeakId]      = useState(null);
  const [listening,    setListening]    = useState(false);
  const [showMetrics,  setShowMetrics]  = useState(false); // collapsed by default

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
      setShowMetrics(true); // auto-expand when data arrives
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
    setMessages(prev => [...prev, { id: uid, role: 'user', content: q }, { id: aid, role: 'ai', content: '', loading: true }]);
    setLoading(true);
    try {
      const history = messages.slice(-8).map(m => ({ role: m.role, content: m.content }));
      const res = await api.post('/erp/ai/chat', { message: q, history });
      if (res.data.metrics) { setMetrics(res.data.metrics); setShowMetrics(true); }
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
    recogRef.current = r; setListening(true); r.start();
  };

  const m   = metrics;
  const fmt = v => Number(v||0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

  // current avatar state for the LAST ai message
  const lastAiId = [...messages].reverse().find(msg => msg.role === 'ai' && !msg.loading)?.id;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 108px)', minHeight: 520, borderRadius: 16, overflow: 'hidden', border: '1px solid #f0ebe3' }}>
      <style>{`
        @keyframes dot{0%,80%,100%{transform:translateY(0);opacity:.35}40%{transform:translateY(-5px);opacity:1}}
        @keyframes wave{0%,100%{height:4px}50%{height:16px}}
        @keyframes ring{0%{transform:scale(1);opacity:.7}100%{transform:scale(1.6);opacity:0}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .qi:hover{background:#fff7ed!important;border-color:#c9a96e!important;color:#92400e!important}
        @media(max-width:600px){
          .ai-hdr{flex-direction:column!important;align-items:flex-start!important;gap:12px!important}
          .ai-hdr-r{width:100%}
        }
      `}</style>

      {/* ── Header ── */}
      <div className="ai-hdr" style={{ background: 'linear-gradient(135deg,#1a1a18 0%,#2a2a26 100%)', padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexShrink: 0 }}>
        {/* Identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Large animated avatar in header */}
          <AIAvatar state={briefing || loading ? 'loading' : speakId ? 'speaking' : 'idle'} size={48} />
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#faf9f7', margin: 0, letterSpacing: '0.14em', textTransform: 'uppercase' }}>NOREN AI</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', animation: 'pulse 2s infinite' }} />
              <span style={{ fontSize: 10, color: 'rgba(250,249,247,0.4)', letterSpacing: '0.08em' }}>
                {briefing ? 'Generating briefing...' : loading ? 'Thinking...' : speakId ? 'Speaking...' : 'Live data connected'}
              </span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="ai-hdr-r" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button onClick={() => { handleStop(); setVoiceOn(v => !v); }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)', color: voiceOn ? '#c9a96e' : 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}>
            {voiceOn ? <Volume2 size={12}/> : <VolumeX size={12}/>}
            {voiceOn ? 'Voice On' : 'Voice Off'}
          </button>
          <button onClick={getBrief} disabled={briefing || loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 18px', borderRadius: 9, border: 'none', background: '#c9a96e', color: '#1a1a18', fontSize: 11, fontWeight: 700, cursor: (briefing||loading) ? 'default' : 'pointer', fontFamily: 'inherit', letterSpacing: '0.06em', opacity: (briefing||loading) ? 0.7 : 1, textTransform: 'uppercase', transition: 'all 0.2s' }}>
            {briefing ? <><RefreshCw size={11} style={{ animation: 'spin 1s linear infinite' }}/> Briefing...</> : <><Activity size={11}/> Update</>}
          </button>
        </div>
      </div>

      {/* ── Metric cards — collapsible ── */}
      <div style={{ background: '#faf9f7', borderBottom: '1px solid #f0ebe3', flexShrink: 0 }}>
        {/* Toggle row */}
        <button onClick={() => setShowMetrics(s => !s)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
          <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            {m ? 'Live Metrics' : 'Live Metrics (tap Update to load)'}
          </span>
          {showMetrics ? <ChevronUp size={13} color="#9ca3af"/> : <ChevronDown size={13} color="#9ca3af"/>}
        </button>

        {showMetrics && m && (
          <div style={{ padding: '0 16px 14px', display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 14 }}>
            <MetricCard icon={IndianRupee} label="Revenue Today"   value={'Rs.' + fmt(m.revenue?.today)}           sub={'Month Rs.' + fmt(m.revenue?.this_month)}     accent="#10b981" />
            <MetricCard icon={ShoppingBag} label="Orders Today"    value={m.orders?.today ?? '—'}                   sub={fmt(m.orders?.pending) + ' pending'}          accent="#c9a96e" />
            <MetricCard icon={Users}       label="New Users"        value={m.users?.new_today ?? '—'}               sub={'Total ' + fmt(m.users?.total)}               accent="#8b5cf6" />
            <MetricCard icon={Package}     label="Low Stock"        value={m.inventory?.low_stock ?? '—'}           sub={(m.inventory?.out_of_stock ?? '—') + ' out'}  accent="#ef4444" />
            <MetricCard icon={TrendingUp}  label="Profit Est."      value={'Rs.' + fmt(m.revenue?.profit_estimate)} sub={'Exp Rs.' + fmt(m.revenue?.expenses_month)}   accent="#3b82f6" />
            <MetricCard icon={Wifi}        label="Online Now"       value={m.active_sessions ?? '—'}               sub={m.utm?.clicks_today != null ? 'UTM: ' + m.utm.clicks_today + ' clicks' : 'Active sessions'} accent="#14b8a6" />
          </div>
        )}
      </div>

      {/* ── Messages — takes all available space ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px 12px', display: 'flex', flexDirection: 'column', gap: 18, background: '#fff' }}>
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
      <div style={{ background: '#fff', borderTop: '1px solid #f9fafb', padding: '8px 20px', overflowX: 'auto', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'nowrap' }}>
          {QUICK.map(q => (
            <button key={q} className="qi" onClick={() => send(q)} disabled={loading || briefing}
              style={{ flexShrink: 0, padding: '5px 13px', borderRadius: 20, border: '1px solid #e5e7eb', background: '#fff', fontSize: 11.5, color: '#6b7280', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* ── Input ── */}
      <div style={{ background: '#fff', borderTop: '1.5px solid #f0ebe3', padding: '12px 20px 16px', flexShrink: 0, display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <button onClick={listening ? () => { recogRef.current?.stop(); setListening(false); } : startListen}
          style={{ width: 40, height: 40, borderRadius: 11, border: '1.5px solid ' + (listening ? '#ef4444' : '#e5e7eb'), background: listening ? '#fef2f2' : '#f9fafb', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}>
          {listening ? <MicOff size={15} color="#ef4444"/> : <Mic size={15} color="#9ca3af"/>}
        </button>

        <textarea ref={inputRef} value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();} }}
          placeholder={listening ? '🎙 Listening...' : 'Ask about revenue, orders, UTM, inventory, users...'}
          rows={1}
          style={{ flex:1, padding:'10px 14px', fontSize:13, border:'1.5px solid #e5e7eb', borderRadius:11, outline:'none', fontFamily:'inherit', color:'#111827', background:'#fff', resize:'none', lineHeight:1.6, boxSizing:'border-box', maxHeight:100, overflowY:'auto', transition:'border-color 0.2s' }}
          onFocus={e=>e.target.style.borderColor='#c9a96e'}
          onBlur={e=>e.target.style.borderColor='#e5e7eb'}
        />

        <button onClick={()=>send()} disabled={!input.trim()||loading||briefing}
          style={{ width:40, height:40, borderRadius:11, border:'none', background:input.trim()?'#1a1a18':'#f3f4f6', cursor:input.trim()?'pointer':'default', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'background 0.2s' }}>
          <Send size={15} color={input.trim()?'#c9a96e':'#d1d5db'}/>
        </button>
      </div>
    </div>
  );
}
