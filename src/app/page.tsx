'use client';

import React, { useState, useEffect } from 'react';
import { AdminLogin } from '../components/AdminLogin';
import { AdminHomePage } from '../components/AdminHomePage';
import HS_THEME from '../constants/theme';
import { Loader2 } from 'lucide-react';

interface AuthUser {
  username: string;
  role: string;
  name?: string;
}

export default function Home() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('hs_admin_user');
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch {
      // ignore
    } finally {
      setCheckingAuth(false);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('hs_admin_user');
    setUser(null);
  };

  if (checkingAuth) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: HS_THEME.colors.black }}
      >
        <Loader2
          className="w-8 h-8 animate-spin"
          style={{ color: HS_THEME.colors.primaryGold }}
        />
      </div>
    );
  }

  if (!user) {
    return <AdminLogin onLoginSuccess={(u) => setUser(u)} />;
  }

  return <AdminHomePage user={user} onLogout={handleLogout} />;
}
