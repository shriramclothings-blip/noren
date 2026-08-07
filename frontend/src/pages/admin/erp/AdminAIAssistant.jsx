import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Send, RefreshCw, Sparkles, TrendingUp, Users, ShoppingBag, Package, AlertTriangle, IndianRupee, Activity } from 'lucide-react';
import api from '../../../utils/api';
import toast from 'react-hot-toast';

// ── Voice synthesis — male voice ──────────────────────────────────────────────
function speak(text, onStart, onEnd) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang  = 'en-IN';
  utter.rate  = 0.95;
  utter.pitch = 0.85;  // lower = more masculine
  utter.volume = 1;

  // Pick best available male voice
  const voices = window.speechSynthesis.getVoices();
  const maleVoice = voices.find(v =>
    /male|man|david|mark|alex|james|daniel|google.*en.*male/i.test(v.name)
    && /en/i.test(v.lang)
  ) || voices.find(v => /en-IN/i.test(v.lang))
    || voices.find(v => /en/i.test(v.lang));

  if (maleVoice) utter.voice = maleVoice;

  utter.onstart = () => onStart?.();
  utter.onend   = () => onEnd?.();
  utter.onerror = () => onEnd?.();

  window.speechSynthesis.speak(utter);
}

function stopSpeaking() {
  window.speechSynthesis?.cancel();
}

