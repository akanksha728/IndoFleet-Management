import React, { useState } from 'react';
import { X, Mail, Phone, User, Lock, Loader2, Package2 } from 'lucide-react';
import { apiClient } from '../api/client';

export interface SavedAddress {
  id: string;
  label: 'Home' | 'Work' | 'Office' | 'Warehouse' | 'Other';
  recipient_name?: string;
  recipient_phone?: string;
  full_address: string;
  landmark?: string;
  city?: string;
  pincode?: string;
  lat?: number;
  lng?: number;
  is_default?: boolean;
}

export interface DeliveryUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'customer' | 'admin' | 'state_manager' | 'hub_manager' | 'dispatcher' | 'operator' | 'viewer';
  is_email_verified?: boolean;
  is_phone_verified?: boolean;
  saved_addresses?: SavedAddress[];
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: DeliveryUser, token: string) => void;
  defaultMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess, defaultMode = 'login' }) => {
  const [mode, setMode] = useState<'login' | 'register'>(defaultMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isAdmin = email.toLowerCase().endsWith('@indowings.com');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (mode === 'login' && isAdmin) {
        const session = await apiClient.login(email.trim(), password || undefined);
        const user: DeliveryUser = {
          id: session.user.id,
          name: session.user.name || session.user.full_name,
          email: session.user.email,
          role: session.user.role
        };
        onSuccess(user, session.token);
        onClose();
        setEmail(''); setPhone(''); setName(''); setPassword('');
        return;
      }
      setError('Customer registration and OTP login require a configured identity provider. Use an IndoWings operations account to access this API.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not connect to the API.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 mx-4" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors">
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#3b0080] flex items-center justify-center">
            <Package2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-[#171222] text-base leading-tight">IndoWings Delivery</p>
            <p className="text-xs text-slate-400">Drone Delivery Platform</p>
          </div>
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6">
          {(['login', 'register'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setError(''); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${mode === m ? 'bg-white text-[#3b0080] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {m === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>
        {isAdmin && mode === 'login' && (
          <div className="mb-4 px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg text-xs text-[#3b0080] font-medium">
            🔐 Admin login detected
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={name} onChange={e => setName(e.target.value)} required placeholder="Full Name"
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#3b0080] focus:ring-2 focus:ring-purple-100" />
            </div>
          )}
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="Email Address"
              className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#3b0080] focus:ring-2 focus:ring-purple-100" />
          </div>
          {(!isAdmin || mode === 'register') && (
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required placeholder="Phone Number"
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#3b0080] focus:ring-2 focus:ring-purple-100" />
            </div>
          )}
          {isAdmin && mode === 'login' && (
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Admin Password"
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#3b0080] focus:ring-2 focus:ring-purple-100" />
            </div>
          )}
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-3 bg-[#3b0080] hover:bg-[#2d006b] text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
        <p className="text-center text-xs text-slate-400 mt-5">
          {mode === 'login' ? 'New user? ' : 'Already have account? '}
          <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
            className="text-[#3b0080] font-semibold hover:underline">
            {mode === 'login' ? 'Create account' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
};
