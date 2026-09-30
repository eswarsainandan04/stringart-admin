'use client';

import React from 'react';
import { Home, Users, Cpu, BarChart3, User, ShoppingBag, Mail } from 'lucide-react';

export type TabType = 'home' | 'users' | 'machines' | 'analytics' | 'purchase' | 'invitations';

interface SlidebarProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  email?: string;
}

const NAV_ITEMS: { id: TabType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'machines', label: 'String Art Machines', icon: Cpu },
  { id: 'purchase', label: 'Purchase', icon: ShoppingBag },
  { id: 'invitations', label: 'Invitation', icon: Mail },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

export function Slidebar({ activeTab, onSelectTab, email }: SlidebarProps) {
  return (
    <aside className="w-64 bg-[#112826] border-r border-[#234a45] flex flex-col justify-between shrink-0 p-3">
      {/* Navigation Items */}
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left cursor-pointer ${
                isActive
                  ? 'bg-[#e5c044]/20 text-[#e5c044] font-semibold'
                  : 'text-zinc-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User Email & Circle Icon at Bottom */}
      {email && (
        <div className="pt-3 border-t border-[#234a45] flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#e5c044]/20 border border-[#e5c044]/40 flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-[#e5c044]" />
          </div>
          <span className="text-xs text-zinc-300 truncate" title={email}>
            {email}
          </span>
        </div>
      )}
    </aside>
  );
}
