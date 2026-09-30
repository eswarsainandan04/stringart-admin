'use client';

import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';
import HS_THEME from '../constants/theme';

interface AdminLoginProps {
  onLoginSuccess: (user: { username: string; role: string; name?: string }) => void;
}

export function AdminLogin({ onLoginSuccess }: AdminLoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedUser = username.trim();
    if (!trimmedUser) {
      setErrorMessage('Please enter your admin email or username.');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmedUser, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        localStorage.setItem('hs_admin_user', JSON.stringify(data.user));
        onLoginSuccess(data.user);
      } else {
        setErrorMessage(data.message || 'Invalid username or password.');
      }
    } catch {
      setErrorMessage('Unable to connect to the authentication server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 sm:p-6"
      style={{ backgroundColor: HS_THEME.colors.creamBg }}
    >
      {/* Dark Teal Login Card matching HS Creations Signature Styling */}
      <div
        className="w-full max-w-md p-8 sm:p-10 rounded-[20px] transition-all duration-300"
        style={{
          backgroundColor: HS_THEME.colors.darkTeal,
          border: `1px solid ${HS_THEME.colors.darkTealBorder}`,
          boxShadow: '0 20px 48px rgba(17, 40, 38, 0.45)',
        }}
      >
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          
          <span
            className="text-xs font-extrabold tracking-[0.2em] uppercase mb-1"
            style={{ color: HS_THEME.colors.primaryGold }}
          >
            HS CREATION
          </span>
          <h1 className="text-2xl font-bold text-white tracking-tight">Admin Portal</h1>
        </div>

        {/* Error Alert Banner */}
        {errorMessage && (
          <div
            className="flex items-center gap-2.5 p-3.5 mb-6 rounded-xl text-xs font-medium animate-fadeIn"
            style={{
              backgroundColor: HS_THEME.colors.errorBg,
              border: `1px solid ${HS_THEME.colors.errorBorder}`,
              color: HS_THEME.colors.errorText,
            }}
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Username / Email */}
          <div>
            <label
              htmlFor="username"
              className="block text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: HS_THEME.colors.primaryGoldLight }}
            >
              Username / Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="johndoe@company.com"
                disabled={loading}
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder-zinc-500 outline-none transition-all duration-200"
                style={{
                  backgroundColor: HS_THEME.colors.darkTealInput,
                  border: `1px solid ${HS_THEME.colors.darkTealBorder}`,
                }}
                onFocus={(e) => (e.target.style.borderColor = HS_THEME.colors.primaryGold)}
                onBlur={(e) => (e.target.style.borderColor = HS_THEME.colors.darkTealBorder)}
                autoCapitalize="none"
                autoComplete="username"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="block text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: HS_THEME.colors.primaryGoldLight }}
            >
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="••••••••"
                disabled={loading}
                className="w-full pl-10 pr-12 py-3 rounded-xl text-sm text-white placeholder-zinc-500 outline-none transition-all duration-200"
                style={{
                  backgroundColor: HS_THEME.colors.darkTealInput,
                  border: `1px solid ${HS_THEME.colors.darkTealBorder}`,
                }}
                onFocus={(e) => (e.target.style.borderColor = HS_THEME.colors.primaryGold)}
                onBlur={(e) => (e.target.style.borderColor = HS_THEME.colors.darkTealBorder)}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-white transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Signature Gold Pill Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 mt-2 rounded-full font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 hover:opacity-95 active:scale-[0.99] disabled:opacity-50"
            style={{
              backgroundColor: HS_THEME.colors.primaryGold,
              color: '#000000',
              boxShadow: '0 6px 20px rgba(229, 192, 68, 0.35)',
            }}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                <span>AUTHENTICATING...</span>
              </>
            ) : (
              <span>LOGIN TO ADMIN</span>
            )}
          </button>
        </form>

        {/* Footer Note */}
        <div className="mt-8 text-center">
          <p className="text-[11px]" style={{ color: HS_THEME.colors.textMuted }}>
            Authorized Personnel Only • HS Creations IoT
          </p>
        </div>
      </div>
    </div>
  );
}
