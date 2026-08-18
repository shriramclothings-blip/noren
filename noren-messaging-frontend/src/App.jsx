import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider, useSocket } from './context/SocketContext';
import { Toaster } from 'react-hot-toast';

import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import BottomBar from './components/BottomBar';
import StoriesBar from './components/StoriesBar';
import PostCard from './components/PostCard';
import CreatePostModal from './components/CreatePostModal';
import ReelsView from './components/ReelsView';
import DirectMessages from './components/DirectMessages';
import ProfileView from './components/ProfileView';
import SearchView from './components/SearchView';
import SettingsView from './components/SettingsView';
import WebRTCCallModal from './components/WebRTCCallModal';

import { useEffect } from 'react';
import api from './utils/api';

const DEFAULT_SAMPLE_POSTS = [
  {
    id: 'sample-1',
    author_name: 'Vesper AI Labs',
    author_username: 'vesper_ai',
    author_avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
    author_verified: true,
    caption: 'Welcome to NOREN Social — Operational AI Infrastructure meets next-gen real-time communication.',
    location: 'Silicon Valley, CA',
    created_at: new Date().toISOString(),
    likes_count: 1420,
    comments_count: 88,
    reposts_count: 312,
    is_liked: false,
    is_saved: false,
    is_reposted: false,
    media: [
      {
        id: 'media-1',
        media_type: 'image',
        media_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200',
      },
    ],
  },
  {
    id: 'sample-2',
    author_name: 'Antigravity Systems',
    author_username: 'antigravity',
    author_avatar: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=150',
    author_verified: true,
    caption: 'Autonomous agents collaborating seamlessly across real-time media streams and high-performance workflows.',
    location: 'Global Edge Network',
    created_at: new Date().toISOString(),
    likes_count: 2890,
    comments_count: 142,
    reposts_count: 520,
    is_liked: true,
    is_saved: true,
    is_reposted: false,
    media: [
      {
        id: 'media-2',
        media_type: 'image',
        media_url: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=1200',
      },
    ],
  },
];

function HomeFeed({ onOpenCreatePost }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeed();
  }, []);

  const fetchFeed = async () => {
    setLoading(true);
    try {
      const res = await api.get('/social/feed');
      if (res.data?.posts && res.data.posts.length > 0) {
        setPosts(res.data.posts);
      } else {
        setPosts(DEFAULT_SAMPLE_POSTS);
      }
    } catch {
      setPosts(DEFAULT_SAMPLE_POSTS);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* 24h Stories Bar */}
      <StoriesBar />

      {/* Posts Feed */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="glass-card rounded-2xl p-4 h-96 animate-pulse" />
          ))}
        </div>
      ) : !posts.length ? (
        <div className="glass-card rounded-3xl p-12 text-center border border-white/10 space-y-3 shadow-2xl">
          <h3 className="text-xl font-bold text-white">Welcome to NOREN Social</h3>
          <p className="text-xs text-neutral-400">Share your first post or explore community creators to populate your feed.</p>
          <button
            onClick={onOpenCreatePost}
            className="px-6 py-2.5 rounded-full btn-liquid-solid font-medium text-xs shadow-lg transition-all"
          >
            Create First Post
          </button>
        </div>
      ) : (
        posts.map((post) => <PostCard key={post.id} post={post} />)
      )}
    </div>
  );
}

import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';

function LoginView() {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isRegister) {
        await register(name, email, password);
        toast.success('Account created successfully');
      } else {
        await login(email, password);
        toast.success('Welcome back!');
      }
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md glass-panel rounded-3xl p-8 border border-slate-800 shadow-2xl">
        <h2 className="text-2xl font-black text-white text-center mb-1">
          {isRegister ? 'Join NOREN Social' : 'Welcome Back'}
        </h2>
        <p className="text-xs text-neutral-400 text-center mb-6">
          Access NOREN Social with your existing ecosystem account.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl glass-input"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl glass-input"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl glass-input"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 font-bold text-white text-sm hover:from-cyan-400 hover:to-blue-500 transition-all shadow-md shadow-cyan-500/20 disabled:opacity-50"
          >
            {submitting ? 'Authenticating...' : isRegister ? 'Create Account' : 'Log In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-xs text-cyan-400 hover:underline"
          >
            {isRegister ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MainLayout() {
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [activeCallData, setActiveCallData] = useState(null);
  const { incomingCall, setIncomingCall } = useSocket();

  const handleInitiateCall = (targetId, callType) => {
    setActiveCallData({ targetId, callType, isIncoming: false });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#000000]">
      <Navbar onOpenCreatePost={() => setShowCreatePost(true)} />

      <div className="flex-1 max-w-7xl w-full mx-auto flex gap-6 p-4 lg:p-6">
        <Sidebar />
        <main className="flex-1 min-w-0 pb-16 md:pb-0">
          <Routes>
            <Route path="/" element={<HomeFeed onOpenCreatePost={() => setShowCreatePost(true)} />} />
            <Route path="/explore" element={<SearchView />} />
            <Route path="/search" element={<SearchView />} />
            <Route path="/reels" element={<ReelsView />} />
            <Route path="/messages" element={<DirectMessages onInitiateCall={handleInitiateCall} />} />
            <Route path="/profile/:username" element={<ProfileView />} />
            <Route path="/settings" element={<SettingsView />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      <BottomBar />

      {/* Create Post Modal */}
      {showCreatePost && (
        <CreatePostModal onClose={() => setShowCreatePost(false)} onPostCreated={() => window.location.reload()} />
      )}

      {/* WebRTC Calling Modal */}
      {(activeCallData || incomingCall) && (
        <WebRTCCallModal
          callData={incomingCall ? { ...incomingCall, isIncoming: true } : activeCallData}
          onClose={() => {
            setActiveCallData(null);
            setIncomingCall(null);
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <Toaster position="top-center" />
          <Routes>
            <Route path="/login" element={<LoginView />} />
            <Route path="/*" element={<MainLayout />} />
          </Routes>
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}
