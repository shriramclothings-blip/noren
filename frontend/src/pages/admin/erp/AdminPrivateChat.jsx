// ─── Instagram-style Internal Communications Hub ─────────────────────────────
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, Send, X, Paperclip, Pin, Star, Reply,
  Edit2, Trash2, MoreHorizontal, Check, CheckCheck,
  Phone, Video, Mic, MicOff, VideoOff, MonitorUp,
  PhoneOff, Plus, Copy, MessageCircle, ArrowLeft,
  Clock, Image, FileText, ChevronDown,
} from 'lucide-react';
import api from '../../../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL
  || (import.meta.env.VITE_API_URL || '').replace('/api', '')
  || window.location.origin;
const STUN = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] };
const QUICK_EMOJIS = ['❤️','😂','😮','😢','😡','👍'];
const COLORS = ['#c9a96e','#3b82f6','#8b5cf6','#22c55e','#ef4444','#f59e0b','#06b6d4','#ec4899'];
const getColor = n => COLORS[(n?.charCodeAt(0) || 0) % COLORS.length];

// ── helpers ───────────────────────────────────────────────────────────────────
const fmtTime = iso => iso ? new Date(iso).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true}) : '';
const fmtShort = iso => {
  if (!iso) return '';
  const d = new Date(iso), now = new Date(), diff = now - d;
  if (diff < 60000) return 'now';
  if (diff < 3600000) return `${Math.floor(diff/60000)}m`;
  if (d.toDateString() === now.toDateString()) return fmtTime(iso);
  return d.toLocaleDateString('en-IN',{day:'2-digit',month:'short'});
};
const fmtDateDiv = iso => {
  if (!iso) return '';
  const d = new Date(iso), now = new Date();
  const y = new Date(now); y.setDate(now.getDate()-1);
  if (d.toDateString() === now.toDateString()) return 'Today';
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-IN',{weekday:'long',day:'2-digit',month:'long'});
};
const sameDay = (a,b) => new Date(a).toDateString() === new Date(b).toDateString();
const fmtDur = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
const isImgUrl = url => url && /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url);

// ── Avatar ────────────────────────────────────────────────────────────────────
function Av({ name, size=36, online, src }) {
  return (
    <div style={{ position:'relative', flexShrink:0 }}>
      {src
        ? <img src={src} alt={name} style={{ width:size, height:size, borderRadius:'50%', objectFit:'cover', display:'block' }} />
        : <div style={{ width:size, height:size, borderRadius:'50%', background:getColor(name),
            display:'flex', alignItems:'center', justifyContent:'center',
            color:'#fff', fontWeight:700, fontSize:Math.round(size*0.38), userSelect:'none' }}>
            {(name||'?')[0].toUpperCase()}
          </div>
      }
      {online !== undefined && (
        <span style={{ position:'absolute', bottom:1, right:1, width:size>30?10:7, height:size>30?10:7,
          borderRadius:'50%', background: online ? '#22c55e' : '#9ca3af', border:'2px solid #fff' }} />
      )}
    </div>
  );
}

// ── Read ticks ────────────────────────────────────────────────────────────────
function Ticks({ status, isOwn }) {
  if (!isOwn) return null;
  if (status==='read')      return <CheckCheck size={13} color="#60a5fa" style={{flexShrink:0}} />;
  if (status==='delivered') return <CheckCheck size={13} color="#9ca3af" style={{flexShrink:0}} />;
  return <Check size={13} color="#9ca3af" style={{flexShrink:0}} />;
}

// ── Typing dots ───────────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:4, padding:'8px 14px 4px' }}>
      {[0,1,2].map(i=>(
        <span key={i} style={{
          width:7, height:7, borderRadius:'50%', background:'#9ca3af',
          display:'inline-block',
          animation:`typingBounce 1.2s ${i*0.18}s ease-in-out infinite`
        }} />
      ))}
    </div>
  );
}

// ── Reaction row ──────────────────────────────────────────────────────────────
function Reactions({ reactions, onToggle }) {
  if (!reactions?.length) return null;
  const g = reactions.reduce((a,r)=>{ a[r.emoji]=(a[r.emoji]||0)+1; return a; },{});
  return (
    <div style={{ display:'flex', gap:3, flexWrap:'wrap', marginTop:3 }}>
      {Object.entries(g).map(([e,c])=>(
        <button key={e} onClick={()=>onToggle(e)}
          style={{ background:'rgba(0,0,0,0.06)', border:'1px solid rgba(0,0,0,0.08)',
            borderRadius:12, padding:'1px 7px', fontSize:12, cursor:'pointer',
            display:'flex', alignItems:'center', gap:3 }}>
          {e}{c>1&&<span style={{fontSize:10,color:'#6b7280'}}>{c}</span>}
        </button>
      ))}
    </div>
  );
}

// ── Emoji hover bar ───────────────────────────────────────────────────────────
function EmojiBar({ onPick, onMore, isOwn }) {
  return (
    <div style={{
      position:'absolute', zIndex:30, top:-42,
      ...(isOwn ? {right:0} : {left:0}),
      display:'flex', alignItems:'center', gap:1,
      background:'#fff', border:'1px solid #e5e7eb',
      borderRadius:20, padding:'3px 6px',
      boxShadow:'0 4px 18px rgba(0,0,0,0.14)', whiteSpace:'nowrap',
    }}>
      {QUICK_EMOJIS.map(e=>(
        <button key={e} onClick={()=>onPick(e)}
          style={{ background:'none', border:'none', cursor:'pointer', fontSize:18,
            padding:'1px 3px', borderRadius:6, transition:'transform 0.1s',
            lineHeight:1 }}
          onMouseEnter={ev=>{ev.currentTarget.style.transform='scale(1.3)';}}
          onMouseLeave={ev=>{ev.currentTarget.style.transform='scale(1)';}}>
          {e}
        </button>
      ))}
      <button onClick={onMore}
        style={{ background:'none', border:'none', cursor:'pointer',
          color:'#9ca3af', display:'flex', alignItems:'center', padding:'1px 3px' }}>
        <Plus size={13} />
      </button>
    </div>
  );
}

// ── Context menu ──────────────────────────────────────────────────────────────
function CtxMenu({ x, y, msg, isOwn, onClose, on }) {
  const ref = useRef(null);
  useEffect(()=>{
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', fn);
    return ()=>document.removeEventListener('mousedown', fn);
  },[onClose]);

  const Row = ({ icon, label, danger, action }) => (
    <button onClick={()=>{ action(); onClose(); }}
      style={{ display:'flex', alignItems:'center', gap:9, width:'100%',
        padding:'9px 14px', background:'none', border:'none', cursor:'pointer',
        fontSize:13, color:danger?'#ef4444':'#111827', textAlign:'left' }}
      onMouseEnter={e=>{e.currentTarget.style.background='#f3f4f6';}}
      onMouseLeave={e=>{e.currentTarget.style.background='none';}}>
      {icon}{label}
    </button>
  );

  return (
    <div ref={ref} onClick={e=>e.stopPropagation()}
      style={{ position:'fixed', left:x, top:y, zIndex:9990,
        minWidth:190, background:'#fff', border:'1px solid #e5e7eb',
        borderRadius:10, boxShadow:'0 8px 32px rgba(0,0,0,0.15)', padding:'4px 0' }}>
      <Row icon={<Reply size={14}/>}    label="Reply"          action={on.reply} />
      <Row icon={<Copy size={14}/>}     label="Copy Text"
        action={()=>{navigator.clipboard?.writeText(msg.message||'');toast.success('Copied');}} />
      {isOwn&&<Row icon={<Edit2 size={14}/>}  label="Edit Message"   action={on.edit} />}
      <Row icon={<Pin size={14}/>}      label={msg.is_pinned?'Unpin':'Pin'} action={on.pin} />
      <Row icon={<Star size={14}/>}     label="Star Message"   action={on.star} />
      <div style={{height:1,background:'#f3f4f6',margin:'3px 0'}} />
      <Row icon={<Trash2 size={14}/>}   label="Delete for Me"  danger action={on.delMe} />
      {isOwn&&<Row icon={<Trash2 size={14}/>} label="Unsend Message" danger action={on.delAll} />}
    </div>
  );
}

