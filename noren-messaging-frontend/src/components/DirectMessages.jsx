import { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { Search, Send, Phone, Video, Check, CheckCheck, AlertCircle, Paperclip } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DirectMessages({ onInitiateCall }) {
  const { user } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const [threads, setThreads] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchThreads();
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('chat:message', (newMsg) => {
      if (activeThread && newMsg.thread_id === activeThread.id) {
        setMessages(prev => [...prev, { ...newMsg, status: 'delivered' }]);
        scrollToBottom();
      }
    });

    socket.on('message:read_receipt', ({ thread_id }) => {
      if (activeThread && activeThread.id === thread_id) {
        setMessages(prev => prev.map(m => ({ ...m, status: 'read' })));
      }
    });

    return () => {
      socket.off('chat:message');
      socket.off('message:read_receipt');
    };
  }, [socket, activeThread]);

  const fetchThreads = async () => {
    try {
      const res = await api.get('/erp/communications/private/threads');
      setThreads(res.data);
    } catch {}
  };

  const handleSelectThread = async (thread) => {
    setActiveThread(thread);
    try {
      const res = await api.get(`/erp/communications/private/threads/${thread.id}/messages`);
      setMessages(res.data);
      scrollToBottom();
    } catch {}
  };

  const handleUserSearch = async (val) => {
    setSearchQuery(val);
    if (val.trim().length >= 2) {
      try {
        const res = await api.get(`/erp/communications/users/search?q=${encodeURIComponent(val)}`);
        setSearchResults(res.data);
      } catch {}
    } else {
      setSearchResults([]);
    }
  };

  const startThreadWithUser = async (targetUser) => {
    try {
      const res = await api.post('/erp/communications/private/threads', { participant_id: targetUser.id });
      const newThread = res.data.thread;
      fetchThreads();
      handleSelectThread({
        ...newThread,
        participant_id: targetUser.id,
        participant_name: targetUser.name,
        participant_avatar_url: targetUser.avatar_url,
      });
      setSearchQuery('');
      setSearchResults([]);
    } catch {
      toast.error('Failed to start thread');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeThread) return;

    const clientMsgId = `client-${Date.now()}`;
    const tempMsg = {
      id: clientMsgId,
      thread_id: activeThread.id,
      sender_user_id: user.id,
      message: messageInput.trim(),
      status: 'sending',
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, tempMsg]);
    setMessageInput('');
    scrollToBottom();

    try {
      const res = await api.post(`/erp/communications/private/threads/${activeThread.id}/messages`, {
        message: tempMsg.message,
        client_msg_id: clientMsgId,
      });

      setMessages(prev => prev.map(m => m.id === clientMsgId ? { ...res.data, status: 'sent' } : m));
    } catch {
      setMessages(prev => prev.map(m => m.id === clientMsgId ? { ...m, status: 'failed' } : m));
      toast.error('Failed to send message');
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <div className="w-full h-[calc(100vh-6rem)] glass-panel rounded-3xl border border-white/10 overflow-hidden flex shadow-2xl">
      {/* Thread List Sidebar */}
      <div className="w-full md:w-80 border-r border-white/10 flex flex-col bg-black/60">
        {/* Search */}
        <div className="p-4 border-b border-white/10">
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => handleUserSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl glass-input"
            />
          </div>

          {/* Search Dropdown */}
          {searchResults.length > 0 && (
            <div className="mt-2 bg-neutral-900 rounded-xl border border-white/20 p-2 space-y-1 z-20 relative">
              {searchResults.map(u => (
                <button
                  key={u.id}
                  onClick={() => startThreadWithUser(u)}
                  className="w-full text-left px-3 py-2 text-xs text-neutral-200 hover:bg-white/10 rounded-lg flex items-center gap-2"
                >
                  <div className="w-6 h-6 rounded-full bg-neutral-800 overflow-hidden">
                    {u.avatar_url && <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <span>{u.name} ({u.email})</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {threads.map(t => {
            const isOnline = onlineUsers.has(t.participant_id);
            const isSelected = activeThread?.id === t.id;
            return (
              <button
                key={t.id}
                onClick={() => handleSelectThread(t)}
                className={`w-full p-3 rounded-2xl flex items-center gap-3 transition-all text-left ${
                  isSelected ? 'liquid-pill border-white/30 text-white shadow-lg' : 'hover:bg-white/5 text-neutral-300'
                }`}
              >
                <div className="relative w-10 h-10 rounded-full bg-neutral-800 overflow-hidden shrink-0 ring-2 ring-white/20">
                  {t.participant_avatar_url ? (
                    <img src={t.participant_avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-neutral-300">
                      {t.participant_name?.[0]}
                    </div>
                  )}
                  {isOnline && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-black" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <h5 className="text-xs font-bold text-white truncate">{t.participant_name}</h5>
                    <span className="text-[10px] text-neutral-400">
                      {new Date(t.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 truncate mt-0.5">{t.last_message || 'Start a conversation'}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="hidden md:flex flex-1 flex-col bg-black/80">
        {activeThread ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between glass-panel">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-neutral-800 overflow-hidden ring-2 ring-white/30">
                  {activeThread.participant_avatar_url && (
                    <img src={activeThread.participant_avatar_url} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">{activeThread.participant_name}</h4>
                  <p className="text-xs text-emerald-400 font-medium">
                    {onlineUsers.has(activeThread.participant_id) ? 'Online' : 'Offline'}
                  </p>
                </div>
              </div>

              {/* Call Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onInitiateCall(activeThread.participant_id, 'audio')}
                  className="p-2.5 text-white hover:text-white rounded-full btn-liquid-ghost"
                  title="Voice Call"
                >
                  <Phone className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onInitiateCall(activeThread.participant_id, 'video')}
                  className="p-2.5 text-white hover:text-white rounded-full btn-liquid-ghost"
                  title="Video Call"
                >
                  <Video className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((m) => {
                const isMine = m.sender_user_id === user.id;
                return (
                  <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[70%] p-3 rounded-2xl text-xs space-y-1 ${
                        isMine
                          ? 'btn-liquid-solid text-black'
                          : 'bg-neutral-900 border border-white/10 text-white'
                      }`}
                    >
                      {m.attachment_url && (
                        <div className="mb-1 rounded-xl overflow-hidden max-h-48 border border-black/20">
                          {m.attachment_url.match(/\.(mp4|webm|mov)$/i) ? (
                            <video src={m.attachment_url} controls className="w-full h-full object-cover" />
                          ) : (
                            <img src={m.attachment_url} alt="Attachment" className="w-full h-full object-cover" />
                          )}
                        </div>
                      )}
                      <p className="leading-relaxed font-medium">{m.message}</p>
                      <div className="flex items-center justify-end gap-1 text-[10px] opacity-75">
                        <span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {isMine && (
                          <span>
                            {m.status === 'sending' && '⏳'}
                            {m.status === 'sent' && <Check className="w-3 h-3 inline" />}
                            {(m.status === 'delivered' || m.status === 'read') && <CheckCheck className="w-3 h-3 inline" />}
                            {m.status === 'failed' && <AlertCircle className="w-3 h-3 text-rose-500 inline" />}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10 flex items-center gap-2 glass-panel">
              <input
                type="file"
                id="dmFileInput"
                accept="image/*,video/*"
                className="hidden"
                onChange={async (e) => {
                  const files = e.target.files;
                  if (!files || !files.length) return;
                  const formData = new FormData();
                  formData.append('files', files[0]);
                  try {
                    toast.loading('Uploading attachment...', { id: 'dmUpload' });
                    const res = await api.post('/social/upload', formData, {
                      headers: { 'Content-Type': 'multipart/form-data' }
                    });
                    toast.success('Attached from device!', { id: 'dmUpload' });
                    // Automatically send attachment message
                    if (socket && activeThread) {
                      socket.emit('chat:send_message', {
                        threadId: activeThread.id,
                        receiverId: activeThread.participant_id,
                        message: 'Sent an attachment',
                        attachmentUrl: res.data.url,
                      });
                    }
                  } catch {
                    toast.error('Failed to attach file', { id: 'dmUpload' });
                  }
                }}
              />

              <button
                type="button"
                onClick={() => document.getElementById('dmFileInput')?.click()}
                className="p-2.5 rounded-full btn-liquid-ghost text-white"
                title="Attach photo/video from device"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              <input
                type="text"
                placeholder="Type a message..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                className="flex-1 px-4 py-2.5 text-xs rounded-full glass-input text-white"
              />
              <button
                type="submit"
                className="p-2.5 rounded-full btn-liquid-solid text-black font-bold flex items-center justify-center"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-neutral-400 p-8">
            <p className="text-lg font-bold text-white mb-1">Your Direct Messages</p>
            <p className="text-xs text-neutral-400">Select a conversation or search for a user to start messaging.</p>
          </div>
        )}
      </div>
    </div>
  );
}
