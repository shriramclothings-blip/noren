import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Volume2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function WebRTCCallModal({ callData, onClose }) {
  const { socket } = useSocket();
  const [callState, setCallState] = useState(callData.isIncoming ? 'incoming' : 'outgoing');
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const timerRef = useRef(null);

  const isVideoCall = (callData.callType || callData.call_type) === 'video';

  useEffect(() => {
    if (!socket) return;

    // Multi-STUN configuration for reliable WebRTC NAT traversal across all cellular & home networks
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        { urls: 'stun:stun.services.mozilla.com' },
      ],
    });
    peerConnectionRef.current = pc;

    // Send local ICE candidates to remote peer via socket
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('call:ice-candidate', {
          target_id: callData.targetId || callData.caller_id,
          candidate: event.candidate,
        });
      }
    };

    // Receive remote media track (audio / video)
    pc.ontrack = (event) => {
      console.log('📡 WebRTC Track Received:', event.track.kind);
      const remoteStream = event.streams[0] || new MediaStream([event.track]);

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current.play().catch(() => {});
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current.play().catch(() => {});
      }
    };

    // Signaling listeners
    socket.on('call:accepted', async (data) => {
      setCallState('connected');
      startDurationTimer();

      if (data.answer && pc.signalingState !== 'stable') {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          await processPendingCandidates(pc);
        } catch (err) {
          console.error('Failed to set remote answer:', err);
        }
      }
    });

    socket.on('call:answer', async ({ answer }) => {
      if (pc.signalingState !== 'stable') {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          await processPendingCandidates(pc);
        } catch (err) {
          console.error('Failed to set remote answer:', err);
        }
      }
    });

    socket.on('call:ice-candidate', async ({ candidate }) => {
      if (pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch {}
      } else {
        pendingCandidatesRef.current.push(candidate);
      }
    });

    socket.on('call:rejected', () => {
      toast.error('Call rejected');
      setCallState('ended');
      cleanupAndClose();
    });

    socket.on('call:ended', () => {
      setCallState('ended');
      cleanupAndClose();
    });

    // Auto initiate if outgoing
    if (!callData.isIncoming) {
      initiateOutgoingCall(pc);
    }

    return () => {
      cleanupMedia();
      socket.off('call:accepted');
      socket.off('call:answer');
      socket.off('call:ice-candidate');
      socket.off('call:rejected');
      socket.off('call:ended');
    };
  }, [socket]);

  const processPendingCandidates = async (pc) => {
    while (pendingCandidatesRef.current.length > 0) {
      const candidate = pendingCandidatesRef.current.shift();
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {}
    }
  };

  const startDurationTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const initiateOutgoingCall = async (pc) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideoCall,
      });
      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('call:initiate', {
        callee_id: callData.targetId,
        call_type: isVideoCall ? 'video' : 'audio',
        offer,
      });
    } catch (err) {
      console.error('GetUserMedia error:', err);
      toast.error('Could not access microphone or camera');
      setCallState('ended');
      cleanupAndClose();
    }
  };

  const handleAcceptCall = async () => {
    const pc = peerConnectionRef.current;
    if (!pc) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideoCall,
      });
      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      if (callData.offer) {
        await pc.setRemoteDescription(new RTCSessionDescription(callData.offer));
        await processPendingCandidates(pc);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('call:accept', {
          call_id: callData.call_id,
          caller_id: callData.caller_id,
          answer,
        });
      }

      setCallState('connected');
      startDurationTimer();
    } catch (err) {
      console.error('handleAcceptCall error:', err);
      toast.error('Failed to access media device');
      handleEndCall();
    }
  };

  const handleEndCall = () => {
    if (socket) {
      socket.emit('call:end', {
        call_id: callData.call_id || 'active',
        other_user_id: callData.targetId || callData.caller_id,
      });
    }
    setCallState('ended');
    cleanupAndClose();
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = isMicMuted;
      });
    }
    setIsMicMuted(!isMicMuted);
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = isVideoOff;
      });
    }
    setIsVideoOff(!isVideoOff);
  };

  const cleanupMedia = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
  };

  const cleanupAndClose = () => {
    cleanupMedia();
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const formatDuration = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4">
      {/* Hidden audio element ensuring remote voice is played loud and clear */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      <div className="w-full max-w-lg h-[80vh] bg-black rounded-3xl border border-white/20 flex flex-col justify-between p-6 relative overflow-hidden shadow-2xl">
        {/* Videos Container */}
        <div className="absolute inset-0 z-0 bg-black flex items-center justify-center">
          {isVideoCall ? (
            <>
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="absolute top-4 right-4 w-32 h-44 object-cover rounded-2xl border-2 border-white/40 shadow-xl"
              />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 text-center">
              <div className="relative">
                <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-4xl font-extrabold text-white shadow-2xl animate-pulse ring-8 ring-white/10">
                  {(callData.caller_name || callData.targetName || 'Noren')?.[0]}
                </div>
                <div className="absolute -bottom-2 right-2 p-2 rounded-full bg-emerald-500 text-white shadow-lg">
                  <Volume2 className="w-5 h-5 animate-bounce" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Overlay Header Info */}
        <div className="relative z-10 text-center mt-4 bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-white/10 max-w-xs mx-auto">
          <h3 className="text-lg font-extrabold text-white truncate">
            {callData.caller_name || callData.targetName || 'Noren User'}
          </h3>
          <p className="text-xs font-semibold text-emerald-400 mt-1 uppercase tracking-widest flex items-center justify-center gap-1.5">
            {callState === 'incoming' && '📞 Incoming Call...'}
            {callState === 'outgoing' && '🔔 Ringing...'}
            {callState === 'connected' && `🟢 ${formatDuration(callDuration)}`}
            {callState === 'ended' && '🔴 Call Ended'}
          </p>
        </div>

        {/* Controls Bar */}
        <div className="relative z-10 flex items-center justify-center gap-6 mb-6">
          {callState === 'incoming' ? (
            <>
              <button
                onClick={handleAcceptCall}
                className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center shadow-lg shadow-emerald-500/40 transition-transform active:scale-95"
                title="Accept Call"
              >
                <Phone className="w-7 h-7" />
              </button>
              <button
                onClick={handleEndCall}
                className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-600/40 transition-transform active:scale-95"
                title="Decline Call"
              >
                <PhoneOff className="w-7 h-7" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={toggleMic}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                  isMicMuted ? 'bg-rose-500 text-white shadow-rose-500/30' : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                }`}
                title={isMicMuted ? 'Unmute Microphone' : 'Mute Microphone'}
              >
                {isMicMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>

              <button
                onClick={handleEndCall}
                className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-600/40 transition-transform active:scale-95"
                title="End Call"
              >
                <PhoneOff className="w-7 h-7" />
              </button>

              {isVideoCall && (
                <button
                  onClick={toggleVideo}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                    isVideoOff ? 'bg-rose-500 text-white shadow-rose-500/30' : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                  }`}
                  title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
                >
                  {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