// ── Incoming call modal ───────────────────────────────────────────────────────
function IncomingModal({ call, onAccept, onReject }) {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:99999,
      background:'rgba(0,0,0,0.72)', backdropFilter:'blur(6px)',
      display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'#1a1a2e', borderRadius:24, padding:'40px 48px',
        textAlign:'center', minWidth:300,
        boxShadow:'0 24px 80px rgba(0,0,0,0.5)',
        border:'1px solid rgba(255,255,255,0.08)',
        animation:'slideUp 0.25s ease' }}>
        <Av name={call.caller_name} size={80} />
        <div style={{fontSize:20,fontWeight:700,color:'#fff',marginTop:18}}>{call.caller_name}</div>
        <div style={{fontSize:13,color:'#9ca3af',marginBottom:36,marginTop:6}}>
          Incoming {call.call_type==='video'?'video':'voice'} call…
        </div>
        <div style={{display:'flex',gap:24,justifyContent:'center'}}>
          <button onClick={onReject}
            style={{ background:'#ef4444', border:'none', borderRadius:'50%',
              width:62, height:62, cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:'0 4px 18px rgba(239,68,68,0.45)' }}>
            <PhoneOff size={26} color="#fff" />
          </button>
          <button onClick={onAccept}
            style={{ background:'#22c55e', border:'none', borderRadius:'50%',
              width:62, height:62, cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:'0 4px 18px rgba(34,197,94,0.45)' }}>
            {call.call_type==='video' ? <Video size={26} color="#fff"/> : <Phone size={26} color="#fff"/>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Call overlay ──────────────────────────────────────────────────────────────
function CallOverlay({ remote, type, status, dur, micMuted, camOff,
  onMic, onCam, onScreen, onEnd, localRef, remoteRef }) {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:99998, background:'#000', display:'flex', flexDirection:'column' }}>
      {type==='video' ? (
        <>
          <video ref={remoteRef} autoPlay playsInline
            style={{ flex:1, objectFit:'cover', width:'100%', background:'#111' }} />
          <video ref={localRef} autoPlay muted playsInline
            style={{ position:'absolute', bottom:96, right:16, width:128, height:96,
              borderRadius:12, objectFit:'cover',
              border:'2px solid rgba(255,255,255,0.25)', background:'#1f2937' }} />
        </>
      ) : (
        <div style={{ flex:1, display:'flex', flexDirection:'column',
          alignItems:'center', justifyContent:'center', background:'#1a1a2e' }}>
          <Av name={remote?.name} size={90} />
          <div style={{color:'#fff',fontWeight:700,fontSize:22,marginTop:20}}>{remote?.name}</div>
          <div style={{color:'#9ca3af',fontSize:14,marginTop:8,display:'flex',alignItems:'center',gap:6}}>
            {status==='ringing' ? <><Clock size={14}/>Ringing…</> : <><Clock size={14}/>{fmtDur(dur)}</>}
          </div>
        </div>
      )}
      {/* top bar */}
      <div style={{ position:'absolute', top:0, left:0, right:0,
        padding:'14px 20px', display:'flex', justifyContent:'space-between',
        background:'linear-gradient(rgba(0,0,0,0.5),transparent)' }}>
        <span style={{color:'#fff',fontWeight:700,fontSize:15}}>{remote?.name}</span>
        {status==='active'&&type==='video'&&(
          <span style={{color:'#fff',fontSize:12,background:'rgba(0,0,0,0.4)',
            padding:'3px 10px',borderRadius:8,display:'flex',alignItems:'center',gap:5}}>
            <Clock size={11}/>{fmtDur(dur)}
          </span>
        )}
      </div>
      {/* controls */}
      <div style={{ position:'absolute', bottom:0, left:0, right:0,
        display:'flex', justifyContent:'center', alignItems:'center', gap:16,
        padding:'16px 24px 32px',
        background:'linear-gradient(transparent,rgba(0,0,0,0.75))' }}>
        <Ctl onClick={onMic}    bg={micMuted?'#ef4444':'rgba(255,255,255,0.18)'} icon={micMuted?<MicOff size={18} color="#fff"/>:<Mic size={18} color="#fff"/>} />
        {type==='video'&&<>
          <Ctl onClick={onCam}    bg={camOff?'#ef4444':'rgba(255,255,255,0.18)'} icon={camOff?<VideoOff size={18} color="#fff"/>:<Video size={18} color="#fff"/>} />
          <Ctl onClick={onScreen} bg="rgba(255,255,255,0.18)" icon={<MonitorUp size={18} color="#fff"/>} />
        </>}
        <Ctl onClick={onEnd} bg="#ef4444" icon={<PhoneOff size={24} color="#fff"/>} sz={60}
          shadow="0 4px 20px rgba(239,68,68,0.5)" />
      </div>
    </div>
  );
}
function Ctl({ onClick, bg, icon, sz=48, shadow }) {
  return (
    <button onClick={onClick}
      style={{ background:bg, border:'none', borderRadius:'50%', width:sz, height:sz,
        cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
        boxShadow:shadow||'none', transition:'transform 0.1s' }}
      onMouseEnter={e=>{e.currentTarget.style.transform='scale(1.08)';}}
      onMouseLeave={e=>{e.currentTarget.style.transform='scale(1)';}}>
      {icon}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function AdminPrivateChat() {
  const { user } = useAuth();
  // refs
  const socketRef    = useRef(null);
  const endRef       = useRef(null);
  const fileRef      = useRef(null);
  const inputRef     = useRef(null);
  const typingTimer  = useRef(null);
  const listRef      = useRef(null);
  const longPress    = useRef(null);
  const pcRef        = useRef(null);
  const localStream  = useRef(null);
  const localVid     = useRef(null);
  const remoteVid    = useRef(null);
  const callIdRef    = useRef(null);
  const remoteIdRef  = useRef(null);
  const callTimer    = useRef(null);

  // thread list
  const [threads,      setThreads]     = useState([]);
  const [tLoading,     setTLoading]    = useState(true);
  const [tSearch,      setTSearch]     = useState('');
  const [showNew,      setShowNew]     = useState(false);
  const [uQ,           setUQ]          = useState('');
  const [uResults,     setUResults]    = useState([]);
  const [uSearching,   setUSearching]  = useState(false);

  // active thread
  const [active,       setActive]      = useState(null);
  const [msgs,         setMsgs]        = useState([]);
  const [mLoading,     setMLoading]    = useState(false);
  const [text,         setText]        = useState('');
  const [sending,      setSending]     = useState(false);
  const [replyTo,      setReplyTo]     = useState(null);
  const [editMsg,      setEditMsg]     = useState(null);
  const [hoveredId,    setHoveredId]   = useState(null);
  const [ctxMenu,      setCtxMenu]     = useState(null);
  const [atBottom,     setAtBottom]    = useState(true);
  const [mSearch,      setMSearch]     = useState('');
  const [showMSearch,  setShowMSearch] = useState(false);
  const [uploading,    setUploading]   = useState(false);

  // presence / typing
  const [online,       setOnline]      = useState(new Set());
  const [typing,       setTyping]      = useState({});
  const [unread,       setUnread]      = useState({});

  // drawers
  const [pinnedOpen,   setPinnedOpen]  = useState(false);
  const [pinned,       setPinned]      = useState([]);
  const [mediaOpen,    setMediaOpen]   = useState(false);
  const [mediaItems,   setMediaItems]  = useState([]);
  const [optOpen,      setOptOpen]     = useState(false);
  const [mutedSet,     setMutedSet]    = useState(new Set());
  const [archived,     setArchived]    = useState(new Set());

  // call
  const [incoming,     setIncoming]    = useState(null);
  const [inCall,       setInCall]      = useState(false);
  const [cStatus,      setCStatus]     = useState('');
  const [cType,        setCType]       = useState('audio');
  const [cRemote,      setCRemote]     = useState(null);
  const [micMuted,     setMicMuted]    = useState(false);
  const [camOff,       setCamOff]      = useState(false);
  const [cDur,         setCDur]        = useState(0);

  // mobile panel toggle
  const [mobileView,   setMobileView]  = useState('list'); // 'list' | 'chat'

  // ── Socket.IO setup ──────────────────────────────────────────────────────────
  useEffect(()=>{
    const token = localStorage.getItem('noren_token') || sessionStorage.getItem('noren_token');
    const socket = io(SOCKET_URL, { auth:{token}, transports:['websocket','polling'], reconnectionAttempts:8 });
    socketRef.current = socket;

    socket.on('user:online',  ({userId,name})=>setOnline(p=>new Set([...p,String(userId)])));
    socket.on('user:offline', ({userId})=>setOnline(p=>{const n=new Set(p);n.delete(String(userId));return n;}));
    // Populate the full online list when first connecting
    socket.on('user:list', (list)=>setOnline(new Set(list.map(u=>String(u.userId)))));

    socket.on('private:message', msg=>{
      setMsgs(prev=>prev.find(m=>m.id===msg.id)?prev:[...prev,msg]);
      setUnread(prev=>({...prev,[msg.thread_id]:(prev[msg.thread_id]||0)+(String(msg.sender_user_id)!==String(user?.id)?1:0)}));
      setThreads(prev=>prev.map(t=>t.id===msg.thread_id?{...t,last_message:msg.message,last_message_at:msg.created_at}:t));
    });

    socket.on('typing:start', ({userId,name,threadId})=>{
      if (String(userId)===String(user?.id)) return;
      // threadId comes from server payload; fallback to active thread is not needed
      // since we only listen in thread rooms
      const key = threadId ? `${threadId}_${userId}` : `global_${userId}`;
      setTyping(p=>({...p,[key]:name}));
    });
    socket.on('typing:stop', ({userId,threadId})=>{
      const key = threadId ? `${threadId}_${userId}` : `global_${userId}`;
      setTyping(p=>{const n={...p};delete n[key];return n;});
    });

    socket.on('message:read_receipt', ({thread_id})=>
      setMsgs(prev=>prev.map(m=>m.thread_id===thread_id&&String(m.sender_user_id)===String(user?.id)?{...m,status:'read'}:m)));
    socket.on('message:edited', ({message_id,new_message,edited_at})=>
      setMsgs(prev=>prev.map(m=>m.id===message_id?{...m,message:new_message,edited_at}:m)));
    socket.on('message:deleted_for_all', ({message_id})=>
      setMsgs(prev=>prev.map(m=>m.id===message_id?{...m,deleted_for_all:true,message:null}:m)));
    socket.on('message:reaction_added', ({message_id,user_id,emoji})=>
      setMsgs(prev=>prev.map(m=>m.id===message_id?{...m,reactions:[...(m.reactions||[]),{user_id,emoji}]}:m)));
    socket.on('message:reaction_removed', ({message_id,user_id,emoji})=>
      setMsgs(prev=>prev.map(m=>m.id===message_id?{...m,reactions:(m.reactions||[]).filter(r=>!(r.user_id===user_id&&r.emoji===emoji))}:m)));

    // call signalling
    socket.on('call:incoming', data=>{
      if (inCall){socket.emit('call:busy',{caller_id:data.caller_id,call_id:data.call_id});return;}
      setIncoming(data);
    });
    socket.on('call:accepted', ()=>{setCStatus('active');startCTimer();});
    socket.on('call:rejected', ()=>{toast.error('Call declined');endCallClean();});
    socket.on('call:ended',    ()=>{endCallClean();});
    socket.on('call:busy',     ()=>{toast.error('User is busy');endCallClean();});
    socket.on('call:offer', async({from_id,offer})=>{
      if (!pcRef.current) await setupPC(from_id);
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(offer));
      const ans = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(ans);
      socket.emit('call:answer',{target_id:from_id,answer:ans});
    });
    socket.on('call:answer', async({answer})=>{
      if (pcRef.current) await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
    });
    socket.on('call:ice-candidate', async({candidate})=>{
      try{if(pcRef.current&&candidate) await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));}catch{}
    });
    socket.on('call:ringing', ({call_id})=>{ callIdRef.current=call_id; });

    return ()=>{ socket.disconnect(); socketRef.current=null; endCallClean(true); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[user?.id]);

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(()=>{ if(atBottom) endRef.current?.scrollIntoView({behavior:'smooth'}); },[msgs,atBottom]);

  const handleScroll = useCallback(()=>{
    const el=listRef.current; if(!el) return;
    setAtBottom(el.scrollHeight-el.scrollTop-el.clientHeight<100);
  },[]);

  // ── Load threads ──────────────────────────────────────────────────────────
  const loadThreads = useCallback(async()=>{
    setTLoading(true);
    try{ const r=await api.get('/erp/communications/private-threads'); setThreads(r.data||[]); }
    catch{}finally{setTLoading(false);}
  },[]);
  useEffect(()=>{ loadThreads(); },[loadThreads]);

  // ── Open thread ───────────────────────────────────────────────────────────
  const openThread = useCallback(async(t)=>{
    setActive(t); setMLoading(true); setMsgs([]);
    setPinnedOpen(false); setMediaOpen(false);
    setShowMSearch(false); setMSearch('');
    setReplyTo(null); setEditMsg(null);
    setMobileView('chat');
    try{
      const r=await api.get(`/erp/communications/private-threads/${t.id}/messages`);
      setMsgs(r.data.messages||r.data||[]);
      socketRef.current?.emit('thread:join',{thread_id:t.id});
      await api.post(`/erp/communications/private-threads/${t.id}/read`);
      setUnread(p=>({...p,[t.id]:0}));
      socketRef.current?.emit('message:read',{thread_id:t.id,other_user_id:t.participant_id});
    }catch{}finally{setMLoading(false);}
  },[]);

  // ── User search ───────────────────────────────────────────────────────────
  const searchUsers = useCallback(async q=>{
    if(!q||q.length<2){setUResults([]);return;}
    setUSearching(true);
    try{ const r=await api.get(`/erp/communications/users/search?q=${encodeURIComponent(q)}`); setUResults(r.data||[]); }
    catch{}finally{setUSearching(false);}
  },[]);

  const startThread = useCallback(async(pid,pname)=>{
    try{
      const r=await api.post('/erp/communications/private-threads',{participant_id:pid});
      setShowNew(false); setUQ(''); setUResults([]);
      await loadThreads();
      openThread({...r.data.thread,participant_id:pid,participant_name:pname});
    }catch(e){toast.error(e.response?.data?.message||'Failed to start chat');}
  },[loadThreads,openThread]);

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMsg = useCallback(async()=>{
    if((!text.trim()&&!editMsg)||!active) return;
    setSending(true);
    const t=text.trim(); setText('');
    clearTimeout(typingTimer.current);
    socketRef.current?.emit('typing:stop',{thread_id:active.id});
    try{
      if(editMsg){
        await api.put(`/erp/communications/private-threads/${active.id}/messages/${editMsg.id}`,{message:t});
        socketRef.current?.emit('message:edit',{thread_id:active.id,message_id:editMsg.id,new_message:t});
        setMsgs(prev=>prev.map(m=>m.id===editMsg.id?{...m,message:t,edited_at:new Date().toISOString()}:m));
        setEditMsg(null);
      } else {
        const body={message:t,message_type:'text'};
        if(replyTo) body.reply_to_id=replyTo.id;
        const r=await api.post(`/erp/communications/private-threads/${active.id}/messages`,body);
        const msg=r.data.message||r.data;
        setMsgs(prev=>prev.find(m=>m.id===msg.id)?prev:[...prev,msg]);
        socketRef.current?.emit('private:send',{thread_id:active.id,message:t,message_type:'text'});
        setReplyTo(null);
        setThreads(prev=>prev.map(thr=>thr.id===active.id?{...thr,last_message:t,last_message_at:msg.created_at}:thr));
      }
    }catch{toast.error('Failed to send');setText(t);}
    finally{setSending(false);}
  },[text,active,editMsg,replyTo]);

  const handleKey = e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMsg();} };

  const handleTyping = val=>{
    setText(val);
    if(!active) return;
    socketRef.current?.emit('typing:start',{thread_id:active.id,name:user?.name});
    clearTimeout(typingTimer.current);
    typingTimer.current=setTimeout(()=>socketRef.current?.emit('typing:stop',{thread_id:active.id}),1800);
  };

  // ── File upload ───────────────────────────────────────────────────────────
  const handleFileChange = useCallback(async e=>{
    const file=e.target.files?.[0]; if(!file||!active) return;
    setUploading(true);
    try{
      const fd=new FormData(); fd.append('images',file);
      const up=await api.post(`/erp/communications/private-threads/${active.id}/upload`,fd,
        {headers:{'Content-Type':'multipart/form-data'}}).catch(async()=>{
        // fallback: send as attachment_url via sendPrivateMessage with file name only
        return {data:{url:URL.createObjectURL(file),name:file.name}};
      });
      const url=up.data?.url||up.data?.secure_url||'';
      if(!url){toast.error('Upload failed');return;}
      const r=await api.post(`/erp/communications/private-threads/${active.id}/messages`,
        {message:'',attachment_url:url,message_type:file.type.startsWith('image/')?'image':'file'});
      const msg=r.data.message||r.data;
      setMsgs(prev=>prev.find(m=>m.id===msg.id)?prev:[...prev,msg]);
    }catch{toast.error('Upload failed');}
    finally{setUploading(false); if(fileRef.current) fileRef.current.value='';}
  },[active]);

  // ── Message actions ───────────────────────────────────────────────────────
  const reactTo = useCallback((msgId,emoji)=>{
    socketRef.current?.emit('message:react',{thread_id:active?.id,message_id:msgId,emoji});
    setMsgs(prev=>prev.map(m=>{
      if(m.id!==msgId) return m;
      const rr=[...(m.reactions||[])];
      const idx=rr.findIndex(r=>r.user_id===user?.id&&r.emoji===emoji);
      if(idx>=0) rr.splice(idx,1); else rr.push({user_id:user?.id,user_name:user?.name,emoji});
      return{...m,reactions:rr};
    }));
  },[active,user?.id]);

  const delForMe  = useCallback(msg=>setMsgs(prev=>prev.filter(m=>m.id!==msg.id)),[]);
  const delForAll = useCallback(msg=>{
    socketRef.current?.emit('message:delete_for_all',{thread_id:active?.id,message_id:msg.id});
    setMsgs(prev=>prev.map(m=>m.id===msg.id?{...m,deleted_for_all:true,message:null}:m));
    api.delete(`/erp/communications/private-threads/${active?.id}/messages/${msg.id}/all`).catch(()=>{});
  },[active]);

  const pinMsg = useCallback(async msg=>{
    const p=!msg.is_pinned;
    try{
      await api.post(`/erp/communications/private-threads/${active.id}/messages/${msg.id}/pin`,{pin:p});
      setMsgs(prev=>prev.map(m=>m.id===msg.id?{...m,is_pinned:p}:m));
      if(p) setPinned(prev=>[...prev,{...msg,is_pinned:true}]);
      else  setPinned(prev=>prev.filter(m=>m.id!==msg.id));
      toast.success(p?'Message pinned':'Message unpinned');
    }catch{toast.error('Failed');}
  },[active]);

  const starMsg = useCallback(async msg=>{
    try{ await api.post(`/erp/communications/messages/${msg.id}/star`,{star:true}); toast.success('Starred'); }
    catch{toast.error('Failed');}
  },[]);

  const openCtx = useCallback((e,msg)=>{
    e.preventDefault(); e.stopPropagation();
    const x=Math.min(e.clientX,window.innerWidth-200);
    const y=Math.min(e.clientY,window.innerHeight-280);
    setCtxMenu({x,y,msg});
  },[]);

  const loadPinned = useCallback(async()=>{
    if(!active) return;
    try{ const r=await api.get(`/erp/communications/private-threads/${active.id}/pinned`); setPinned(r.data?.pinned_messages||r.data||[]); }
    catch{}
  },[active]);

  const loadMedia = useCallback(async()=>{
    if(!active) return;
    try{ const r=await api.get(`/erp/communications/private-threads/${active.id}/media`); setMediaItems(r.data?.media||r.data||[]); }
    catch{}
  },[active]);

  // ── WebRTC helpers ────────────────────────────────────────────────────────
  const setupPC = async remoteId=>{
    const ct=cType||'audio';
    const stream=await navigator.mediaDevices.getUserMedia({audio:true,video:ct==='video'});
    localStream.current=stream;
    if(localVid.current&&ct==='video') localVid.current.srcObject=stream;
    const pc=new RTCPeerConnection(STUN);
    pcRef.current=pc;
    stream.getTracks().forEach(t=>pc.addTrack(t,stream));
    pc.ontrack=e=>{if(remoteVid.current) remoteVid.current.srcObject=e.streams[0];};
    pc.onicecandidate=({candidate})=>{
      if(candidate) socketRef.current?.emit('call:ice-candidate',{target_id:remoteId,candidate});
    };
    pc.onconnectionstatechange=()=>{
      if(['failed','disconnected'].includes(pc.connectionState)){toast.error('Connection lost');endCallClean();}
    };
    return pc;
  };

  const startCall = async(tUser,type)=>{
    if(inCall) return toast.error('Already in a call');
    try{
      setCType(type); setCRemote(tUser); setInCall(true); setCStatus('ringing');
      await setupPC(tUser.id);
      const offer=await pcRef.current.createOffer();
      await pcRef.current.setLocalDescription(offer);
      remoteIdRef.current=tUser.id;
      socketRef.current?.emit('call:initiate',{callee_id:tUser.id,call_type:type,offer});
    }catch{toast.error(type==='video'?'Camera/mic access required':'Mic access required');endCallClean();}
  };

  const acceptCall = async()=>{
    if(!incoming) return;
    setCType(incoming.call_type||'audio');
    setCRemote({id:incoming.caller_id,name:incoming.caller_name});
    remoteIdRef.current=incoming.caller_id;
    setInCall(true); setCStatus('active'); setIncoming(null);
    startCTimer();
    socketRef.current?.emit('call:accept',{call_id:incoming.call_id,caller_id:incoming.caller_id});
  };

  const rejectCall = ()=>{
    if(!incoming) return;
    socketRef.current?.emit('call:reject',{call_id:incoming.call_id,caller_id:incoming.caller_id});
    setIncoming(null);
  };

  const endCall = ()=>{
    if(remoteIdRef.current)
      socketRef.current?.emit('call:end',{call_id:callIdRef.current,other_user_id:remoteIdRef.current,is_caller:true});
    endCallClean();
  };

  const endCallClean = (silent=false)=>{
    clearInterval(callTimer.current);
    setCDur(0); setInCall(false); setCStatus(''); setCRemote(null);
    setMicMuted(false); setCamOff(false);
    callIdRef.current=null; remoteIdRef.current=null;
    if(localStream.current){localStream.current.getTracks().forEach(t=>t.stop());localStream.current=null;}
    if(localVid.current)  localVid.current.srcObject=null;
    if(remoteVid.current) remoteVid.current.srcObject=null;
    if(pcRef.current){pcRef.current.close();pcRef.current=null;}
  };

  const startCTimer = ()=>{
    setCDur(0);
    callTimer.current=setInterval(()=>setCDur(d=>d+1),1000);
  };

  const toggleMic = ()=>{
    localStream.current?.getAudioTracks().forEach(t=>{t.enabled=micMuted;});
    setMicMuted(m=>!m);
  };
  const toggleCam = ()=>{
    localStream.current?.getVideoTracks().forEach(t=>{t.enabled=camOff;});
    setCamOff(c=>!c);
  };
  const shareScreen = async()=>{
    try{
      const ss=await navigator.mediaDevices.getDisplayMedia({video:true});
      const st=ss.getVideoTracks()[0];
      const sender=pcRef.current?.getSenders().find(s=>s.track?.kind==='video');
      if(sender) sender.replaceTrack(st);
      st.onended=()=>{const cam=localStream.current?.getVideoTracks()[0];if(sender&&cam) sender.replaceTrack(cam);};
    }catch{}
  };

  // ── filtered data ─────────────────────────────────────────────────────────
  const visibleMsgs = mSearch.trim()
    ? msgs.filter(m=>m.message?.toLowerCase().includes(mSearch.toLowerCase()))
    : msgs;

  const visibleThreads = threads.filter(t=>{
    if(archived.has(t.id)) return false;
    if(!tSearch.trim()) return true;
    return t.participant_name?.toLowerCase().includes(tSearch.toLowerCase());
  });

  const typingText = active
    ? Object.entries(typing)
        .filter(([k])=>k.startsWith(`${active.id}_`)&&!k.endsWith(`_${user?.id}`))
        .map(([,n])=>n).join(', ')
    : '';

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Global styles */}
      <style>{`
        @keyframes typingBounce {
          0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)}
        }
        @keyframes slideUp {
          from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1}
        }
        @keyframes fadeIn {
          from{opacity:0;transform:scale(0.97)} to{opacity:1;transform:scale(1)}
        }
        .chat-input:focus{outline:none;}
        .thread-item:hover{background:#f9fafb;}
        .thread-item.active{background:#fff7ed;}
      `}</style>

      {/* Modals */}
      {incoming && <IncomingModal call={incoming} onAccept={acceptCall} onReject={rejectCall} />}
      {inCall && (
        <CallOverlay remote={cRemote} type={cType} status={cStatus} dur={cDur}
          micMuted={micMuted} camOff={camOff}
          onMic={toggleMic} onCam={toggleCam} onScreen={shareScreen} onEnd={endCall}
          localRef={localVid} remoteRef={remoteVid} />
      )}

      {/* Container */}
      <div style={{
        display:'flex', height:'calc(100vh - 80px)', borderRadius:14,
        overflow:'hidden', border:'1px solid #e5e7eb',
        background:'#fff', boxShadow:'0 4px 24px rgba(0,0,0,0.06)',
      }} onClick={()=>{setCtxMenu(null);setHoveredId(null);setOptOpen(false);}}>

        {/* ── SIDEBAR ───────────────────────────────────────────────────── */}
        <div style={{
          width:300, borderRight:'1px solid #f0f0f0',
          display:'flex', flexDirection:'column', flexShrink:0, background:'#fff',
          ...(mobileView==='chat' ? {display:'none'} : {}),
        }} className="hide-on-mobile-chat">
          {/* Header */}
          <div style={{ padding:'16px 16px 10px', borderBottom:'1px solid #f3f4f6' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
              <span style={{ fontWeight:800, fontSize:17, color:'#111827' }}>Messages</span>
              <button onClick={()=>setShowNew(o=>!o)}
                style={{ background:'#c9a96e', border:'none', borderRadius:20,
                  padding:'5px 13px', color:'#fff', fontSize:12, fontWeight:700,
                  cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
                <Plus size={13} /> New
              </button>
            </div>
            {/* Search */}
            <div style={{ display:'flex', alignItems:'center', gap:6,
              background:'#f3f4f6', borderRadius:10, padding:'7px 11px' }}>
              <Search size={14} color="#9ca3af" />
              <input value={tSearch} onChange={e=>setTSearch(e.target.value)}
                placeholder="Search conversations"
                style={{ flex:1, background:'none', border:'none', fontSize:13,
                  outline:'none', color:'#111827' }} />
            </div>
          </div>

          {/* New thread search */}
          {showNew && (
            <div style={{ padding:'10px 12px', borderBottom:'1px solid #f3f4f6', background:'#fafafa' }}>
              <input autoFocus value={uQ}
                onChange={e=>{setUQ(e.target.value);searchUsers(e.target.value);}}
                placeholder="Search by name or email…"
                style={{ width:'100%', padding:'8px 10px', borderRadius:8,
                  border:'1px solid #e5e7eb', fontSize:13, outline:'none',
                  boxSizing:'border-box' }} />
              {uSearching && <div style={{fontSize:11,color:'#9ca3af',padding:'4px 2px'}}>Searching…</div>}
              {uResults.map(u=>(
                <div key={u.id} onClick={()=>startThread(u.id,u.name)}
                  style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 4px',
                    cursor:'pointer', borderRadius:8 }}
                  onMouseEnter={e=>{e.currentTarget.style.background='#f3f4f6';}}
                  onMouseLeave={e=>{e.currentTarget.style.background='transparent';}}>
                  <Av name={u.name} size={32} src={u.avatar_url}
                    online={online.has(String(u.id))} />
                  <div>
                    <div style={{fontWeight:600,fontSize:13,color:'#111827'}}>{u.name}</div>
                    <div style={{fontSize:11,color:'#9ca3af',textTransform:'capitalize'}}>{u.role}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Thread list */}
          <div style={{ flex:1, overflowY:'auto' }}>
            {tLoading ? (
              [1,2,3,4].map(i=>(
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px' }}>
                  <div className="skeleton" style={{width:40,height:40,borderRadius:'50%',flexShrink:0}} />
                  <div style={{flex:1}}>
                    <div className="skeleton" style={{height:11,borderRadius:4,marginBottom:5,width:'60%'}} />
                    <div className="skeleton" style={{height:9,borderRadius:4,width:'80%'}} />
                  </div>
                </div>
              ))
            ) : visibleThreads.length===0 ? (
              <div style={{textAlign:'center',padding:'48px 16px',color:'#9ca3af'}}>
                <MessageCircle size={32} color="#e5e7eb" style={{margin:'0 auto 10px',display:'block'}} />
                <div style={{fontSize:13}}>No conversations yet</div>
                <div style={{fontSize:12,marginTop:4}}>Click + New to start chatting</div>
              </div>
            ) : visibleThreads.map(t=>{
              const isActive = active?.id===t.id;
              const isOnline = online.has(String(t.participant_id));
              const u = unread[t.id]||0;
              return (
                <div key={t.id} onClick={()=>openThread(t)}
                  className={`thread-item${isActive?' active':''}`}
                  style={{ display:'flex', alignItems:'center', gap:10,
                    padding:'11px 14px', cursor:'pointer',
                    borderLeft:`3px solid ${isActive?'#c9a96e':'transparent'}`,
                    transition:'all 0.12s' }}>
                  <Av name={t.participant_name} size={42} src={t.participant_avatar_url} online={isOnline} />
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
                      <span style={{ fontWeight:u>0?700:600, fontSize:13,
                        color:'#111827', overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>
                        {t.participant_name}
                      </span>
                      <span style={{fontSize:10,color:'#9ca3af',flexShrink:0,marginLeft:4}}>
                        {fmtShort(t.last_message_at)}
                      </span>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ fontSize:12,
                        color: u>0?'#374151': Object.keys(typing).some(k=>k.startsWith(`${t.id}_`))?'#c9a96e':'#9ca3af',
                        fontWeight: u>0?600:400,
                        fontStyle: Object.keys(typing).some(k=>k.startsWith(`${t.id}_`))?'italic':'normal',
                        overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis', maxWidth:170 }}>
                        {Object.keys(typing).some(k=>k.startsWith(`${t.id}_`))
                          ? 'typing…'
                          : t.last_message||'No messages yet'}
                      </span>
                      {u>0&&(
                        <span style={{ background:'#c9a96e', color:'#fff', borderRadius:12,
                          fontSize:10, fontWeight:700, padding:'1px 7px', flexShrink:0, marginLeft:4 }}>
                          {u}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── CHAT AREA ─────────────────────────────────────────────────── */}
        {!active ? (
          <div style={{ flex:1, display:'flex', flexDirection:'column',
            alignItems:'center', justifyContent:'center', gap:12,
            background:'#fafafa', color:'#9ca3af' }}>
            <div style={{ width:72, height:72, borderRadius:'50%', background:'#f3f4f6',
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <MessageCircle size={32} color="#d1d5db" />
            </div>
            <div style={{fontSize:16,fontWeight:600,color:'#374151'}}>Your Messages</div>
            <div style={{fontSize:13,color:'#9ca3af',textAlign:'center',maxWidth:260}}>
              Send private messages to your team members
            </div>
          </div>
        ) : (
          <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, background:'#fff' }}>

            {/* Thread header */}
            <div style={{ padding:'10px 16px', borderBottom:'1px solid #f0f0f0',
              background:'#fff', display:'flex', alignItems:'center', gap:10,
              zIndex:10, boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
              {/* Mobile back */}
              <button onClick={()=>setMobileView('list')}
                style={{ background:'none', border:'none', cursor:'pointer',
                  color:'#374151', display:'flex', alignItems:'center', padding:4,
                  borderRadius:6 }}>
                <ArrowLeft size={18} />
              </button>
              <Av name={active.participant_name} size={38} src={active.participant_avatar_url}
                online={online.has(String(active.participant_id))} />
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:14,color:'#111827'}}>{active.participant_name}</div>
                <div style={{fontSize:11, display:'flex', alignItems:'center', gap:4,
                  color: typingText ? '#c9a96e' : online.has(String(active.participant_id)) ? '#22c55e' : '#9ca3af'}}>
                  {typingText
                    ? <><span style={{
                        display:'inline-flex', gap:2, alignItems:'center',
                        animation:'fadeIn 0.2s ease',
                      }}>
                        typing
                        {[0,1,2].map(i=>(
                          <span key={i} style={{
                            width:3, height:3, borderRadius:'50%', background:'#c9a96e',
                            display:'inline-block', marginLeft:1,
                            animation:`typingBounce 1.2s ${i*0.18}s ease-in-out infinite`
                          }} />
                        ))}
                      </span></>
                    : online.has(String(active.participant_id)) ? '● Active now' : 'Offline'
                  }
                </div>
              </div>
              {/* Action icons */}
              <button onClick={()=>startCall({id:active.participant_id,name:active.participant_name},'audio')}
                title="Voice call"
                style={{background:'none',border:'none',cursor:'pointer',padding:6,borderRadius:8,color:'#374151',display:'flex'}}>
                <Phone size={17} />
              </button>
              <button onClick={()=>startCall({id:active.participant_id,name:active.participant_name},'video')}
                title="Video call"
                style={{background:'none',border:'none',cursor:'pointer',padding:6,borderRadius:8,color:'#374151',display:'flex'}}>
                <Video size={17} />
              </button>
              <button onClick={()=>setShowMSearch(o=>!o)} title="Search"
                style={{background:showMSearch?'#f3f4f6':'none',border:'none',cursor:'pointer',
                  padding:6,borderRadius:8,color:'#374151',display:'flex'}}>
                <Search size={16} />
              </button>
              <button onClick={()=>{if(!pinnedOpen){setPinnedOpen(true);loadPinned();setMediaOpen(false);}else setPinnedOpen(false);}}
                title="Pinned"
                style={{background:pinnedOpen?'#fef3c7':'none',border:'none',cursor:'pointer',
                  padding:6,borderRadius:8,display:'flex',
                  color:pinnedOpen?'#f59e0b':'#374151'}}>
                <Pin size={16} />
              </button>
              <button onClick={()=>{if(!mediaOpen){setMediaOpen(true);loadMedia();setPinnedOpen(false);}else setMediaOpen(false);}}
                title="Media"
                style={{background:mediaOpen?'#ede9fe':'none',border:'none',cursor:'pointer',
                  padding:6,borderRadius:8,display:'flex',
                  color:mediaOpen?'#8b5cf6':'#374151'}}>
                <Image size={16} />
              </button>
              <div style={{position:'relative'}}>
                <button onClick={e=>{e.stopPropagation();setOptOpen(o=>!o);}}
                  style={{background:'none',border:'none',cursor:'pointer',padding:6,borderRadius:8,color:'#374151',display:'flex'}}>
                  <MoreHorizontal size={16} />
                </button>
                {optOpen&&(
                  <div style={{ position:'absolute', right:0, top:34, background:'#fff',
                    border:'1px solid #e5e7eb', borderRadius:10,
                    boxShadow:'0 8px 24px rgba(0,0,0,0.12)', zIndex:100, minWidth:160,
                    padding:'4px 0' }}>
                    {[
                      {label:mutedSet.has(active.id)?'Unmute':'Mute notifications',
                        action:()=>{setMutedSet(p=>{const n=new Set(p);n.has(active.id)?n.delete(active.id):n.add(active.id);return n;});setOptOpen(false);}},
                      {label:'Archive chat',
                        action:()=>{setArchived(p=>new Set([...p,active.id]));setActive(null);setOptOpen(false);}},
                    ].map(o=>(
                      <button key={o.label} onClick={o.action}
                        style={{display:'flex',alignItems:'center',width:'100%',
                          padding:'9px 14px',background:'none',border:'none',
                          cursor:'pointer',fontSize:13,color:'#374151',textAlign:'left'}}
                        onMouseEnter={e=>{e.currentTarget.style.background='#f9fafb';}}
                        onMouseLeave={e=>{e.currentTarget.style.background='none';}}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Msg search bar */}
            {showMSearch&&(
              <div style={{padding:'6px 16px',background:'#fffbeb',borderBottom:'1px solid #fde68a',
                display:'flex',alignItems:'center',gap:8}}>
                <Search size={13} color="#9ca3af" />
                <input autoFocus value={mSearch} onChange={e=>setMSearch(e.target.value)}
                  placeholder="Search in conversation…"
                  style={{flex:1,border:'none',background:'none',fontSize:13,outline:'none'}} />
                <button onClick={()=>{setShowMSearch(false);setMSearch('');}}
                  style={{border:'none',background:'none',cursor:'pointer',display:'flex'}}>
                  <X size={14} color="#9ca3af" />
                </button>
              </div>
            )}

            {/* Body: messages + optional side drawer */}
            <div style={{flex:1,display:'flex',minHeight:0}}>

              {/* Message list */}
              <div ref={listRef} onScroll={handleScroll}
                style={{ flex:1, overflowY:'auto', padding:'16px 16px 4px',
                  display:'flex', flexDirection:'column', gap:2, position:'relative',
                  background:'#fafafa' }}>
                {mLoading ? (
                  <div style={{textAlign:'center',padding:48,color:'#9ca3af'}}>Loading…</div>
                ) : visibleMsgs.length===0 ? (
                  <div style={{textAlign:'center',padding:'48px 0',color:'#9ca3af',fontSize:13}}>
                    No messages yet. Say hello 👋
                  </div>
                ) : visibleMsgs.map((msg,idx)=>{
                  const isOwn = String(msg.sender_user_id)===String(user?.id);
                  const prev  = visibleMsgs[idx-1];
                  const next  = visibleMsgs[idx+1];
                  const showDate = !prev||!sameDay(prev.created_at,msg.created_at);
                  const groupWithPrev = prev&&String(prev.sender_user_id)===String(msg.sender_user_id)&&
                    (new Date(msg.created_at)-new Date(prev.created_at))<300000&&!showDate;
                  const groupWithNext = next&&String(next.sender_user_id)===String(msg.sender_user_id)&&
                    (new Date(next.created_at)-new Date(msg.created_at))<300000;
                  const showAvatar = !isOwn && !groupWithNext;

                  const borderRadius = isOwn
                    ? `${groupWithPrev?6:18}px ${groupWithPrev?6:18}px 4px ${groupWithNext?6:18}px`
                    : `${groupWithPrev?6:18}px ${groupWithPrev?6:18}px ${groupWithNext?6:18}px 4px`;

                  return (
                    <div key={msg.id} style={{marginTop:groupWithPrev?2:8}}>
                      {showDate&&(
                        <div style={{textAlign:'center',margin:'12px 0 8px',fontSize:11,color:'#9ca3af'}}>
                          <span style={{background:'#f0f0f0',padding:'3px 12px',borderRadius:20}}>
                            {fmtDateDiv(msg.created_at)}
                          </span>
                        </div>
                      )}
                      <div style={{
                        display:'flex', justifyContent:isOwn?'flex-end':'flex-start',
                        alignItems:'flex-end', gap:6, position:'relative',
                      }}
                        onMouseEnter={()=>setHoveredId(msg.id)}
                        onMouseLeave={()=>setHoveredId(null)}
                        onContextMenu={e=>openCtx(e,msg)}
                        onTouchStart={e=>{longPress.current=setTimeout(()=>{
                          const t=e.touches?.[0];
                          if(t) openCtx({clientX:t.clientX,clientY:t.clientY,preventDefault:()=>{},stopPropagation:()=>{}},msg);
                        },600);}}
                        onTouchEnd={()=>clearTimeout(longPress.current)}>

                        {/* Avatar slot */}
                        {!isOwn&&(showAvatar ? <Av name={msg.sender_name} size={26} src={msg.avatar_url} /> : <div style={{width:26}}/>)}

                        <div style={{maxWidth:'65%',display:'flex',flexDirection:'column',
                          alignItems:isOwn?'flex-end':'flex-start'}}>

                          {/* Reply quote */}
                          {msg.reply_to_id&&(
                            <div style={{fontSize:11,color:'#6b7280',background:'rgba(0,0,0,0.05)',
                              borderLeft:'3px solid #c9a96e',borderRadius:6,
                              padding:'3px 8px',marginBottom:3,maxWidth:'100%',
                              overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>
                              ↩ Replied to a message
                            </div>
                          )}

                          {/* Bubble */}
                          {msg.deleted_for_all ? (
                            <div style={{padding:'7px 12px',borderRadius:12,
                              background:'#f3f4f6',fontSize:12,color:'#9ca3af',fontStyle:'italic'}}>
                              🚫 Message unsent
                            </div>
                          ) : (
                            <div style={{
                              padding: msg.attachment_url&&isImgUrl(msg.attachment_url) ? '3px' : '9px 13px',
                              borderRadius,
                              background: isOwn ? '#c9a96e' : '#f0f0f0',
                              color: isOwn ? '#fff' : '#111827',
                              fontSize:13, lineHeight:1.55, wordBreak:'break-word',
                              boxShadow:'0 1px 2px rgba(0,0,0,0.05)',
                              maxWidth:'100%',
                              animation:'fadeIn 0.15s ease',
                            }}>
                              {msg.attachment_url&&isImgUrl(msg.attachment_url) ? (
                                <img src={msg.attachment_url} alt="media"
                                  style={{maxWidth:220,maxHeight:280,borderRadius:borderRadius,
                                    display:'block',cursor:'pointer',objectFit:'cover'}}
                                  onClick={()=>window.open(msg.attachment_url,'_blank')} />
                              ) : msg.attachment_url ? (
                                <a href={msg.attachment_url} target="_blank" rel="noreferrer"
                                  style={{display:'flex',alignItems:'center',gap:6,
                                    color:isOwn?'#fff':'#3b82f6',fontSize:12,textDecoration:'none'}}>
                                  <FileText size={16}/>{msg.attachment_url.split('/').pop().slice(0,28)}
                                </a>
                              ) : null}
                              {msg.message&&<span>{msg.message}</span>}
                              {msg.edited_at&&<span style={{fontSize:10,opacity:0.6,marginLeft:5}}>(edited)</span>}
                            </div>
                          )}

                          {/* Reactions */}
                          <Reactions reactions={msg.reactions}
                            onToggle={emoji=>reactTo(msg.id,emoji)} />

                          {/* Meta row */}
                          <div style={{display:'flex',alignItems:'center',gap:4,marginTop:2}}>
                            {msg.is_pinned&&<Pin size={10} color="#f59e0b"/>}
                            <span style={{fontSize:10,color:'#9ca3af'}}>{fmtTime(msg.created_at)}</span>
                            <Ticks status={msg.status} isOwn={isOwn} />
                          </div>
                        </div>

                        {/* Emoji hover bar */}
                        {hoveredId===msg.id&&!msg.deleted_for_all&&(
                          <EmojiBar isOwn={isOwn}
                            onPick={e=>reactTo(msg.id,e)}
                            onMore={e=>openCtx({clientX:0,clientY:0,preventDefault:()=>{},stopPropagation:()=>{}},msg)} />
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Typing indicator — Instagram style with avatar + animated dots */}
                {typingText&&(
                  <div style={{display:'flex',alignItems:'flex-end',gap:6,marginTop:6,
                    animation:'fadeIn 0.2s ease'}}>
                    <Av name={active.participant_name} size={26}
                      src={active.participant_avatar_url} />
                    <div style={{
                      background:'#f0f0f0', borderRadius:'18px 18px 18px 4px',
                      padding:'10px 14px',
                      display:'flex', alignItems:'center', gap:4,
                    }}>
                      {[0,1,2].map(i=>(
                        <span key={i} style={{
                          width:8, height:8, borderRadius:'50%',
                          background:'#9ca3af', display:'inline-block',
                          animation:`typingBounce 1.2s ${i*0.2}s ease-in-out infinite`,
                        }} />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={endRef} />
              </div>

              {/* Side drawer: pinned / media */}
              {(pinnedOpen||mediaOpen)&&(
                <div style={{width:256,borderLeft:'1px solid #f0f0f0',
                  background:'#fafafa',overflowY:'auto',flexShrink:0,
                  animation:'fadeIn 0.15s ease'}}>
                  <div style={{padding:'12px 14px',fontWeight:700,fontSize:13,
                    borderBottom:'1px solid #f0f0f0',
                    display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    {pinnedOpen?'📌 Pinned':'🖼 Media'}
                    <button onClick={()=>{setPinnedOpen(false);setMediaOpen(false);}}
                      style={{border:'none',background:'none',cursor:'pointer',display:'flex'}}>
                      <X size={14} color="#9ca3af" />
                    </button>
                  </div>
                  <div style={{padding:12}}>
                    {pinnedOpen&&(
                      pinned.length===0
                        ? <div style={{fontSize:12,color:'#9ca3af'}}>No pinned messages</div>
                        : pinned.map(m=>(
                          <div key={m.id} style={{padding:'7px 0',borderBottom:'1px solid #f3f4f6'}}>
                            <div style={{fontSize:11,color:'#9ca3af',marginBottom:2}}>{m.sender_name}</div>
                            <div style={{fontSize:12,color:'#374151'}}>{m.message}</div>
                          </div>
                        ))
                    )}
                    {mediaOpen&&(
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                        {mediaItems.length===0
                          ? <div style={{fontSize:12,color:'#9ca3af',gridColumn:'1/-1'}}>No media shared</div>
                          : mediaItems.map(m=>(
                            <a key={m.id} href={m.attachment_url} target="_blank" rel="noreferrer">
                              {isImgUrl(m.attachment_url)
                                ? <img src={m.attachment_url} alt="" style={{width:'100%',height:82,objectFit:'cover',borderRadius:8}} />
                                : <div style={{background:'#f3f4f6',borderRadius:8,height:82,
                                    display:'flex',alignItems:'center',justifyContent:'center',
                                    fontSize:11,color:'#6b7280'}}>
                                    <FileText size={20} />
                                  </div>
                              }
                            </a>
                          ))
                        }
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ── Input area ─────────────────────────────────────────────── */}
            <div style={{borderTop:'1px solid #f0f0f0',background:'#fff',padding:'10px 14px'}}>
              {/* Reply / edit bar */}
              {(replyTo||editMsg)&&(
                <div style={{display:'flex',alignItems:'center',gap:8,padding:'6px 10px',
                  background:'#fff7ed',borderRadius:8,marginBottom:8,
                  borderLeft:'3px solid #c9a96e'}}>
                  {editMsg ? <Edit2 size={13} color="#c9a96e"/> : <Reply size={13} color="#c9a96e"/>}
                  <span style={{fontSize:12,flex:1,overflow:'hidden',whiteSpace:'nowrap',
                    textOverflow:'ellipsis',color:'#374151'}}>
                    {editMsg?`Editing: ${editMsg.message}`:`Reply: ${replyTo.message}`}
                  </span>
                  <button onClick={()=>{setReplyTo(null);setEditMsg(null);setText('');}}
                    style={{border:'none',background:'none',cursor:'pointer',display:'flex'}}>
                    <X size={13} color="#9ca3af" />
                  </button>
                </div>
              )}
              <div style={{display:'flex',alignItems:'flex-end',gap:8}}>
                <input ref={fileRef} type="file" accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
                  style={{display:'none'}} onChange={handleFileChange} />
                <button onClick={()=>fileRef.current?.click()}
                  style={{border:'none',background:'none',cursor:'pointer',
                    padding:6,color:uploading?'#c9a96e':'#9ca3af',flexShrink:0,display:'flex'}}
                  title="Attach file" disabled={uploading}>
                  <Paperclip size={20} />
                </button>
                <textarea ref={inputRef} rows={1} value={text}
                  onChange={e=>handleTyping(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder={editMsg?'Edit message…':'Message…'}
                  className="chat-input"
                  style={{
                    flex:1, border:'1.5px solid #e5e7eb', borderRadius:22,
                    padding:'9px 16px', fontSize:13, resize:'none',
                    fontFamily:'inherit', maxHeight:120, overflowY:'auto',
                    lineHeight:1.5, background:'#f9fafb', transition:'border-color 0.15s',
                  }}
                  onFocus={e=>{e.target.style.borderColor='#c9a96e';e.target.style.background='#fff';}}
                  onBlur={e=>{e.target.style.borderColor='#e5e7eb';e.target.style.background='#f9fafb';}} />
                <button onClick={sendMsg} disabled={!text.trim()||sending}
                  style={{
                    background: text.trim() ? '#c9a96e' : '#e5e7eb',
                    border:'none', borderRadius:'50%', width:38, height:38,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    cursor: text.trim() ? 'pointer' : 'default',
                    flexShrink:0, transition:'all 0.18s',
                    boxShadow: text.trim() ? '0 2px 10px rgba(201,169,110,0.4)' : 'none',
                  }}>
                  <Send size={16} color="#fff" />
                </button>
              </div>
            </div>

          </div>
        )}

        {/* Scroll-to-bottom */}
        {!atBottom&&active&&(
          <button onClick={()=>endRef.current?.scrollIntoView({behavior:'smooth'})}
            style={{ position:'absolute', bottom:84, right:20, background:'#fff',
              border:'1px solid #e5e7eb', borderRadius:'50%', width:34, height:34,
              display:'flex', alignItems:'center', justifyContent:'center',
              cursor:'pointer', boxShadow:'0 2px 10px rgba(0,0,0,0.12)', zIndex:20 }}>
            <ChevronDown size={16} color="#6b7280" />
          </button>
        )}

        {/* Context menu */}
        {ctxMenu&&(
          <CtxMenu x={ctxMenu.x} y={ctxMenu.y} msg={ctxMenu.msg}
            isOwn={String(ctxMenu.msg.sender_user_id)===String(user?.id)}
            onClose={()=>setCtxMenu(null)}
            on={{
              reply:  ()=>{ setReplyTo(ctxMenu.msg); setTimeout(()=>inputRef.current?.focus(),50); },
              edit:   ()=>{ setEditMsg(ctxMenu.msg); setText(ctxMenu.msg.message||''); setTimeout(()=>inputRef.current?.focus(),50); },
              pin:    ()=>pinMsg(ctxMenu.msg),
              star:   ()=>starMsg(ctxMenu.msg),
              delMe:  ()=>delForMe(ctxMenu.msg),
              delAll: ()=>delForAll(ctxMenu.msg),
            }} />
        )}
      </div>
    </>
  );
}
