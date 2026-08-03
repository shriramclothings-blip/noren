import { useEffect, useState, useRef, useCallback } from 'react';
import { Phone, PhoneOff, PhoneCall, Mic, MicOff, RefreshCw, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../utils/api';
import { io } from 'socket.io-client';
import { useAuth } from '../../../context/AuthContext';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;
const STUN = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] };

function fmtDuration(secs) {
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function Avatar({ name, size = 36 }) {
  const COLORS = ['#c9a96e','#3b82f6','#8b5cf6','#22c55e','#ef4444'];
  const bg = COLORS[(name?.charCodeAt(0) || 0) % COLORS.length];
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: size * 0.38, flexShrink: 0 }}>
      {(name || '?')[0].toUpperCase()}
    </div>
  );
}

export default function AdminVoiceCalls() {
  const { user } = useAuth();
  const socketRef   = useRef(null);
  const pcRef       = useRef(null);
  const localStream = useRef(null);
  const callIdRef   = useRef(null);
  const remoteIdRef = useRef(null);
  const timerRef    = useRef(null);

  const [onlineUsers, setOnlineUsers]     = useState([]);
  const [callLogs, setCallLogs]           = useState([]);
  const [logsLoading, setLogsLoading]     = useState(false);
  const [inCall, setInCall]               = useState(false);
  const [callStatus, setCallStatus]       = useState(''); // ringing | active | ended
  const [remoteUser, setRemoteUser]       = useState(null);
  const [incomingCall, setIncomingCall]   = useState(null); // { call_id, caller_id, caller_name }
  const [muted, setMuted]                 = useState(false);
  const [onHold, setOnHold]               = useState(false);
  const [duration, setDuration]           = useState(0);

  //  Load call logs 
  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const res = await api.get('/erp/communications/call-logs?call_type=audio');
      setCallLogs(res.data.call_logs || []);
    } catch { /* silent */ }
    finally { setLogsLoading(false); }
  }, []);

  //  Socket setup 
  useEffect(() => {
    const token = localStorage.getItem('noren_token') || sessionStorage.getItem('noren_token');
    const socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('user:online',  ({ userId, name }) => setOnlineUsers(p => p.find(u => String(u.id) === String(userId)) ? p : [...p, { id: userId, name }]));
    socket.on('user:offline', ({ userId }) => setOnlineUsers(p => p.filter(u => String(u.id) !== String(userId))));

    socket.on('call:incoming', (data) => {
      if (inCall) { socket.emit('call:busy', { caller_id: data.caller_id, call_id: data.call_id }); return; }
      setIncomingCall(data);
    });

    socket.on('call:accepted', async ({ call_id }) => {
      setCallStatus('active');
      startTimer();
    });

    socket.on('call:rejected', () => {
      toast.error('Call was declined');
      endCallCleanup();
    });

    socket.on('call:ended', () => { endCallCleanup(); loadLogs(); });
    socket.on('call:busy', () => { toast.error('User is busy'); endCallCleanup(); });

    socket.on('call:offer', async ({ from_id, offer }) => {
      if (!pcRef.current) await setupPeerConnection(from_id);
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);
      socket.emit('call:answer', { target_id: from_id, answer });
    });

    socket.on('call:answer', async ({ answer }) => {
      if (pcRef.current) await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on('call:ice-candidate', async ({ candidate }) => {
      try { if (pcRef.current && candidate) await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
    });

    loadLogs();
    return () => { socket.disconnect(); endCallCleanup(true); };
  }, []);

  //  Peer connection setup 
  const setupPeerConnection = async (remoteUserId) => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    localStream.current = stream;
    const pc = new RTCPeerConnection(STUN);
    pcRef.current = pc;
    stream.getTracks().forEach(t => pc.addTrack(t, stream));
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) socketRef.current?.emit('call:ice-candidate', { target_id: remoteUserId, candidate });
    };
    pc.onconnectionstatechange = () => {
      if (['failed','disconnected'].includes(pc.connectionState)) {
        toast.error('Call connection lost');
        endCallCleanup();
      }
    };
    return pc;
  };

  //  Initiate call 
  const initiateCall = async (targetUser) => {
    if (inCall) return toast.error('Already in a call');
    try {
      await setupPeerConnection(targetUser.id);
      const offer = await pcRef.current.createOffer();
      await pcRef.current.setLocalDescription(offer);
      const callId = `call-${user?.id}-${targetUser.id}-${Date.now()}`;
      callIdRef.current = callId;
      remoteIdRef.current = targetUser.id;
      setRemoteUser(targetUser);
      setInCall(true);
      setCallStatus('ringing');
      socketRef.current?.emit('call:initiate', { callee_id: targetUser.id, call_type: 'audio', offer });
    } catch (err) {
      toast.error('Microphone access required for calls');
      endCallCleanup();
    }
  };

  //  Accept incoming call 
  const acceptCall = async () => {
    if (!incomingCall) return;
    remoteIdRef.current = incomingCall.caller_id;
    setRemoteUser({ id: incomingCall.caller_id, name: incomingCall.caller_name });
    setInCall(true);
    setCallStatus('active');
    setIncomingCall(null);
    startTimer();
    socketRef.current?.emit('call:accept', { call_id: incomingCall.call_id, caller_id: incomingCall.caller_id });
  };

  const rejectCall = () => {
    if (!incomingCall) return;
    socketRef.current?.emit('call:reject', { call_id: incomingCall.call_id, caller_id: incomingCall.caller_id });
    setIncomingCall(null);
  };

  //  End call 
  const endCall = () => {
    if (remoteIdRef.current) {
      socketRef.current?.emit('call:end', { call_id: callIdRef.current, other_user_id: remoteIdRef.current, is_caller: true });
    }
    endCallCleanup();
    loadLogs();
  };

  const endCallCleanup = (silent = false) => {
    clearInterval(timerRef.current);
    setDuration(0);
    setInCall(false);
    setCallStatus('');
    setRemoteUser(null);
    callIdRef.current = null;
    remoteIdRef.current = null;
    if (localStream.current) { localStream.current.getTracks().forEach(t => t.stop()); localStream.current = null; }
    if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
  };

  const startTimer = () => {
    setDuration(0);
    timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
  };

  const toggleMute = () => {
    if (localStream.current) {
      localStream.current.getAudioTracks().forEach(t => { t.enabled = muted; });
      setMuted(m => !m);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 20, maxWidth: 900 }}>
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: '#111827' }}>Voice Calls</h2>
        <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>Direct peer-to-peer voice calls  no third-party services.</p>
      </div>

      {/* Incoming call modal */}
      {incomingCall && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, textAlign: 'center', minWidth: 280, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <Avatar name={incomingCall.caller_name} size={60} />
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 12 }}>{incomingCall.caller_name}</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>Incoming voice call</div>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
              <button onClick={acceptCall}
                style={{ background: '#22c55e', border: 'none', borderRadius: '50%', width: 56, height: 56, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Phone size={22} color="#fff" />
              </button>
              <button onClick={rejectCall}
                style={{ background: '#ef4444', border: 'none', borderRadius: '50%', width: 56, height: 56, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PhoneOff size={22} color="#fff" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active call panel */}
      {inCall && (
        <div style={{ background: '#1f2937', borderRadius: 16, padding: 28, color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <Avatar name={remoteUser?.name} size={72} />
          <div style={{ fontSize: 18, fontWeight: 700 }}>{remoteUser?.name}</div>
          <div style={{ fontSize: 13, color: '#9ca3af' }}>
            {callStatus === 'ringing' ? ' Ringing' : (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={14} />{fmtDuration(duration)}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
            <button onClick={toggleMute} title={muted ? 'Unmute' : 'Mute'}
              style={{ background: muted ? '#ef4444' : '#374151', border: 'none', borderRadius: '50%', width: 48, height: 48, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {muted ? <MicOff size={18} color="#fff" /> : <Mic size={18} color="#fff" />}
            </button>
            <button onClick={() => setOnHold(h => !h)} title={onHold ? 'Resume' : 'Hold'}
              style={{ background: onHold ? '#f59e0b' : '#374151', border: 'none', borderRadius: '50%', width: 48, height: 48, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PhoneCall size={18} color="#fff" />
            </button>
            <button onClick={endCall} title="End call"
              style={{ background: '#ef4444', border: 'none', borderRadius: '50%', width: 56, height: 56, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PhoneOff size={22} color="#fff" />
            </button>
          </div>
        </div>
      )}

      {/* Online users to call */}
      {!inCall && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}> Online Users</div>
          {onlineUsers.filter(u => String(u.id) !== String(user?.id)).length === 0 ? (
            <div style={{ color: '#9ca3af', fontSize: 13 }}>No other users online right now</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {onlineUsers.filter(u => String(u.id) !== String(user?.id)).map(u => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#f9fafb', borderRadius: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar name={u.name} size={32} />
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{u.name}</span>
                  </div>
                  <button onClick={() => initiateCall(u)}
                    style={{ background: '#22c55e', border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', color: '#fff', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Phone size={13} /> Call
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Call history */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Call History</div>
          <button onClick={loadLogs} style={{ border: '1px solid #e5e7eb', background: 'none', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
        {logsLoading ? (
          <div style={{ color: '#9ca3af', fontSize: 13 }}>Loading</div>
        ) : callLogs.length === 0 ? (
          <div style={{ color: '#9ca3af', fontSize: 13 }}>No call history</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f3f4f6' }}>
                {['Caller','Callee','Type','Status','Duration','Date'].map(h => (
                  <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {callLogs.map(log => (
                <tr key={log.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                  <td style={{ padding: '8px 10px' }}>{log.caller_name || ''}</td>
                  <td style={{ padding: '8px 10px' }}>{log.callee_name || ''}</td>
                  <td style={{ padding: '8px 10px' }}>{log.call_type}</td>
                  <td style={{ padding: '8px 10px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                      background: log.status === 'completed' ? '#dcfce7' : log.status === 'missed' ? '#fee2e2' : '#f3f4f6',
                      color: log.status === 'completed' ? '#16a34a' : log.status === 'missed' ? '#dc2626' : '#6b7280' }}>
                      {log.status}
                    </span>
                  </td>
                  <td style={{ padding: '8px 10px' }}>{log.duration_seconds ? fmtDuration(log.duration_seconds) : ''}</td>
                  <td style={{ padding: '8px 10px', color: '#9ca3af' }}>{new Date(log.created_at).toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
