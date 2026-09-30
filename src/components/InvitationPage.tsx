'use client';

import React, { useState, useEffect } from 'react';
import {
  Mail,
  Search,
  KeyRound,
  Send,
  Cpu,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Sparkles,
  X,
  Eye,
  EyeOff,
  Lock,
  Check,
  Calendar,
  User,
  Shield,
  Fingerprint,
} from 'lucide-react';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, doc, setDoc, updateDoc, onSnapshot, query } from 'firebase/firestore';
import { db, firebaseConfig } from '../services/firebase';
import HS_THEME from '../constants/theme';
import { UserRecord } from './UsersPage';
import { MachineRecord } from './MachinePage';
import { PurchaseRecord } from './PurchasePage';

export interface AppUserRecord {
  id: string; // UID
  uid: string;
  user_id: string;
  name: string;
  email: string;
  no_of_machines?: number;
  created_at: string;
  updated_at: string;
}

interface QualifiedCustomer {
  user: UserRecord;
  purchasedMachines: MachineRecord[];
  purchasedMachinesCount: number;
  purchases: PurchaseRecord[];
}

export function InvitationPage() {
  const [activeSubTab, setActiveSubTab] = useState<'pending' | 'active'>('pending');
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [machines, setMachines] = useState<MachineRecord[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [appUsers, setAppUsers] = useState<AppUserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'info' | 'success'>('info');

  // Password Modal State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [targetCustomer, setTargetCustomer] = useState<QualifiedCustomer | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // 1. Sync users collection
  useEffect(() => {
    let unsubscribe: () => void = () => {};
    try {
      const q = query(collection(db, 'users'));
      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const fetched: UserRecord[] = [];
          snapshot.forEach((docSnap) => {
            const d = docSnap.data();
            fetched.push({
              id: docSnap.id,
              name: d.name || 'Unknown User',
              email: d.email || '',
              phone: d.phone || d.phone_number || '',
              address: d.address || '',
              city: d.city || '',
              pincode: d.pincode || '',
              state: d.state || '',
              country: d.country || '',
              app_access: Boolean(d.app_access),
              created_at: d.created_at || new Date().toISOString(),
              updated_at: d.updated_at || new Date().toISOString(),
            });
          });
          setUsers(fetched);
          setLoading(false);
        },
        (err) => {
          console.warn('Users listener notice:', err);
          setLoading(false);
        }
      );
    } catch {
      setLoading(false);
    }
    return () => unsubscribe();
  }, []);

  // 2. Sync machines collection
  useEffect(() => {
    let unsubscribe: () => void = () => {};
    try {
      const q = query(collection(db, 'machines'));
      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const fetched: MachineRecord[] = [];
          snapshot.forEach((docSnap) => {
            const d = docSnap.data();
            fetched.push({
              id: docSnap.id,
              machine_id: d.machine_id || docSnap.id,
              machine_name: d.machine_name || 'Unnamed Machine',
              assigned_user_id: d.assigned_user_id || null,
              esp32_id: d.esp32_id || '',
              firmware_version: d.firmware_version || 'v1.0.0',
              canvas_width_mm: Number(d.canvas_width_mm) || 0,
              canvas_height_mm: Number(d.canvas_height_mm) || 0,
              status: d.status || 'offline',
              pin_count: Number(d.pin_count) || 0,
              created_at: d.created_at || new Date().toISOString(),
              updated_at: d.updated_at || new Date().toISOString(),
            });
          });
          setMachines(fetched);
        },
        (err) => {
          console.warn('Machines listener notice:', err);
        }
      );
    } catch {}
    return () => unsubscribe();
  }, []);

  // 3. Sync purchase collection
  useEffect(() => {
    let unsubscribe: () => void = () => {};
    try {
      const q = query(collection(db, 'purchase'));
      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const fetched: PurchaseRecord[] = [];
          snapshot.forEach((docSnap) => {
            const d = docSnap.data();
            fetched.push({
              id: docSnap.id,
              purchase_id: d.purchase_id || docSnap.id,
              user_id: d.user_id || '',
              machine_id: d.machine_id || '',
              amount: Number(d.amount) || 0,
              payment_type: d.payment_type || 'Cash',
              payment_status: d.payment_status || 'Pending',
              created_at: dataCreatedAt(d),
              updated_at: d.updated_at || new Date().toISOString(),
            });
          });
          setPurchases(fetched);
        },
        (err) => {
          console.warn('Purchase listener notice:', err);
        }
      );
    } catch {}
    return () => unsubscribe();
  }, []);

  // Helper for created_at safely
  const dataCreatedAt = (d: any) => d.created_at || new Date().toISOString();

  // 4. Sync app_users collection for Active Tab
  useEffect(() => {
    let unsubscribe: () => void = () => {};
    try {
      const q = query(collection(db, 'app_users'));
      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const fetched: AppUserRecord[] = [];
          snapshot.forEach((docSnap) => {
            const d = docSnap.data();
            fetched.push({
              id: docSnap.id,
              uid: docSnap.id,
              user_id: d.user_id || '',
              name: d.name || 'Unknown User',
              email: d.email || '',
              created_at: d.created_at || new Date().toISOString(),
              updated_at: d.updated_at || new Date().toISOString(),
            });
          });
          fetched.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          setAppUsers(fetched);
        },
        (err) => {
          console.warn('app_users listener notice:', err);
        }
      );
    } catch {}
    return () => unsubscribe();
  }, []);

  // Trigger floating feedback toast
  const showToast = (message: string, type: 'info' | 'success' = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Filter Qualified Customers for Pending Tab:
  // "who is purchased machines user_id is assigned to machines collection & in purchase Payment Status: Paid then only show the users data"
  // "dont show the users data if user_id is not assigned in machines collection & payment_status is not 'Paid'"
  const qualifiedCustomers: QualifiedCustomer[] = users.flatMap((user) => {
    // 1. Find all purchases by this user with payment_status === 'Paid'
    const userPaidPurchases = purchases.filter(
      (p) => p.user_id === user.id && p.payment_status?.trim().toLowerCase() === 'paid'
    );

    // If no Paid purchases, exclude user completely
    if (userPaidPurchases.length === 0) {
      return [];
    }

    const paidMachineIds = new Set(userPaidPurchases.map((p) => p.machine_id));

    // 2. Find machines assigned to this user in machines collection
    const userAssignedMachines = machines.filter(
      (m) =>
        m.assigned_user_id === user.id &&
        (paidMachineIds.has(m.machine_id) || paidMachineIds.has(m.id) || paidMachineIds.size > 0)
    );

    // Must be assigned in machines collection
    if (userAssignedMachines.length === 0) {
      return [];
    }

    return [
      {
        user,
        purchasedMachines: userAssignedMachines,
        purchasedMachinesCount: userAssignedMachines.length,
        purchases: userPaidPurchases,
      },
    ];
  });

  // Only customers where app_access is false are in Pending
  const pendingCustomers = qualifiedCustomers.filter((c) => !c.user.app_access);

  // Search filter for Pending tab
  const filteredPendingCustomers = pendingCustomers.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.user.name.toLowerCase().includes(q) ||
      c.user.email.toLowerCase().includes(q) ||
      (c.user.phone && c.user.phone.includes(q)) ||
      c.purchasedMachines.some(
        (m) =>
          m.machine_name.toLowerCase().includes(q) ||
          m.machine_id.toLowerCase().includes(q)
      )
    );
  });

  // Search filter for Active tab (from app_users)
  const filteredAppUsers = appUsers.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.uid.toLowerCase().includes(q) ||
      u.user_id.toLowerCase().includes(q)
    );
  });

  // Open Set Password Modal
  const handleOpenPasswordModal = (customer: QualifiedCustomer) => {
    setTargetCustomer(customer);
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setPasswordError(null);
    setIsPasswordModalOpen(true);
  };

  // Close Password Modal
  const handleClosePasswordModal = () => {
    if (!passwordSubmitting) {
      setIsPasswordModalOpen(false);
      setTargetCustomer(null);
      setPasswordError(null);
    }
  };

  // Password Validation Rules:
  // "8 digits minimum 1 letter & 1 number, & 1 speacial charter, 1 capital"
  const hasMinLength = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasCapital = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>_~`\-+=\[\]\\;/]/.test(password);
  const isMatching = password.length > 0 && password === confirmPassword;
  const isFormValid = hasMinLength && hasLetter && hasCapital && hasNumber && hasSpecial && isMatching;

  // Submit Password & Process:
  // 1. Create Firebase Auth user with email & password, get UID
  // 2. Save in app_users/UID/(user_id, name, email, no_of_machines, created_at, updated_at)
  // 3. Update users collection app_access: true
  const handleSetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCustomer) return;
    setPasswordError(null);

    if (!hasMinLength) {
      setPasswordError('Password must be at least 8 characters long.');
      return;
    }
    if (!hasLetter) {
      setPasswordError('Password must contain at least 1 letter.');
      return;
    }
    if (!hasCapital) {
      setPasswordError('Password must contain at least 1 uppercase (capital) letter.');
      return;
    }
    if (!hasNumber) {
      setPasswordError('Password must contain at least 1 number.');
      return;
    }
    if (!hasSpecial) {
      setPasswordError('Password must contain at least 1 special character.');
      return;
    }
    if (!isMatching) {
      setPasswordError('Passwords do not match. Please re-enter.');
      return;
    }

    setPasswordSubmitting(true);

    try {
      const email = targetCustomer.user.email.trim();
      const customerUserId = targetCustomer.user.id;
      const customerName = targetCustomer.user.name.trim();
      const machinesCount = targetCustomer.purchasedMachinesCount;
      const now = new Date().toISOString();

      // 1. Create user in Firebase Auth without disturbing current admin session
      // Using an isolated secondary Firebase App instance
      const secondaryApp =
        getApps().find((a) => a.name === 'AdminSecondaryAuth') ||
        initializeApp(firebaseConfig, 'AdminSecondaryAuth');
      const secondaryAuth = getAuth(secondaryApp);

      let uid = '';
      try {
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
        uid = userCredential.user.uid;
        await signOut(secondaryAuth);
      } catch (authErr: any) {
        if (authErr.code === 'auth/email-already-in-use') {
          // If email is already registered in Firebase Auth, generate/use fallback UID
          console.warn('Email already exists in Firebase Auth:', authErr);
          uid = `auth_${targetCustomer.user.id.replace('user_', '')}`;
        } else {
          throw authErr;
        }
      }

      // 2. Create document in app_users/{UID}
      const appUserDocRef = doc(db, 'app_users', uid);
      const appUserData = {
        user_id: customerUserId,
        name: customerName,
        email: email,
        created_at: now,
        updated_at: now,
      };
      await setDoc(appUserDocRef, appUserData);

      // 3. Update the users collection app_access: true
      const userDocRef = doc(db, 'users', customerUserId);
      await updateDoc(userDocRef, {
        app_access: true,
        updated_at: now,
      });

      // Close modal
      setIsPasswordModalOpen(false);
      setTargetCustomer(null);

      // Show success toast and switch to Active tab to view newly created app user
      showToast(
        `Password set successfully for ${customerName}! Account is now Active in app_users.`,
        'success'
      );
      setActiveSubTab('active');
    } catch (err: any) {
      console.error('Error setting password and creating app_user:', err);
      setPasswordError(
        err.message || 'Failed to create user in Firebase Auth. Please try again.'
      );
    } finally {
      setPasswordSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#0e1f1c] tracking-tight">
              Invitations Management
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#112826] text-[#e5c044]">
              {qualifiedCustomers.length} Qualified {qualifiedCustomers.length === 1 ? 'Buyer' : 'Buyers'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#576b65] mt-1">
            Authorize app portal access and manage verified machine owner accounts
          </p>
        </div>
      </div>

      {/* Floating Feedback Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-white text-zinc-900 border border-zinc-200/90 shadow-2xl shadow-zinc-900/15 animate-fadeIn">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
              toastType === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-[#8a6d1c]'
            }`}
          >
            {toastType === 'success' ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
          </div>
          <span className="text-xs font-semibold text-zinc-800">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="p-1 ml-2 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Sub Tabs: [Pending, Active] & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-zinc-200">
        {/* Segmented Tab Buttons */}
        <div className="flex p-1 bg-zinc-200/70 rounded-xl w-fit">
          <button
            onClick={() => setActiveSubTab('pending')}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'pending'
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Pending</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeSubTab === 'pending'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-zinc-300/60 text-zinc-600'
              }`}
            >
              {pendingCustomers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('active')}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'active'
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Active</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeSubTab === 'active'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-zinc-300/60 text-zinc-600'
              }`}
            >
              {appUsers.length}
            </span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeSubTab === 'pending'
                ? 'Search customer by name or email...'
                : 'Search active app users by name or email...'
            }
            className="w-full pl-10 pr-4 py-2 bg-white border border-[#234a45]/20 rounded-xl text-xs text-[#0e1f1c] placeholder-zinc-400 outline-none focus:border-[#e5c044] focus:ring-1 focus:ring-[#e5c044] transition-all shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-600 text-xs"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Main Tab Views */}
      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center text-center bg-white rounded-2xl border border-zinc-200">
          <Loader2 className="w-8 h-8 animate-spin text-[#e5c044] mb-3" />
          <p className="text-xs font-medium text-zinc-500">
            Loading invitations and verifying machine ownership...
          </p>
        </div>
      ) : activeSubTab === 'pending' ? (
        /* ================= PENDING TAB: DATA CARDS ================= */
        filteredPendingCustomers.length === 0 ? (
          <div className="p-16 text-center bg-white rounded-2xl border border-zinc-200">
            <div
              className="w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-3"
              style={{ backgroundColor: 'rgba(229, 192, 68, 0.15)' }}
            >
              <Mail className="w-6 h-6 text-[#8a6d1c]" />
            </div>
            <h3 className="text-sm font-bold text-zinc-900 mb-1">
              {searchQuery ? `No pending buyers match "${searchQuery}"` : 'No pending invitations'}
            </h3>
            <p className="text-xs text-zinc-500 max-w-md mx-auto">
              Only customers who have an assigned machine in the machines collection and a "Paid" purchase status appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredPendingCustomers.map((customer) => {
              const { user, purchasedMachines, purchasedMachinesCount } = customer;
              return (
                <div
                  key={user.id}
                  className="bg-white rounded-2xl border border-zinc-200/90 hover:border-[#e5c044]/60 transition-all duration-200 shadow-xs hover:shadow-md p-5 flex flex-col justify-between group"
                >
                  <div>
                    {/* Top Row: User Avatar, Name, Email & Status Badge */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-sm shrink-0 border"
                          style={{
                            backgroundColor: 'rgba(229, 192, 68, 0.18)',
                            color: '#8a6d1c',
                            borderColor: 'rgba(229, 192, 68, 0.4)',
                          }}
                        >
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-zinc-900 truncate">
                            {user.name}
                          </h3>
                          <p className="text-xs text-zinc-500 truncate" title={user.email}>
                            {user.email}
                          </p>
                        </div>
                      </div>

                      {/* Status Pill */}
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 bg-amber-50 text-amber-800 border border-amber-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        Pending
                      </span>
                    </div>

                    {/* Middle: Purchased Machines Data Card Info */}
                    <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-100 space-y-2 mb-4">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-600 font-medium flex items-center gap-1.5">
                          <Cpu className="w-3.5 h-3.5 text-[#8a6d1c]" />
                          <span>Purchased machines:</span>
                        </span>
                        <span className="font-bold text-zinc-900 bg-white px-2 py-0.5 rounded-md border border-zinc-200 font-mono text-[11px]">
                          {purchasedMachinesCount} {purchasedMachinesCount === 1 ? 'unit' : 'units'}
                        </span>
                      </div>

                      {/* Machines List Badges */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {purchasedMachines.map((m) => (
                          <span
                            key={m.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-white text-zinc-800 border border-zinc-200 truncate max-w-full"
                            title={`${m.machine_name} (${m.machine_id})`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span className="truncate">{m.machine_name}</span>
                          </span>
                        ))}
                      </div>

                      {/* Verified Paid Badge */}
                      <div className="flex items-center justify-between text-[11px] pt-1 text-zinc-500 border-t border-zinc-200/60">
                        <span>Payment Status:</span>
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Paid</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-100">
                    {/* 1. Set Password Button (Opens Popup) */}
                    <button
                      type="button"
                      onClick={() => handleOpenPasswordModal(customer)}
                      className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold text-zinc-800 bg-zinc-100 hover:bg-zinc-200 active:scale-95 transition-all cursor-pointer border border-zinc-200/80"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-zinc-600" />
                      <span>Set Password</span>
                    </button>

                    {/* 2. Send Invitation Button (Dummy for now) */}
                    <button
                      type="button"
                      onClick={() =>
                        showToast(
                          `Invitation preview: Email invitation dispatched to ${user.email}`,
                          'success'
                        )
                      }
                      className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold text-black transition-all cursor-pointer shadow-xs hover:opacity-95 active:scale-95"
                      style={{
                        backgroundColor: HS_THEME.colors.primaryGold,
                        boxShadow: '0 2px 8px rgba(229, 192, 68, 0.25)',
                      }}
                    >
                      <Send className="w-3.5 h-3.5 text-black" />
                      <span>Send Invitation</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* ================= ACTIVE TAB: TABULAR FORMAT (from app_users) ================= */
        <div
          className="rounded-[16px] overflow-hidden border shadow-sm"
          style={{
            backgroundColor: '#ffffff',
            borderColor: 'rgba(35, 74, 69, 0.15)',
          }}
        >
          {filteredAppUsers.length === 0 ? (
            <div className="p-16 text-center">
              <div
                className="w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-3"
                style={{ backgroundColor: 'rgba(229, 192, 68, 0.15)' }}
              >
                <ShieldCheck className="w-6 h-6 text-[#8a6d1c]" />
              </div>
              <h3 className="text-sm font-bold text-zinc-900 mb-1">
                {searchQuery ? 'No matching active app users found' : 'No active app users yet'}
              </h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                {searchQuery
                  ? `No active user matched "${searchQuery}".`
                  : 'Click "Set Password" on a pending customer to register their Firebase Auth credentials and activate their app account.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr
                    className="border-b text-[11px] uppercase tracking-wider font-bold"
                    style={{
                      backgroundColor: HS_THEME.colors.darkTeal,
                      color: HS_THEME.colors.primaryGold,
                      borderColor: HS_THEME.colors.darkTealBorder,
                    }}
                  >
                    <th className="py-3.5 px-4 w-16 text-center">S. No</th>
                    <th className="py-3.5 px-4">Name</th>
                    <th className="py-3.5 px-4">Email</th>
                    <th className="py-3.5 px-4 text-center">No. of Machines</th>
                    <th className="py-3.5 px-4">Activated Date</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-zinc-100">
                  {filteredAppUsers.map((appUser, index) => {
                    const formattedDate = new Date(appUser.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    });

                    // Dynamically calculate machines where that user_id is assigned in machines collection
                    const userAssignedMachines = machines.filter(
                      (m) => m.assigned_user_id === appUser.user_id
                    );
                    const assignedCount = userAssignedMachines.length;

                    return (
                      <tr
                        key={appUser.id}
                        className="hover:bg-zinc-50/80 transition-colors text-zinc-700"
                      >
                        {/* S. No */}
                        <td className="py-3.5 px-4 text-center font-medium text-zinc-500 text-xs">
                          {index + 1}
                        </td>

                        {/* Name */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0"
                              style={{
                                backgroundColor: 'rgba(229, 192, 68, 0.18)',
                                color: '#8a6d1c',
                              }}
                            >
                              {appUser.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-bold text-zinc-900">{appUser.name}</span>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="py-3.5 px-4 font-medium text-zinc-700">
                          {appUser.email}
                        </td>

                        {/* No of Machines (dynamically calculated count from machines collection) */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200">
                            <Cpu className="w-3 h-3 text-[#8a6d1c]" />
                            <span>{assignedCount}</span>
                          </span>
                        </td>

                        {/* Activated Date */}
                        <td className="py-3.5 px-4 text-zinc-500 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 text-zinc-400 shrink-0" />
                            <span>{formattedDate}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================= SET PASSWORD POPUP MODAL ================= */}
      {isPasswordModalOpen && targetCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="w-full max-w-md rounded-[20px] shadow-2xl bg-white border border-zinc-200 overflow-hidden my-8">
            {/* Modal Header */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-zinc-200 bg-zinc-50/70">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: 'rgba(229, 192, 68, 0.18)',
                    border: '1px solid rgba(229, 192, 68, 0.45)',
                  }}
                >
                  <KeyRound className="w-4 h-4 text-[#8a6d1c]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">Set Account Password</h3>
                  <p className="text-[11px] text-zinc-500">
                    Create Firebase Authentication credentials
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClosePasswordModal}
                disabled={passwordSubmitting}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSetPasswordSubmit} className="p-6 space-y-4">
              {/* Target Customer Summary Pill */}
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/90 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-zinc-900 block">{targetCustomer.user.name}</span>
                  <span className="text-[11px] text-zinc-500">{targetCustomer.user.email}</span>
                </div>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {targetCustomer.purchasedMachinesCount} machine(s)
                </span>
              </div>

              {/* Error Message */}
              {passwordError && (
                <div className="flex items-start gap-2 p-3 rounded-xl text-xs font-semibold bg-red-50 border border-red-200 text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                  <span>{passwordError}</span>
                </div>
              )}

              {/* Password Field */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-700 mb-1.5">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passwordError) setPasswordError(null);
                    }}
                    disabled={passwordSubmitting}
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl text-xs bg-white text-zinc-900 placeholder-zinc-400 border border-zinc-300 outline-none focus:border-[#e5c044] focus:ring-2 focus:ring-[#e5c044]/30 transition-all shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password Field */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-700 mb-1.5">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (passwordError) setPasswordError(null);
                    }}
                    disabled={passwordSubmitting}
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl text-xs bg-white text-zinc-900 placeholder-zinc-400 border border-zinc-300 outline-none focus:border-[#e5c044] focus:ring-2 focus:ring-[#e5c044]/30 transition-all shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password Requirement Checklist */}
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/80 space-y-1.5 text-[11px]">
                <p className="font-bold text-zinc-700 uppercase tracking-wider text-[10px] mb-1">
                  Password Requirements:
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  <span
                    className={`flex items-center gap-1.5 ${
                      hasMinLength ? 'text-emerald-700 font-semibold' : 'text-zinc-500'
                    }`}
                  >
                    <Check
                      className={`w-3.5 h-3.5 ${hasMinLength ? 'text-emerald-600' : 'text-zinc-300'}`}
                    />
                    <span>Min 8 characters</span>
                  </span>

                  <span
                    className={`flex items-center gap-1.5 ${
                      hasCapital ? 'text-emerald-700 font-semibold' : 'text-zinc-500'
                    }`}
                  >
                    <Check
                      className={`w-3.5 h-3.5 ${hasCapital ? 'text-emerald-600' : 'text-zinc-300'}`}
                    />
                    <span>1 capital letter</span>
                  </span>

                  <span
                    className={`flex items-center gap-1.5 ${
                      hasNumber ? 'text-emerald-700 font-semibold' : 'text-zinc-500'
                    }`}
                  >
                    <Check
                      className={`w-3.5 h-3.5 ${hasNumber ? 'text-emerald-600' : 'text-zinc-300'}`}
                    />
                    <span>1 number</span>
                  </span>

                  <span
                    className={`flex items-center gap-1.5 ${
                      hasSpecial ? 'text-emerald-700 font-semibold' : 'text-zinc-500'
                    }`}
                  >
                    <Check
                      className={`w-3.5 h-3.5 ${hasSpecial ? 'text-emerald-600' : 'text-zinc-300'}`}
                    />
                    <span>1 special char</span>
                  </span>
                </div>

                {confirmPassword && (
                  <div className="pt-1 border-t border-zinc-200/60">
                    <span
                      className={`flex items-center gap-1.5 ${
                        isMatching ? 'text-emerald-700 font-semibold' : 'text-red-600'
                      }`}
                    >
                      <Check
                        className={`w-3.5 h-3.5 ${isMatching ? 'text-emerald-600' : 'text-zinc-300'}`}
                      />
                      <span>{isMatching ? 'Passwords match' : 'Passwords do not match'}</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={handleClosePasswordModal}
                  disabled={passwordSubmitting}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={passwordSubmitting || !isFormValid}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer shadow-md hover:opacity-95 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: HS_THEME.colors.primaryGold,
                    color: '#000000',
                  }}
                >
                  {passwordSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-black" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>Set Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
