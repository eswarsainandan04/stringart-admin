'use client';

import React, { useState } from 'react';
import { LogOut } from 'lucide-react';
import { Slidebar, TabType } from './Slidebar';
import { UsersPage } from './UsersPage';
import { MachinePage } from './MachinePage';
import { PurchasePage } from './PurchasePage';
import { InvitationPage } from './InvitationPage';

interface AdminHomePageProps {
  user: {
    username: string;
    role: string;
    name?: string;
  };
  onLogout: () => void;
}

export function AdminHomePage({ user, onLogout }: AdminHomePageProps) {
  const [activeTab, setActiveTab] = useState<TabType>('home');

  return (
    <div className="min-h-screen flex flex-col bg-[#f3efe8] font-sans">
      {/* Top Horizontal Nav Bar */}
      <header className="w-full px-6 py-3.5 bg-black text-white flex items-center justify-between border-b border-[#234a45] shrink-0">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-sm tracking-wider uppercase text-[#e5c044]">
            HS Creations
          </span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#e5c044]/20 text-[#f5dc78] border border-[#e5c044]/30">
            Admin
          </span>
        </div>

        {/* Right: Log Out Button */}
        <div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold bg-[#e5c044] text-black hover:bg-[#d4ae33] transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log Out</span>
          </button>
        </div>
      </header>

      {/* Main Body: Sidebar Always Open */}
      <div className="flex-1 flex overflow-hidden">
        {/* Permanent Slidebar */}
        <Slidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          email={user.username}
        />

        {/* Content Area */}
        <main className="flex-1 p-6 overflow-y-auto">
          {activeTab !== 'users' && activeTab !== 'machines' && activeTab !== 'purchase' && activeTab !== 'invitations' && (
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-[#0e1f1c]">
                {activeTab === 'home' && 'Home'}
                {activeTab === 'analytics' && 'Analytics'}
              </h1>
            </div>
          )}

          {/* Tab Views */}
          {activeTab === 'users' ? (
            <UsersPage />
          ) : activeTab === 'machines' ? (
            <MachinePage />
          ) : activeTab === 'purchase' ? (
            <PurchasePage />
          ) : activeTab === 'invitations' ? (
            <InvitationPage />
          ) : (
            <div className="text-zinc-500 text-sm">
              {/* Clean blank area for the other tabs */}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