// ── Metric card ───────────────────────────────────────────────────────────────
function MetricCard({ icon: Icon, label, value, sub, color, bg }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #f3f4f6', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={16} color={color} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#111827', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{label}</div>
        {sub && <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────
function Bubble({ msg, isSpeaking, onSpeak, onStop }) {
  const isAI = msg.role === 'ai';
  return (
    <div style={{ display: 'flex', flexDirection: isAI ? 'row' : 'row-reverse', gap: 10, alignItems: 'flex-end', maxWidth: '85%', alignSelf: isAI ? 'flex-start' : 'flex-end' }}>
      {isAI && (
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#1a1a18,#c9a96e)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Sparkles size={14} color="#fff" />
        </div>
      )}
      <div style={{ background: isAI ? '#1a1a18' : '#c9a96e', color: '#fff', borderRadius: isAI ? '18px 18px 18px 4px' : '18px 18px 4px 18px', padding: '12px 16px', fontSize: 13, lineHeight: 1.6, position: 'relative' }}>
        {msg.loading ? (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '4px 0' }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(255,255,255,0.6)', animation: `bounce 1.2s ${i*0.2}s infinite` }} />
            ))}
          </div>
        ) : (
          <>
            <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.content}</p>
            {isAI && !msg.loading && (
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                {isSpeaking ? (
                  <button onClick={onStop}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, color: '#c9a96e', background: 'rgba(201,169,110,0.15)', border: 'none', padding: '4px 10px', borderRadius: 20, cursor: 'pointer' }}>
                    <VolumeX size={11} /> Stop
                  </button>
                ) : (
                  <button onClick={() => onSpeak(msg.content)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.1)', border: 'none', padding: '4px 10px', borderRadius: 20, cursor: 'pointer' }}>
                    <Volume2 size={11} /> Listen
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AdminAIAssistant() {
  const [messages,   setMessages]   = useState([{
    id: 0, role: 'ai',
    content: "Hello! I'm your NOREN AI assistant. I have live access to your business data — orders, revenue, users, inventory and more.\n\nTap \"Get Business Update\" for a full briefing, or ask me anything about your business.",
  }]);
  const [input,      setInput]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const [briefing,   setBriefing]   = useState(false);
  const [metrics,    setMetrics]    = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingId, setSpeakingId] = useState(null);
  const [voiceOn,    setVoiceOn]    = useState(true);
  const [listening,  setListening]  = useState(false);

  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load voices
  useEffect(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
  }, []);

  const handleSpeak = useCallback((text, msgId) => {
    if (!voiceOn) return;
    setIsSpeaking(true);
    setSpeakingId(msgId);
    speak(text, () => { setIsSpeaking(true); }, () => { setIsSpeaking(false); setSpeakingId(null); });
  }, [voiceOn]);

  const handleStop = useCallback(() => {
    stopSpeaking();
    setIsSpeaking(false);
    setSpeakingId(null);
  }, []);

  // ── Get business briefing ────────────────────────────────────────────────
  const getBrief = async () => {
    setBriefing(true);
    const loadId = Date.now();
    setMessages(prev => [...prev, { id: loadId, role: 'ai', content: '', loading: true }]);

    try {
      const res = await api.post('/erp/ai/brief');
      const { brief, metrics: m } = res.data;
      setMetrics(m);

      setMessages(prev => prev.map(msg =>
        msg.id === loadId ? { ...msg, content: brief, loading: false } : msg
      ));

      if (voiceOn) handleSpeak(brief, loadId);
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to get briefing. Check your Gemini API key in Render settings.';
      setMessages(prev => prev.map(msg =>
        msg.id === loadId ? { ...msg, content: errMsg, loading: false } : msg
      ));
      toast.error('AI error');
    } finally {
      setBriefing(false);
    }
  };

  // ── Send chat message ────────────────────────────────────────────────────
  const sendMessage = async (text) => {
    const q = (text || input).trim();
    if (!q) return;
    setInput('');

    const userMsgId = Date.now();
    const aiMsgId   = userMsgId + 1;

    setMessages(prev => [
      ...prev,
      { id: userMsgId, role: 'user', content: q },
      { id: aiMsgId,   role: 'ai',   content: '', loading: true },
    ]);
    setLoading(true);

    try {
      const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }));
      const res = await api.post('/erp/ai/chat', { message: q, history });
      const { response, metrics: m } = res.data;
      if (m) setMetrics(m);

      setMessages(prev => prev.map(msg =>
        msg.id === aiMsgId ? { ...msg, content: response, loading: false } : msg
      ));

      if (voiceOn) handleSpeak(response, aiMsgId);
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Something went wrong.';
      setMessages(prev => prev.map(msg =>
        msg.id === aiMsgId ? { ...msg, content: errMsg, loading: false } : msg
      ));
    } finally {
      setLoading(false);
    }
  };

  // ── Voice input ──────────────────────────────────────────────────────────
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { toast.error('Voice input not supported in this browser'); return; }

    const recognition = new SpeechRecognition();
    recognition.lang         = 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setListening(false);
      sendMessage(transcript);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend   = () => setListening(false);

    setListening(true);
    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const quickQuestions = [
    "How many orders today?",
    "What's my revenue this month?",
    "Which products are low on stock?",
    "How many new users registered today?",
    "What are my top selling products?",
    "What's my profit estimate?",
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', gap: 0 }}>
      <style>{`
        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-8px)} }
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:0.5} }
      `}</style>

      {/* ── Header ── */}
      <div style={{ background: 'linear-gradient(135deg, #1a1a18 0%, #2d2d2a 100%)', borderRadius: '16px 16px 0 0', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg,#c9a96e,#a8834a)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Sparkles size={22} color="#fff" />
          </div>
          <div>
            <p style={{ fontSize: 18, fontWeight: 800, color: '#faf9f7', margin: 0 }}>NOREN AI Assistant</p>
            <p style={{ fontSize: 12, color: 'rgba(250,249,247,0.5)', margin: '2px 0 0' }}>Powered by Google Gemini · Live business data</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {/* Voice toggle */}
          <button onClick={() => { if (voiceOn) handleStop(); setVoiceOn(v => !v); }}
            title={voiceOn ? 'Mute voice' : 'Enable voice'}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: `1.5px solid ${voiceOn ? '#c9a96e' : 'rgba(255,255,255,0.2)'}`, background: voiceOn ? 'rgba(201,169,110,0.15)' : 'transparent', color: voiceOn ? '#c9a96e' : 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {voiceOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
            {voiceOn ? 'Voice On' : 'Voice Off'}
          </button>

          {/* Business briefing button */}
          <button onClick={getBrief} disabled={briefing || loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 10, border: 'none', background: '#c9a96e', color: '#1a1a18', fontSize: 13, fontWeight: 700, cursor: briefing ? 'default' : 'pointer', opacity: briefing ? 0.7 : 1 }}>
            {briefing
              ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Briefing...</>
              : <><Activity size={14} /> Get Business Update</>
            }
          </button>
        </div>
      </div>

      {/* ── Live metrics strip ── */}
      {metrics && (
        <div style={{ background: '#f9fafb', borderLeft: '1px solid #f3f4f6', borderRight: '1px solid #f3f4f6', padding: '12px 16px', flexShrink: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
            <MetricCard icon={IndianRupee} label="Revenue Today"    value={`₹${Number(metrics.revenue?.today||0).toLocaleString('en-IN',{maximumFractionDigits:0})}`} sub="Combined"          color="#10b981" bg="#f0fdf4" />
            <MetricCard icon={ShoppingBag} label="Orders Today"     value={metrics.orders?.today||0}                                                                    sub={`${metrics.orders?.pending||0} pending`} color="#c9a96e" bg="#fff7ed" />
            <MetricCard icon={Users}       label="New Users Today"  value={metrics.users?.new_today||0}                                                                 sub={`${metrics.users?.total||0} total`}      color="#8b5cf6" bg="#f5f3ff" />
            <MetricCard icon={Package}     label="Out of Stock"     value={metrics.inventory?.out_of_stock||0}                                                          sub={`${metrics.inventory?.low_stock||0} low stock`} color="#ef4444" bg="#fef2f2" />
            <MetricCard icon={TrendingUp}  label="Revenue Month"    value={`₹${Number(metrics.revenue?.this_month||0).toLocaleString('en-IN',{maximumFractionDigits:0})}`} sub={`₹${Number(metrics.revenue?.profit_estimate||0).toLocaleString('en-IN',{maximumFractionDigits:0})} profit`} color="#3b82f6" bg="#eff6ff" />
            <MetricCard icon={Activity}    label="Online Now"       value={metrics.active_sessions||0}                                                                  sub="Active sessions"  color="#14b8a6" bg="#f0fdfa" />
          </div>
        </div>
      )}

      {/* ── Messages ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16, background: '#faf9f7', borderLeft: '1px solid #f3f4f6', borderRight: '1px solid #f3f4f6' }}>
        {messages.map(msg => (
          <Bubble
            key={msg.id}
            msg={msg}
            isSpeaking={speakingId === msg.id && isSpeaking}
            onSpeak={(text) => handleSpeak(text, msg.id)}
            onStop={handleStop}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* ── Quick questions ── */}
      <div style={{ background: '#fff', borderLeft: '1px solid #f3f4f6', borderRight: '1px solid #f3f4f6', borderTop: '1px solid #f3f4f6', padding: '10px 16px', flexShrink: 0, overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'nowrap' }}>
          {quickQuestions.map(q => (
            <button key={q} onClick={() => sendMessage(q)} disabled={loading || briefing}
              style={{ flexShrink: 0, padding: '6px 14px', borderRadius: 20, border: '1.5px solid #e5e7eb', background: '#fff', fontSize: 12, color: '#374151', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#c9a96e'; e.currentTarget.style.color = '#c9a96e'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.color = '#374151'; }}>
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* ── Input bar ── */}
      <div style={{ background: '#fff', borderRadius: '0 0 16px 16px', border: '1px solid #f3f4f6', borderTop: '2px solid #f3f4f6', padding: '14px 16px', flexShrink: 0, display: 'flex', gap: 10, alignItems: 'flex-end' }}>

        {/* Voice input */}
        <button
          onClick={listening ? stopListening : startListening}
          title={listening ? 'Stop listening' : 'Voice input'}
          style={{ width: 44, height: 44, borderRadius: 12, border: `2px solid ${listening ? '#ef4444' : '#e5e7eb'}`, background: listening ? '#fef2f2' : '#f9fafb', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, animation: listening ? 'pulse 1.5s infinite' : 'none' }}>
          {listening ? <MicOff size={18} color="#ef4444" /> : <Mic size={18} color="#6b7280" />}
        </button>

        {/* Text input */}
        <div style={{ flex: 1, position: 'relative' }}>
          {listening && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', paddingLeft: 14, pointerEvents: 'none', color: '#ef4444', fontSize: 13, fontStyle: 'italic' }}>
              🎙 Listening...
            </div>
          )}
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Ask anything — revenue, orders, users, inventory..."
            rows={1}
            style={{ width: '100%', padding: '11px 14px', fontSize: 13, border: '1.5px solid #e5e7eb', borderRadius: 12, outline: 'none', fontFamily: 'inherit', color: '#111827', background: listening ? 'transparent' : '#fff', resize: 'none', lineHeight: 1.5, boxSizing: 'border-box', maxHeight: 120, overflowY: 'auto' }}
            onFocus={e => e.target.style.borderColor = '#c9a96e'}
            onBlur={e => e.target.style.borderColor = '#e5e7eb'}
          />
        </div>

        {/* Send */}
        <button onClick={() => sendMessage()} disabled={!input.trim() || loading || briefing}
          style={{ width: 44, height: 44, borderRadius: 12, border: 'none', background: input.trim() ? '#1a1a18' : '#f3f4f6', cursor: input.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}>
          <Send size={18} color={input.trim() ? '#c9a96e' : '#9ca3af'} />
        </button>
      </div>
    </div>
  );
}
