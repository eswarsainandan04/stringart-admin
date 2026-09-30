'use client';

import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Plus,
  Search,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Trash2,
  WifiOff,
  User,
  Users,
  UserPlus,
  Cpu,
  IndianRupee,
  Calendar,
  Check,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
} from 'lucide-react';
import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  deleteDoc,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import HS_THEME from '../constants/theme';
import {
  CountrySelect,
  StateSelect,
  PhonecodeSelect,
} from 'react-country-state-city';
import 'react-country-state-city/dist/react-country-state-city.css';
import { UserRecord } from './UsersPage';
import { MachineRecord } from './MachinePage';

export interface PurchaseRecord {
  id: string; // purchase_id
  purchase_id: string;
  user_id: string;
  machine_id: string;
  amount: number;
  payment_type: 'Cash' | 'UPI' | 'Bank Transfer' | string;
  payment_status: 'Pending' | 'Paid' | 'Cancelled' | 'Refunded' | string;
  created_at: string;
  updated_at: string;
}

export function PurchasePage() {
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [machines, setMachines] = useState<MachineRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [userSelectionMode, setUserSelectionMode] = useState<'existing' | 'new'>('existing');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [firestoreStatus, setFirestoreStatus] = useState<'connected' | 'offline' | 'permission_error'>('connected');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Step 1: Existing User Search & Selection
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);

  // Step 1: New User Form State
  const [countryId, setCountryId] = useState<number>(101);
  const [phoneCode, setPhoneCode] = useState<string>('+91');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'checking' | 'duplicate' | 'available'>('idle');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [newUserData, setNewUserData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    pincode: '',
    state: 'Andhra Pradesh',
    country: 'India',
  });

  // Step 2: Machine & Payment Form State
  const [selectedMachineId, setSelectedMachineId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentType, setPaymentType] = useState<'Cash' | 'UPI' | 'Bank Transfer'>('UPI');
  const [paymentStatus, setPaymentStatus] = useState<'Pending' | 'Paid' | 'Cancelled' | 'Refunded'>('Paid');

  // Load cached purchases initially
  useEffect(() => {
    try {
      const cached = localStorage.getItem('hs_cached_purchases');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPurchases(parsed);
          setLoading(false);
        }
      }
    } catch {}
  }, []);

  // Sync purchases collection in real-time
  useEffect(() => {
    let unsubscribe: () => void = () => {};
    try {
      const purchaseRef = collection(db, 'purchase');
      const q = query(purchaseRef);

      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const fetched: PurchaseRecord[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            fetched.push({
              id: docSnap.id,
              purchase_id: data.purchase_id || docSnap.id,
              user_id: data.user_id || '',
              machine_id: data.machine_id || '',
              amount: Number(data.amount) || 0,
              payment_type: data.payment_type || 'Cash',
              payment_status: data.payment_status || 'Pending',
              created_at: data.created_at || new Date().toISOString(),
              updated_at: data.updated_at || new Date().toISOString(),
            });
          });

          fetched.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          setPurchases(fetched);
          setFirestoreStatus('connected');
          setStatusMessage(null);
          setLoading(false);

          try {
            localStorage.setItem('hs_cached_purchases', JSON.stringify(fetched));
          } catch {}
        },
        (error) => {
          console.warn('Firestore purchases snapshot notice:', error);
          setLoading(false);
          if (error.code === 'permission-denied') {
            setFirestoreStatus('permission_error');
            setStatusMessage('Cloud Firestore Permission Denied. In Firebase Console > Firestore > Rules, please allow read/write.');
          } else {
            setFirestoreStatus('offline');
            setStatusMessage('Cloud Firestore is operating in offline mode.');
          }
        }
      );
    } catch (err) {
      console.warn('Firestore purchase initialization notice:', err);
      setLoading(false);
    }
    return () => unsubscribe();
  }, []);

  // Sync users collection for mapping and selection
  useEffect(() => {
    let unsubscribe: () => void = () => {};
    try {
      const usersRef = collection(db, 'users');
      unsubscribe = onSnapshot(usersRef, (snapshot) => {
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
      });
    } catch (err) {
      console.warn('Users sync warning:', err);
    }
    return () => unsubscribe();
  }, []);

  // Sync machines collection for dropdown and mapping
  useEffect(() => {
    let unsubscribe: () => void = () => {};
    try {
      const machinesRef = collection(db, 'machines');
      unsubscribe = onSnapshot(machinesRef, (snapshot) => {
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
      });
    } catch (err) {
      console.warn('Machines sync warning:', err);
    }
    return () => unsubscribe();
  }, []);

  // Live duplicate email check for New User creation
  useEffect(() => {
    if (!isModalOpen || submitting || userSelectionMode !== 'new') {
      return;
    }

    const rawEmail = newUserData.email.trim().toLowerCase();
    if (!rawEmail) {
      setEmailStatus('idle');
      setEmailError(null);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(rawEmail)) {
      setEmailStatus('idle');
      setEmailError(null);
      return;
    }

    // Local check
    if (users.some((u) => u.email.trim().toLowerCase() === rawEmail)) {
      setEmailStatus('duplicate');
      setEmailError('This mail already existed');
      return;
    }

    // Debounced Firestore check
    setEmailStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const q = query(collection(db, 'users'), where('email', '==', rawEmail));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setEmailStatus('duplicate');
          setEmailError('This mail already existed');
        } else {
          setEmailStatus('available');
          setEmailError(null);
        }
      } catch (err) {
        setEmailStatus('available');
        setEmailError(null);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [newUserData.email, users, isModalOpen, submitting, userSelectionMode]);

  // Open modal and reset flow
  const handleOpenModal = () => {
    setCurrentStep(1);
    setUserSelectionMode('existing');
    setSelectedUser(null);
    setUserSearchQuery('');
    setNewUserData({
      fullName: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      pincode: '',
      state: 'Andhra Pradesh',
      country: 'India',
    });
    setCountryId(101);
    setPhoneCode('+91');
    setEmailStatus('idle');
    setEmailError(null);
    setSelectedMachineId('');
    setAmount('');
    setPaymentType('UPI');
    setPaymentStatus('Paid');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (!submitting) {
      setIsModalOpen(false);
      setFormError(null);
    }
  };

  // Helper for generating UUID
  const getUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2, 10) + '-' + Math.random().toString(36).substring(2, 10);
  };

  // Handle Step 1 -> Step 2
  const handleProceedToStep2 = async () => {
    setFormError(null);

    if (userSelectionMode === 'existing') {
      if (!selectedUser) {
        setFormError('Please select a customer from the list to continue.');
        return;
      }
      setCurrentStep(2);
    } else {
      // Validate New User inputs
      if (!newUserData.fullName.trim()) {
        setFormError('Full name is required.');
        return;
      }
      const cleanEmail = newUserData.email.trim().toLowerCase();
      if (!cleanEmail || !cleanEmail.includes('@')) {
        setFormError('Please enter a valid email address.');
        return;
      }
      if (users.some((u) => u.email.trim().toLowerCase() === cleanEmail)) {
        setEmailStatus('duplicate');
        setEmailError('This mail already existed');
        setFormError('This email is already registered. Please choose an existing customer or enter a unique email.');
        return;
      }
      if (!newUserData.phone.trim()) {
        setFormError('Phone number is required.');
        return;
      }
      if (!newUserData.address.trim()) {
        setFormError('Address is required.');
        return;
      }
      if (!newUserData.city.trim()) {
        setFormError('City is required.');
        return;
      }
      if (!newUserData.pincode.trim()) {
        setFormError('Pincode is required.');
        return;
      }
      if (!newUserData.state.trim()) {
        setFormError('State is required.');
        return;
      }
      if (!newUserData.country.trim()) {
        setFormError('Country is required.');
        return;
      }

      setSubmitting(true);

      // Verify email uniqueness against Firestore collection
      try {
        const q = query(collection(db, 'users'), where('email', '==', cleanEmail));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setEmailStatus('duplicate');
          setEmailError('This mail already existed');
          setFormError('This mail already existed. Please enter a unique email.');
          setSubmitting(false);
          return;
        }
      } catch (err) {
        console.warn('Uniqueness check notice:', err);
      }

      // Create new user in users collection
      const newUserId = `user_${getUUID()}`;
      const now = new Date().toISOString();
      const rawPhone = newUserData.phone.trim();
      const fullPhone = rawPhone.startsWith('+') ? rawPhone : `${phoneCode} ${rawPhone}`;

      const createdUserPayload: UserRecord = {
        id: newUserId,
        name: newUserData.fullName.trim(),
        email: cleanEmail,
        phone: fullPhone,
        address: newUserData.address.trim(),
        city: newUserData.city.trim(),
        pincode: newUserData.pincode.trim(),
        state: newUserData.state.trim() || 'Andhra Pradesh',
        country: newUserData.country.trim() || 'India',
        app_access: false,
        created_at: now,
        updated_at: now,
      };

      try {
        const { id: _, ...firestoreUserData } = createdUserPayload;
        await setDoc(doc(db, 'users', newUserId), firestoreUserData);
        setSelectedUser(createdUserPayload);
        setCurrentStep(2);
      } catch (err: any) {
        console.warn('Error creating user for purchase:', err);
        // Fallback for offline mode
        setSelectedUser(createdUserPayload);
        setCurrentStep(2);
      } finally {
        setSubmitting(false);
      }
    }
  };

  // Submit complete purchase in Step 2
  const handleCompletePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedUser) {
      setFormError('No customer selected. Please go back to Step 1.');
      return;
    }
    if (!selectedMachineId) {
      setFormError('Please select a machine from the dropdown list.');
      return;
    }
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError('Please enter a valid purchase amount greater than zero.');
      return;
    }

    setSubmitting(true);

    const purchaseId = `purchase_${getUUID()}`;
    const now = new Date().toISOString();

    const firestoreData = {
      user_id: selectedUser.id,
      machine_id: selectedMachineId,
      amount: numAmount,
      payment_type: paymentType,
      payment_status: paymentStatus,
      created_at: now,
      updated_at: now,
    };

    const purchasePayload: PurchaseRecord = {
      id: purchaseId,
      purchase_id: purchaseId,
      ...firestoreData,
    };

    // Close modal immediately to avoid any self-triggering effects
    setIsModalOpen(false);

    // 1. Optimistic local update
    setPurchases((prev) => [purchasePayload, ...prev]);
    try {
      const cached = JSON.parse(localStorage.getItem('hs_cached_purchases') || '[]');
      localStorage.setItem('hs_cached_purchases', JSON.stringify([purchasePayload, ...cached]));
    } catch {}

    // 2. Write to Firestore: purchase/{purchase_id}
    try {
      const purchaseDocRef = doc(db, 'purchase', purchaseId);
      await setDoc(purchaseDocRef, firestoreData);

      // 3. Only update assigned_user_id in machines collection if payment_status is 'Paid'
      if (paymentStatus === 'Paid') {
        try {
          const machineDocRef = doc(db, 'machines', selectedMachineId);
          await setDoc(
            machineDocRef,
            {
              assigned_user_id: selectedUser.id,
              updated_at: now,
            },
            { merge: true }
          );
        } catch (machineErr) {
          console.warn('Notice updating machine assigned_user_id:', machineErr);
        }
      }

      setSuccessMessage('Purchase added successfully');
    } catch (err: any) {
      console.warn('Firestore purchase write warning:', err);
      if (err?.code === 'permission-denied') {
        setStatusMessage('Firestore security rules blocked server write. Saved locally.');
      }
      setSuccessMessage('Purchase added successfully');
    } finally {
      setSubmitting(false);
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  // Delete purchase
  const handleDeletePurchase = async (purchaseId: string, machineId: string) => {
    if (window.confirm('Are you sure you want to delete this purchase record?')) {
      setPurchases((prev) => prev.filter((p) => p.id !== purchaseId));
      try {
        const cached = JSON.parse(localStorage.getItem('hs_cached_purchases') || '[]');
        localStorage.setItem('hs_cached_purchases', JSON.stringify(cached.filter((p: any) => p.id !== purchaseId)));
      } catch {}

      try {
        await deleteDoc(doc(db, 'purchase', purchaseId));

        // Optionally unassign machine if assigned
        if (machineId) {
          try {
            await setDoc(
              doc(db, 'machines', machineId),
              { assigned_user_id: null, updated_at: new Date().toISOString() },
              { merge: true }
            );
          } catch {}
        }
        setSuccessMessage('Purchase deleted successfully');
      } catch (err) {
        console.warn('Firestore delete notice:', err);
        setSuccessMessage('Purchase deleted successfully');
      }
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  // Filter machines for dropdown where assigned_user_id is null or empty
  const availableMachines = machines.filter(
    (m) => m.assigned_user_id === null || m.assigned_user_id === '' || !m.assigned_user_id
  );

  // Filter existing users by search query in Step 1
  const filteredExistingUsers = users.filter((u) => {
    const q = userSearchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.phone.includes(q) ||
      (u.city && u.city.toLowerCase().includes(q))
    );
  });

  // Filter purchases in table
  const filteredPurchases = purchases.filter((p) => {
    const q = searchQuery.toLowerCase();
    const user = users.find((u) => u.id === p.user_id);
    const machine = machines.find((m) => m.machine_id === p.machine_id || m.id === p.machine_id);

    return (
      p.purchase_id.toLowerCase().includes(q) ||
      p.user_id.toLowerCase().includes(q) ||
      p.machine_id.toLowerCase().includes(q) ||
      p.payment_type.toLowerCase().includes(q) ||
      p.payment_status.toLowerCase().includes(q) ||
      p.amount.toString().includes(q) ||
      (user && user.name.toLowerCase().includes(q)) ||
      (machine && machine.machine_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="w-full space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#0e1f1c] tracking-tight">
              Purchases Management
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#112826] text-[#e5c044]">
              {purchases.length} {purchases.length === 1 ? 'purchase' : 'purchases'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#576b65] mt-1">
            Machine sales, client ownership assignments, and payment transaction logs
          </p>
        </div>

        {/* Action Button: + New Purchase */}
        <div>
          <button
            onClick={handleOpenModal}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer shadow-md hover:opacity-95 active:scale-95 shrink-0"
            style={{
              backgroundColor: HS_THEME.colors.primaryGold,
              color: '#000000',
              boxShadow: '0 4px 14px rgba(229, 192, 68, 0.35)',
            }}
          >
            <Plus className="w-4 h-4" />
            <span>New Purchase</span>
          </button>
        </div>
      </div>

      {/* Firestore Status Alert */}
      {statusMessage && (
        <div
          className={`flex items-start gap-2.5 p-3.5 rounded-xl text-xs font-medium ${
            firestoreStatus === 'permission_error'
              ? 'bg-amber-50 border border-amber-200 text-amber-900'
              : 'bg-blue-50 border border-blue-200 text-blue-900'
          }`}
        >
          {firestoreStatus === 'permission_error' ? (
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          ) : (
            <WifiOff className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p className="font-semibold">{statusMessage}</p>
          </div>
        </div>
      )}

      {/* Small Floating Toast Popup */}
      {successMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-white text-zinc-900 border border-zinc-200/90 shadow-2xl shadow-zinc-900/15 animate-fadeIn">
          <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-zinc-800">{successMessage}</span>
          <button
            onClick={() => setSuccessMessage(null)}
            className="p-1 ml-2 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Search Input Bar */}
      <div className="relative max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by customer, machine, or status..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#234a45]/20 rounded-xl text-xs text-[#0e1f1c] placeholder-zinc-400 outline-none focus:border-[#e5c044] focus:ring-1 focus:ring-[#e5c044] transition-all shadow-xs"
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

      {/* Purchases Table Card */}
      <div
        className="rounded-[16px] overflow-hidden border shadow-sm"
        style={{
          backgroundColor: '#ffffff',
          borderColor: 'rgba(35, 74, 69, 0.15)',
        }}
      >
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#e5c044] mb-3" />
            <p className="text-xs font-medium text-zinc-500">Loading purchase records from Firestore...</p>
          </div>
        ) : filteredPurchases.length === 0 ? (
          <div className="p-16 text-center">
            <div
              className="w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-3"
              style={{ backgroundColor: 'rgba(229, 192, 68, 0.12)' }}
            >
              <ShoppingBag className="w-6 h-6 text-[#e5c044]" />
            </div>
            <h3 className="text-sm font-bold text-zinc-800 mb-1">
              {searchQuery ? 'No matching purchases found' : 'No purchases recorded yet'}
            </h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto mb-5">
              {searchQuery
                ? `No purchase matched "${searchQuery}".`
                : 'Click below to assign a machine to a customer and record the first purchase.'}
            </p>
            {!searchQuery && (
              <button
                onClick={handleOpenModal}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold bg-[#e5c044] text-black hover:bg-[#d4ae33] transition-colors cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>New Purchase</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              {/* Table Head */}
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
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Machine</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Payment Method</th>
                  <th className="py-3.5 px-4 text-center">Payment Status</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-zinc-100">
                {filteredPurchases.map((p, index) => {
                  const user = users.find((u) => u.id === p.user_id);
                  const machine = machines.find((m) => m.machine_id === p.machine_id || m.id === p.machine_id);

                  const formattedDate = new Date(p.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  });

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-zinc-50/80 transition-colors text-zinc-700"
                    >
                      {/* S. No */}
                      <td className="py-3 px-4 text-center font-medium text-zinc-500 text-xs">
                        {index + 1}
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-4">
                        {user ? (
                          <div>
                            <span className="font-semibold text-zinc-900 block">{user.name}</span>
                            <span className="text-[11px] text-zinc-500 block">{user.email || user.phone}</span>
                          </div>
                        ) : (
                          <div>
                            <span className="font-mono text-[11px] text-zinc-600 block">{p.user_id}</span>
                            <span className="text-[10px] text-zinc-400 italic">User record not found</span>
                          </div>
                        )}
                      </td>

                      {/* Machine */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                            style={{ backgroundColor: 'rgba(229, 192, 68, 0.15)' }}
                          >
                            <Cpu className="w-3.5 h-3.5 text-[#8a6d1c]" />
                          </div>
                          <div>
                            <span className="font-semibold text-zinc-900 block">
                              {machine ? machine.machine_name : p.machine_id}
                            </span>
                            <span className="font-mono text-[10px] text-zinc-500 block">
                              {p.machine_id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 font-bold text-zinc-900 font-mono text-xs">
                        ₹{p.amount.toLocaleString('en-IN')}
                      </td>

                      {/* Payment Method */}
                      <td className="py-3 px-4">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 text-zinc-700 border border-zinc-200">
                          {p.payment_type}
                        </span>
                      </td>

                      {/* Payment Status */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            p.payment_status === 'Paid'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : p.payment_status === 'Pending'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : p.payment_status === 'Refunded'
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : 'bg-red-100 text-red-800 border border-red-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              p.payment_status === 'Paid'
                                ? 'bg-emerald-500'
                                : p.payment_status === 'Pending'
                                ? 'bg-amber-500'
                                : p.payment_status === 'Refunded'
                                ? 'bg-purple-500'
                                : 'bg-red-500'
                            }`}
                          />
                          {p.payment_status}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4 text-zinc-500 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-zinc-400 shrink-0" />
                          <span>{formattedDate}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDeletePurchase(p.id, p.machine_id)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          title="Delete Purchase"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Multi-Step + New Purchase Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="w-full max-w-2xl lg:max-w-3xl rounded-[20px] shadow-2xl overflow-visible my-8 bg-white border border-zinc-200 relative">
            {/* Modal Header */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-zinc-200 bg-zinc-50/70 rounded-t-[20px]">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: 'rgba(229, 192, 68, 0.18)',
                    border: '1px solid rgba(229, 192, 68, 0.45)',
                  }}
                >
                  <ShoppingBag className="w-4 h-4 text-[#8a6d1c]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-zinc-900">Record New Purchase</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#112826] text-[#e5c044]">
                      Step {currentStep} of 2
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseModal}
                disabled={submitting}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 overflow-visible">
              {/* Error Banner */}
              {formError && (
                <div className="flex items-center gap-2 p-3 rounded-xl text-xs font-semibold bg-red-50 border border-red-200 text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{formError}</span>
                </div>
              )}

              {/* ================= STEP 1: USER SELECTION ================= */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  {/* Mode Selector Toggle */}
                  <div className="flex p-1 bg-zinc-100 rounded-xl max-w-sm mx-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setUserSelectionMode('existing');
                        setFormError(null);
                      }}
                      className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        userSelectionMode === 'existing'
                          ? 'bg-white text-zinc-900 shadow-sm'
                          : 'text-zinc-500 hover:text-zinc-800'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Existing Customer</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setUserSelectionMode('new');
                        setFormError(null);
                      }}
                      className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        userSelectionMode === 'new'
                          ? 'bg-white text-zinc-900 shadow-sm'
                          : 'text-zinc-500 hover:text-zinc-800'
                      }`}
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>New Customer</span>
                    </button>
                  </div>

                  {/* Mode A: Existing User Search & Selection */}
                  {userSelectionMode === 'existing' ? (
                    <div className="space-y-3">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                          <Search className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          value={userSearchQuery}
                          onChange={(e) => setUserSearchQuery(e.target.value)}
                          placeholder="Search customer by name, email, phone, or city..."
                          className="w-full pl-10 pr-4 py-2.5 bg-white border border-zinc-300 rounded-xl text-xs text-zinc-900 placeholder-zinc-400 outline-none focus:border-[#e5c044] focus:ring-2 focus:ring-[#e5c044]/30 transition-all shadow-xs"
                        />
                      </div>

                      {/* Users List Box */}
                      <div className="max-h-60 overflow-y-auto border border-zinc-200 rounded-xl divide-y divide-zinc-100 bg-white">
                        {filteredExistingUsers.length === 0 ? (
                          <div className="p-8 text-center text-xs text-zinc-500">
                            No customers found. Switch to "New Customer" above to register one.
                          </div>
                        ) : (
                          filteredExistingUsers.map((u) => {
                            const isSelected = selectedUser?.id === u.id;
                            return (
                              <div
                                key={u.id}
                                onClick={() => {
                                  setSelectedUser(u);
                                  setFormError(null);
                                }}
                                className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                                  isSelected ? 'bg-amber-50/80 border-l-4 border-[#e5c044]' : 'hover:bg-zinc-50'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                                      isSelected ? 'bg-[#e5c044] text-black' : 'bg-zinc-100 text-zinc-700'
                                    }`}
                                  >
                                    {u.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <h4 className="text-xs font-bold text-zinc-900">{u.name}</h4>
                                    <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                                      <span>{u.email}</span>
                                      {u.phone && <span>· {u.phone}</span>}
                                      {u.city && <span>· {u.city}</span>}
                                    </div>
                                  </div>
                                </div>

                                <div className="shrink-0">
                                  {isSelected ? (
                                    <div className="w-5 h-5 rounded-full bg-[#112826] text-[#e5c044] flex items-center justify-center">
                                      <Check className="w-3 h-3" />
                                    </div>
                                  ) : (
                                    <div className="w-4 h-4 rounded-full border border-zinc-300" />
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Selected Confirmation Banner */}
                      {selectedUser && (
                        <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 flex items-center justify-between">
                          <div className="text-xs text-zinc-800">
                            Selected: <strong className="text-zinc-900">{selectedUser.name}</strong> ({selectedUser.email || selectedUser.phone})
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Mode B: New Customer Registration Form (Same order: address, city, pincode, state, country) */
                    <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                      {/* Full Name */}
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-700 mb-1.5">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Enter full name"
                          value={newUserData.fullName}
                          onChange={(e) => setNewUserData((p) => ({ ...p, fullName: e.target.value }))}
                          className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-white text-zinc-900 placeholder-zinc-400 border border-zinc-300 outline-none focus:border-[#e5c044] focus:ring-2 focus:ring-[#e5c044]/30 transition-all shadow-xs"
                        />
                      </div>

                      {/* Email & Phone */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-700">
                              Email <span className="text-red-500">*</span>
                            </label>
                            {emailStatus === 'checking' && (
                              <span className="text-[10px] text-zinc-400 flex items-center gap-1 font-medium animate-pulse">
                                <Loader2 className="w-2.5 h-2.5 animate-spin" /> Verifying...
                              </span>
                            )}
                          </div>
                          <input
                            type="email"
                            placeholder="user@example.com"
                            value={newUserData.email}
                            onChange={(e) => setNewUserData((p) => ({ ...p, email: e.target.value }))}
                            className={`w-full px-3.5 py-2.5 rounded-xl text-xs bg-white text-zinc-900 placeholder-zinc-400 border outline-none transition-all shadow-xs ${
                              emailStatus === 'duplicate'
                                ? 'border-red-500 bg-red-50/20 text-red-900 focus:border-red-600 focus:ring-2 focus:ring-red-200'
                                : 'border-zinc-300 focus:border-[#e5c044] focus:ring-2 focus:ring-[#e5c044]/30'
                            }`}
                          />
                          {emailStatus === 'duplicate' && (
                            <p className="mt-1.5 text-[11px] font-semibold text-red-600 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>This mail already existed</span>
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-700 mb-1.5">
                            Phone <span className="text-red-500">*</span>
                          </label>
                          <div className="phone-unified-container">
                            <div className="phone-code-addon">
                              <PhonecodeSelect
                                defaultValue={'India' as any}
                                showFlag={true}
                                onChange={(e: any) => {
                                  if (e && e.phone_code) {
                                    const code = e.phone_code.startsWith('+') ? e.phone_code : `+${e.phone_code}`;
                                    setPhoneCode(code);
                                  }
                                }}
                              />
                            </div>
                            <input
                              type="tel"
                              placeholder="Phone Number"
                              value={newUserData.phone}
                              onChange={(e) => setNewUserData((p) => ({ ...p, phone: e.target.value }))}
                              className="phone-number-input"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Address */}
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-700 mb-1.5">
                          Address <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          rows={2}
                          placeholder="Enter residential or workshop address"
                          value={newUserData.address}
                          onChange={(e) => setNewUserData((p) => ({ ...p, address: e.target.value }))}
                          className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-white text-zinc-900 placeholder-zinc-400 border border-zinc-300 outline-none focus:border-[#e5c044] focus:ring-2 focus:ring-[#e5c044]/30 transition-all shadow-xs resize-y"
                        />
                      </div>

                      {/* City & Pincode */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-700 mb-1.5">
                            City <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="Enter city"
                            value={newUserData.city}
                            onChange={(e) => setNewUserData((p) => ({ ...p, city: e.target.value }))}
                            className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-white text-zinc-900 placeholder-zinc-400 border border-zinc-300 outline-none focus:border-[#e5c044] focus:ring-2 focus:ring-[#e5c044]/30 transition-all shadow-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-700 mb-1.5">
                            Pincode <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="500001"
                            value={newUserData.pincode}
                            onChange={(e) => setNewUserData((p) => ({ ...p, pincode: e.target.value }))}
                            className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-white text-zinc-900 placeholder-zinc-400 border border-zinc-300 outline-none focus:border-[#e5c044] focus:ring-2 focus:ring-[#e5c044]/30 transition-all shadow-xs"
                          />
                        </div>
                      </div>

                      {/* State & Country */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-700 mb-1.5">
                            State <span className="text-red-500">*</span>
                          </label>
                          <StateSelect
                            countryid={countryId}
                            defaultValue={'Andhra Pradesh' as any}
                            onChange={(e: any) => {
                              if (e) setNewUserData((p) => ({ ...p, state: e.name }));
                            }}
                            placeHolder="Select State"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-700 mb-1.5">
                            Country <span className="text-red-500">*</span>
                          </label>
                          <CountrySelect
                            defaultValue={'India' as any}
                            showFlag={true}
                            onChange={(e: any) => {
                              if (e) {
                                setCountryId(e.id);
                                setNewUserData((p) => ({ ...p, country: e.name }));
                                if (e.phone_code) {
                                  const code = e.phone_code.startsWith('+') ? e.phone_code : `+${e.phone_code}`;
                                  setPhoneCode(code);
                                }
                              }
                            }}
                            placeHolder="Select Country"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 1 Actions */}
                  <div className="pt-4 flex items-center justify-end gap-3 border-t border-zinc-200">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      disabled={submitting}
                      className="px-4 py-2 rounded-full text-xs font-semibold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleProceedToStep2}
                      disabled={
                        submitting ||
                        (userSelectionMode === 'existing' && !selectedUser) ||
                        (userSelectionMode === 'new' && emailStatus === 'duplicate')
                      }
                      className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer shadow-md hover:opacity-95 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        backgroundColor: HS_THEME.colors.primaryGold,
                        color: '#000000',
                      }}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-black" />
                          <span>Saving Customer...</span>
                        </>
                      ) : (
                        <>
                          <span>Continue to Step 2</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* ================= STEP 2: MACHINE & PAYMENT ================= */}
              {currentStep === 2 && (
                <form onSubmit={handleCompletePurchase} className="space-y-4">
                  {/* Selected User Header Card */}
                  {selectedUser && (
                    <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#112826] text-[#e5c044] font-bold text-xs flex items-center justify-center shrink-0">
                          {selectedUser.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-zinc-900 block">{selectedUser.name}</span>
                          <span className="text-[11px] text-zinc-500 block">{selectedUser.email || selectedUser.phone}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setCurrentStep(1);
                          setFormError(null);
                        }}
                        className="text-xs text-[#8a6d1c] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Change</span>
                      </button>
                    </div>
                  )}

                  {/* Machine Dropdown (Only where assigned_user_id is null) */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-700 mb-1.5">
                      Select Machine (Unassigned Units) <span className="text-red-500">*</span>
                    </label>
                    {availableMachines.length === 0 ? (
                      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                        <span>No unassigned machines available. Please register a new machine in the Machines page first.</span>
                      </div>
                    ) : (
                      <div className="relative">
                        <select
                          value={selectedMachineId}
                          onChange={(e) => setSelectedMachineId(e.target.value)}
                          disabled={submitting}
                          className="w-full px-3.5 py-2.5 pr-8 rounded-xl text-xs bg-white text-zinc-900 border border-zinc-300 outline-none focus:border-[#e5c044] focus:ring-2 focus:ring-[#e5c044]/30 transition-all shadow-xs appearance-none cursor-pointer"
                        >
                          <option value="">-- Select an unassigned machine by name --</option>
                          {availableMachines.map((m) => (
                            <option key={m.id} value={m.machine_id}>
                              {m.machine_name} ({m.machine_id}) · {m.canvas_width_mm}×{m.canvas_height_mm}mm · {m.pin_count} pins
                            </option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-zinc-400">
                          <ChevronDown className="w-4 h-4" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Amount (Number) */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-700 mb-1.5">
                      Amount (₹) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400 font-bold text-xs">
                        ₹
                      </div>
                      <input
                        type="number"
                        min={1}
                        placeholder="e.g. 75000"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        disabled={submitting}
                        className="w-full pl-8 pr-4 py-2.5 rounded-xl text-xs font-mono font-bold bg-white text-zinc-900 placeholder-zinc-400 border border-zinc-300 outline-none focus:border-[#e5c044] focus:ring-2 focus:ring-[#e5c044]/30 transition-all shadow-xs"
                      />
                    </div>
                  </div>

                  {/* Payment Type & Payment Status */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Payment Type Dropdown */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-700 mb-1.5">
                        Payment Type <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          value={paymentType}
                          onChange={(e: any) => setPaymentType(e.target.value)}
                          disabled={submitting}
                          className="w-full px-3.5 py-2.5 pr-8 rounded-xl text-xs bg-white text-zinc-900 border border-zinc-300 outline-none focus:border-[#e5c044] focus:ring-2 focus:ring-[#e5c044]/30 transition-all shadow-xs appearance-none cursor-pointer"
                        >
                          <option value="Cash">Cash</option>
                          <option value="UPI">UPI</option>
                          <option value="Bank Transfer">Bank Transfer</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-zinc-400">
                          <ChevronDown className="w-4 h-4" />
                        </div>
                      </div>
                    </div>

                    {/* Payment Status Dropdown */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-700 mb-1.5">
                        Payment Status <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          value={paymentStatus}
                          onChange={(e: any) => setPaymentStatus(e.target.value)}
                          disabled={submitting}
                          className="w-full px-3.5 py-2.5 pr-8 rounded-xl text-xs bg-white text-zinc-900 border border-zinc-300 outline-none focus:border-[#e5c044] focus:ring-2 focus:ring-[#e5c044]/30 transition-all shadow-xs appearance-none cursor-pointer"
                        >
                          <option value="Paid">Paid</option>
                          <option value="Pending">Pending</option>
                          <option value="Cancelled">Cancelled</option>
                          <option value="Refunded">Refunded</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-zinc-400">
                          <ChevronDown className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 2 Actions */}
                  <div className="pt-4 flex items-center justify-between border-t border-zinc-200">
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentStep(1);
                        setFormError(null);
                      }}
                      disabled={submitting}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back to Customer</span>
                    </button>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleCloseModal}
                        disabled={submitting}
                        className="px-4 py-2 rounded-full text-xs font-semibold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submitting || !selectedMachineId || !amount || Number(amount) <= 0}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer shadow-md hover:opacity-95 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          backgroundColor: HS_THEME.colors.primaryGold,
                          color: '#000000',
                        }}
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-black" />
                            <span>Recording Purchase...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Complete Purchase</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
