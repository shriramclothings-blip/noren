import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Volume2 } from 'lucide-react';

export default function WebRTCCallModal({ callData, onClose }) {
  const { socket } = useSocket();
  const [callState, setCallState] = useState(callData.isIncoming ? 'incoming' : 'outgoing');
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    // WebRTC PeerConnection setup
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    peerConnectionRef.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('call:ice-candidate', {
          target_id: callData.targetId || callData.caller_id,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // Socket signaling listeners
    socket.on('call:accepted', async () => {
      setCallState('connected');
      startDurationTimer();
    });

    socket.on('call:rejected', () => {
      setCallState('ended');
      setTimeout(onClose, 1500);
    });

    socket.on('call:ended', () => {
      setCallState('ended');
      setTimeout(onClose, 1000);
    });

    socket.on('call:answer', async ({ answer }) => {
      if (pc.signalingState !== 'stable') {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    socket.on('call:ice-candidate', async ({ candidate }) => {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {}
    });

    // Auto initiate if outgoing
    if (!callData.isIncoming) {
      initiateOutgoingCall();
    }

    return () => {
      pc.close();
      if (timerRef.current) clearInterval(timerRef.current);
      socket.off('call:accepted');
      socket.off('call:rejected');
      socket.off('call:ended');
      socket.off('call:answer');
      socket.off('call:ice-candidate');
    };
  }, [socket]);

  const startDurationTimer = () => {
    timerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const initiateOutgoingCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callData.callType === 'video',
      });
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      stream.getTracks().forEach(track => peerConnectionRef.current.addTrack(track, stream));

      const offer = await peerConnectionRef.current.createOffer();
      await peerConnectionRef.current.setLocalDescription(offer);

      socket.emit('call:initiate', {
        callee_id: callData.targetId,
        call_type: callData.callType,
        offer,
      });
    } catch {
      setCallState('ended');
      setTimeout(onClose, 1500);
    }
  };

  const handleAcceptCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callData.call_type === 'video',
      });
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      stream.getTracks().forEach(track => peerConnectionRef.current.addTrack(track, stream));

      if (callData.offer) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(callData.offer));
        const answer = await peerConnectionRef.current.createAnswer();
        await peerConnectionRef.current.setLocalDescription(answer);

        socket.emit('call:accept', {
          call_id: callData.call_id,
          caller_id: callData.caller_id,
          answer,
        });
      }

      setCallState('connected');
      startDurationTimer();
    } catch {
      handleEndCall();
    }
  };

  const handleEndCall = () => {
    socket.emit('call:end', {
      call_id: callData.call_id || 'active',
      other_user_id: callData.targetId || callData.caller_id,
    });
    setCallState('ended');
    setTimeout(onClose, 1000);
  };

  const formatDuration = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="w-full max-w-lg h-[80vh] bg-slate-900 rounded-3xl border border-slate-800 flex flex-col justify-between p-6 relative overflow-hidden shadow-2xl">
        {/* Videos Container */}
        <div className="absolute inset-0 z-0 bg-slate-950 flex items-center justify-center">
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
          <video ref={localVideoRef} autoPlay playsInline muted className="absolute top-4 right-4 w-32 h-44 object-cover rounded-2xl border-2 border-cyan-500/50 shadow-lg" />
        </div>

        {/* Overlay Info */}
        <div className="relative z-10 text-center mt-4">
          <h3 className="text-xl font-extrabold text-white">
            {callData.caller_name || callData.targetName || 'Noren Calling'}
          </h3>
          <p className="text-xs font-semibold text-cyan-400 mt-1 uppercase tracking-widest">
            {callState === 'incoming' && 'Incoming Call...'}
            {callState === 'outgoing' && 'Ringing...'}
            {callState === 'connected' && formatDuration(callDuration)}
            {callState === 'ended' && 'Call Ended'}
          </p>
        </div>

        {/* Controls */}
        <div className="relative z-10 flex items-center justify-center gap-6 mb-6">
          {callState === 'incoming' ? (
            <>
              <button
                onClick={handleAcceptCall}
                className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30"
              >
                <Phone className="w-6 h-6" />
              </button>
              <button
                onClick={handleEndCall}
                className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-600/30"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsMicMuted(!isMicMuted)}
                className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  isMicMuted ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-200'
                }`}
              >
                {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              <button
                onClick={handleEndCall}
                className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-600/30"
              >
                <PhoneOff className="w-6 h-6" />
              </button>

              <button
                onClick={() => setIsVideoOff(!isVideoOff)}
                className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  isVideoOff ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-200'
                }`}
              >
                {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
