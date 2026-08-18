import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Volume2 } from 'lucide-react';
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

  const getTargetId = () => callData.targetId || callData.caller_id || callData.user_id;

  useEffect(() => {
    if (!socket) return;

    // Comprehensive STUN + TURN OpenRelay configuration for 100% NAT traversal
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' },
        { urls: 'stun:stun.services.mozilla.com' },
        {
          urls: 'turn:openrelay.metered.ca:80',
          username: 'openrelay',
          credential: 'openrelay',
        },
        {
          urls: 'turn:openrelay.metered.ca:443',
          username: 'openrelay',
          credential: 'openrelay',
        },
      ],
    });
    peerConnectionRef.current = pc;

    // Send local ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('call:ice-candidate', {
          target_id: getTargetId(),
          candidate: event.candidate,
        });
      }
    };

    // Handle incoming remote media tracks (voice audio & video streams)
    pc.ontrack = (event) => {
      console.log('📡 WebRTC Remote Track Arrived:', event.track.kind);
      const stream = event.streams && event.streams[0] ? event.streams[0] : new MediaStream([event.track]);

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
        remoteVideoRef.current.play().catch(() => {});
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = stream;
        remoteAudioRef.current.play().catch(() => {});
      }
    };

    // Signaling listeners
    socket.on('call:accepted', async (data) => {
      setCallState('connected');
      startDurationTimer();

      const answerSdp = data.answer || callData.answer;
      if (answerSdp && pc.signalingState !== 'stable') {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answerSdp));
          await drainPendingCandidates(pc);
        } catch (err) {
          console.error('Failed to set remote answer:', err);
        }
      }
    });

    socket.on('call:answer', async ({ answer }) => {
      if (answer && pc.signalingState !== 'stable') {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          await drainPendingCandidates(pc);
        } catch (err) {
          console.error('Failed to set remote answer:', err);
        }
      }
    });

    socket.on('call:ice-candidate', async ({ candidate }) => {
      if (candidate) {
        if (pc.remoteDescription && pc.remoteDescription.type) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch {}
        } else {
          pendingCandidatesRef.current.push(candidate);
        }
      }
    });

    socket.on('call:rejected', () => {
      toast.error('Call declined');
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

  const drainPendingCandidates = async (pc) => {
    while (pendingCandidatesRef.current.length > 0) {
      const cand = pendingCandidatesRef.current.shift();
      try {
        await pc.addIceCandidate(new RTCIceCandidate(cand));
      } catch {}
    }
  };

  const startDurationTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const getMediaStream = async () => {
    return await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: isVideoCall
        ? {
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            facingMode: 'user',
          }
        : false,
    });
  };

  const initiateOutgoingCall = async (pc) => {
    try {
      const stream = await getMediaStream();
      localStreamRef.current = stream;

      if (localVideoRef.current && isVideoCall) {
        localVideoRef.current.srcObject = stream;
      }

      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: isVideoCall,
      });
      await pc.setLocalDescription(offer);

      socket.emit('call:initiate', {
        callee_id: getTargetId(),
        call_type: isVideoCall ? 'video' : 'audio',
        offer,
      });
    } catch (err) {
      console.error('initiateOutgoingCall error:', err);
      toast.error('Could not access microphone or camera');
      setCallState('ended');
      cleanupAndClose();
    }
  };

  const handleAcceptCall = async () => {
    const pc = peerConnectionRef.current;
    if (!pc) return;

    try {
      const stream = await getMediaStream();
      localStreamRef.current = stream;

      if (localVideoRef.current && isVideoCall) {
        localVideoRef.current.srcObject = stream;
      }

      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      if (callData.offer) {
        await pc.setRemoteDescription(new RTCSessionDescription(callData.offer));
        await drainPendingCandidates(pc);

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
        other_user_id: getTargetId(),
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
      {/* Hidden audio element ensuring remote audio/voice is always output loud and clear */}
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
