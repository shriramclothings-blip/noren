import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Lock, Eye, EyeOff, ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';

export function LoginScreen() {
  const { login } = useApp();
  const [form, setForm] = useState({ username: '', password: '' });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const ok = await login(form.username, form.password);
    if (!ok) toast.error('Invalid credentials');
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-600 via-primary-700 to-accent-600">
      <div className="w-full max-w-md p-8 bg-white dark:bg-gray-900 rounded-3xl shadow-2xl animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-2xl mb-4">
            <ShoppingBag size={32} className="text-primary-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">VENDEXA RetailOS™</h1>
          <p className="text-gray-500 text-sm mt-1">by Dinesh Global Enterprises Pvt Ltd</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Username</label>
            <input className="input" placeholder="admin" value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Password</label>
            <div className="relative">
              <input className="input pr-10" type={show ? 'text' : 'password'} placeholder="••••••••"
                value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
              <button type="button" onClick={() => setShow(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p className="text-center text-xs text-gray-400 mt-6">Default: admin / admin123</p>
      </div>
    </div>
  );
}

export function LockScreen() {
  const { setIsLocked, verifyPin, currentUser } = useApp();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handlePin = (digit) => {
    const newPin = pin + digit;
    setPin(newPin);
    if (newPin.length === 4) {
      if (verifyPin(newPin)) { setIsLocked(false); setPin(''); setError(''); }
      else { setError('Wrong PIN'); setPin(''); }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="text-center animate-slide-up">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 rounded-full mb-6">
          <Lock size={36} className="text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-1">Screen Locked</h2>
        <p className="text-gray-400 mb-8">{currentUser?.name} — Enter PIN to unlock</p>
        <div className="flex justify-center gap-3 mb-6">
          {[0,1,2,3].map(i => (
            <div key={i} className={`w-4 h-4 rounded-full border-2 border-white/50 ${i < pin.length ? 'bg-white' : 'bg-transparent'}`} />
          ))}
        </div>
        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
        <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
          {[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map((d, i) => (
            <button key={i} onClick={() => d === '⌫' ? setPin(p => p.slice(0,-1)) : d !== '' && handlePin(String(d))}
              className={`h-14 rounded-2xl text-xl font-semibold transition-all ${d === '' ? 'invisible' : 'bg-white/10 hover:bg-white/20 text-white active:scale-95'}`}>
              {d}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
