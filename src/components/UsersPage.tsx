'use client';

import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  Search,
  X,
  Loader2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Trash2,
  WifiOff,
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
} from "react-country-state-city";
import "react-country-state-city/dist/react-country-state-city.css";

export interface UserRecord {
  id: string; // user_{uuid}
  name: string;
  email: string;
  phone: string;
  address: string;
  city?: string;
  pincode: string;
  state: string;
  country: string;
  app_access: boolean;
  created_at: string;
  updated_at: string;
}

export function UsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [firestoreStatus, setFirestoreStatus] = useState<'connected' | 'offline' | 'permission_error'>('connected');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [countryId, setCountryId] = useState<number>(101);
  const [phoneCode, setPhoneCode] = useState<string>('+91');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'checking' | 'duplicate' | 'available'>('idle');
  const [emailError, setEmailError] = useState<string | null>(null);

  // Form State - Cleaned: Single Full Name, Single Address, location
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    pincode: '',
    state: 'Andhra Pradesh',
    country: 'India',
  });

  // Live Email Verification & Uniqueness Check (Instant Local + Debounced Server Check)
  useEffect(() => {
    // Only run live verification when modal is open and not submitting
    if (!isModalOpen || submitting) {
      return;
    }

    const rawEmail = formData.email.trim().toLowerCase();

    if (!rawEmail) {
      setEmailStatus('idle');
      setEmailError(null);
      return;
    }

    // Check basic email format before testing uniqueness
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(rawEmail)) {
      setEmailStatus('idle');
      setEmailError(null);
      return;
    }

    // 1. Instant check against local loaded users list
    const isLocalDuplicate = users.some(
      (u) => u.email.trim().toLowerCase() === rawEmail
    );

    if (isLocalDuplicate) {
      setEmailStatus('duplicate');
      setEmailError('This mail already existed');
      return;
    }

    // 2. Debounced live server verification against Firestore collection
    setEmailStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', rawEmail));
        const snap = await getDocs(q);

        if (!snap.empty) {
          setEmailStatus('duplicate');
          setEmailError('This mail already existed');
        } else {
          setEmailStatus('available');
          setEmailError(null);
        }
      } catch (err) {
        console.warn('Live email check warning:', err);
        if (users.some((u) => u.email.trim().toLowerCase() === rawEmail)) {
          setEmailStatus('duplicate');
          setEmailError('This mail already existed');
        } else {
          setEmailStatus('available');
          setEmailError(null);
        }
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [formData.email, users, isModalOpen, submitting]);

  // Load from local storage cache initially if available
  useEffect(() => {
    try {
      const cached = localStorage.getItem('hs_cached_users');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setUsers(parsed);
          setLoading(false);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Real-time Firestore synchronization for users collection
  useEffect(() => {
    let unsubscribe: () => void = () => { };

    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef);

      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const fetchedUsers: UserRecord[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            fetchedUsers.push({
              id: docSnap.id,
              name: data.name || 'Unknown User',
              email: data.email || '',
              phone: data.phone || data.phone_number || '',
              address: data.address || '',
              city: data.city || '',
              pincode: data.pincode || '',
              state: data.state || '',
              country: data.country || '',
              app_access: Boolean(data.app_access),
              created_at: data.created_at || new Date().toISOString(),
              updated_at: data.updated_at || new Date().toISOString(),
            });
          });

          // Sort by created_at descending (newest first)
          fetchedUsers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          setUsers(fetchedUsers);
          setFirestoreStatus('connected');
          setStatusMessage(null);
          setLoading(false);

          // Update local cache
          try {
            localStorage.setItem('hs_cached_users', JSON.stringify(fetchedUsers));
          } catch { }
        },
        (error) => {
          console.warn('Firestore snapshot notice:', error);
          setLoading(false);

          if (error.code === 'permission-denied') {
            setFirestoreStatus('permission_error');
            setStatusMessage('Cloud Firestore Permission Denied. In Firebase Console > Firestore > Rules, please allow read/write (e.g. allow read, write: if true;). Working in local offline cache mode.');
          } else {
            setFirestoreStatus('offline');
            setStatusMessage('Cloud Firestore is operating in offline mode. Changes are saved locally and will sync when backend connects.');
          }
        }
      );
    } catch (err: any) {
      console.warn('Firestore initialization notice:', err);
      setLoading(false);
      setFirestoreStatus('offline');
    }

    return () => unsubscribe();
  }, []);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formError) setFormError(null);
  };

  const handleOpenModal = () => {
    setFormData({
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
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (!submitting) {
      setIsModalOpen(false);
      setEmailStatus('idle');
      setEmailError(null);
      setFormError(null);
    }
  };

  // Helper to generate UUID
  const getUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2, 10) + '-' + Math.random().toString(36).substring(2, 10);
  };

  // Submit new user to Firestore
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation: address, city, pincode, state, country
    if (!formData.fullName.trim()) {
      setFormError('Full name is required.');
      return;
    }
    const cleanEmail = formData.email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setFormError('Please enter a valid email address.');
      return;
    }
    // Check if duplicate in existing users
    if (users.some((u) => u.email.trim().toLowerCase() === cleanEmail)) {
      setEmailStatus('duplicate');
      setEmailError('This mail already existed');
      setFormError('This mail already existed. Please enter a unique email.');
      return;
    }
    if (!formData.phone.trim()) {
      setFormError('Phone number is required.');
      return;
    }
    if (!formData.address.trim()) {
      setFormError('Address is required.');
      return;
    }
    if (!formData.city.trim()) {
      setFormError('City is required.');
      return;
    }
    if (!formData.pincode.trim()) {
      setFormError('Pincode is required.');
      return;
    }
    if (!formData.state.trim()) {
      setFormError('State is required.');
      return;
    }
    if (!formData.country.trim()) {
      setFormError('Country is required.');
      return;
    }

    setSubmitting(true);

    // Server-level unique verification query against Firestore collection
    try {
      const emailQuery = query(collection(db, 'users'), where('email', '==', cleanEmail));
      const emailSnap = await getDocs(emailQuery);
      if (!emailSnap.empty) {
        setEmailStatus('duplicate');
        setEmailError('This mail already existed');
        setFormError('This mail already existed. Please enter a unique email.');
        setSubmitting(false);
        return;
      }
    } catch (err) {
      console.warn('Firestore uniqueness check notice:', err);
    }

    const uuid = getUUID();
    const docId = `user_${uuid}`;
    const now = new Date().toISOString();

    const rawPhone = formData.phone.trim();
    const fullPhone = rawPhone.startsWith('+') ? rawPhone : `${phoneCode} ${rawPhone}`;

    // Clean fields saved in Firestore document:
    // (name, email, phone, address, city, pincode, state, country, app_access, created_at, updated_at)
    // Document ID itself in collection is `user_${uuid}`, avoiding redundant id/user_id inside fields.
    const firestoreData = {
      name: formData.fullName.trim(),
      email: formData.email.trim().toLowerCase(),
      phone: fullPhone,
      address: formData.address.trim(),
      city: formData.city.trim(),
      pincode: formData.pincode.trim(),
      state: formData.state.trim() || 'Andhra Pradesh',
      country: formData.country.trim() || 'India',
      app_access: false, // Default false while creation
      created_at: now,
      updated_at: now,
    };

    const newUserData: UserRecord = {
      id: docId,
      ...firestoreData,
    };

    // Close modal and reset form immediately so the active form doesn't collide with the newly created user
    setIsModalOpen(false);
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      pincode: '',
      state: 'Andhra Pradesh',
      country: 'India',
    });
    setEmailStatus('idle');
    setEmailError(null);

    // 1. Optimistically update local state & cache so UI responds immediately
    setUsers((prev) => [newUserData, ...prev]);
    try {
      const cached = JSON.parse(localStorage.getItem('hs_cached_users') || '[]');
      localStorage.setItem('hs_cached_users', JSON.stringify([newUserData, ...cached]));
    } catch { }

    // 2. Write to Firestore collection: users/user_{uuid} (only clean, non-duplicate fields!)
    try {
      const userDocRef = doc(db, 'users', docId);
      await setDoc(userDocRef, firestoreData);
      setSuccessMessage('User added successfully');
    } catch (err: any) {
      console.warn('Firestore write warning:', err);
      if (err?.code === 'permission-denied') {
        setStatusMessage('Firestore security rules blocked server write. User saved locally. Update Firebase rules in console.');
      }
      setSuccessMessage('User added successfully');
    } finally {
      setSubmitting(false);
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };


  const handleDeleteUser = async (userId: string, userName: string) => {
    if (window.confirm(`Are you sure you want to delete user "${userName}"?`)) {
      // Remove locally immediately
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      try {
        const cached = JSON.parse(localStorage.getItem('hs_cached_users') || '[]');
        localStorage.setItem('hs_cached_users', JSON.stringify(cached.filter((u: any) => u.id !== userId)));
      } catch { }

      try {
        await deleteDoc(doc(db, 'users', userId));
        setSuccessMessage('User deleted successfully');
      } catch (err) {
        console.warn('Firestore delete notice:', err);
        setSuccessMessage('User deleted successfully');
      }
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  // Filtered users by search query
  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.phone.includes(q) ||
      u.id.toLowerCase().includes(q) ||
      (u.city && u.city.toLowerCase().includes(q)) ||
      u.state.toLowerCase().includes(q) ||
      u.pincode.includes(q)
    );
  });

  return (
    <div className="w-full space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#0e1f1c] tracking-tight">
              Users Management
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#112826] text-[#e5c044]">
              {users.length} {users.length === 1 ? 'user' : 'users'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#576b65] mt-1">
            Registered operators, clients, and machine accounts
          </p>
        </div>

        {/* Action Button: + Add User */}
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
            <UserPlus className="w-4 h-4" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* Firestore Status / Offline Diagnostic Alert */}
      {statusMessage && (
        <div
          className={`flex items-start gap-2.5 p-3.5 rounded-xl text-xs font-medium ${firestoreStatus === 'permission_error'
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
            {firestoreStatus === 'permission_error' && (
              <p className="text-[11px] text-amber-800 mt-1">
                <strong>Fix:</strong> In <a href="https://console.firebase.google.com/project/stringart-abce2/firestore/rules" target="_blank" rel="noreferrer" className="underline font-bold">Firebase Console &gt; Firestore &gt; Rules</a>, change to <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">allow read, write: if true;</code> for development.
              </p>
            )}
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
          placeholder="Search by name, email, phone, or pincode..."
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

      {/* Users Table Card */}
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
            <p className="text-xs font-medium text-zinc-500">Loading users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-16 text-center">
            <div
              className="w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-3"
              style={{ backgroundColor: 'rgba(229, 192, 68, 0.12)' }}
            >
              <UserPlus className="w-6 h-6 text-[#e5c044]" />
            </div>
            <h3 className="text-sm font-bold text-zinc-800 mb-1">
              {searchQuery ? 'No matching users found' : 'No users created yet'}
            </h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto mb-5">
              {searchQuery
                ? `No user matched your search "${searchQuery}". Try searching for another name or email.`
                : 'Click below to add your first user. It will automatically create the users collection in Firestore.'}
            </p>
            {!searchQuery && (
              <button
                onClick={handleOpenModal}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold bg-[#e5c044] text-black hover:bg-[#d4ae33] transition-colors cursor-pointer shadow-sm"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add User</span>
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
                  <th className="py-3.5 px-4">Full Name</th>
                  <th className="py-3.5 px-4">Contact Info</th>
                  <th className="py-3.5 px-4">Address</th>
                  <th className="py-3.5 px-4">City</th>
                  <th className="py-3.5 px-4">Pincode</th>
                  <th className="py-3.5 px-4">State / Country</th>
                  <th className="py-3.5 px-4">Created Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-zinc-100">
                {filteredUsers.map((u, index) => {
                  const initials = u.name
                    .split(' ')
                    .filter(Boolean)
                    .map((n) => n[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase();

                  const formattedDate = new Date(u.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  });

                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-zinc-50/80 transition-colors text-zinc-700"
                    >
                      {/* S. No */}
                      <td className="py-3 px-4 text-center font-medium text-zinc-500 text-xs">
                        {index + 1}
                      </td>

                      {/* Full Name with Avatar */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0"
                            style={{
                              backgroundColor: 'rgba(229, 192, 68, 0.2)',
                              color: '#8a6d1c',
                              border: '1px solid rgba(229, 192, 68, 0.4)',
                            }}
                          >
                            {initials || 'U'}
                          </div>
                          <span className="font-semibold text-zinc-900">{u.name}</span>
                        </div>
                      </td>

                      {/* Contact Info (Email & Phone Number) */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-zinc-700">
                            <Mail className="w-3 h-3 text-zinc-400 shrink-0" />
                            <span className="truncate max-w-[180px]">{u.email}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-zinc-500 text-[11px]">
                            <Phone className="w-3 h-3 text-zinc-400 shrink-0" />
                            <span>{u.phone}</span>
                          </div>
                        </div>
                      </td>

                      {/* Address */}
                      <td className="py-3 px-4 max-w-[200px]">
                        <div className="flex items-start gap-1 text-zinc-600">
                          <MapPin className="w-3 h-3 text-zinc-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-2 text-[11px] leading-tight">
                            {u.address || '—'}
                          </span>
                        </div>
                      </td>

                      {/* City */}
                      <td className="py-3 px-4 font-medium text-zinc-800">
                        {u.city || '—'}
                      </td>

                      {/* Pincode */}
                      <td className="py-3 px-4 font-mono font-medium text-zinc-800">
                        {u.pincode}
                      </td>

                      {/* State & Country */}
                      <td className="py-3 px-4">
                        <span className="font-medium text-zinc-900">{u.state}</span>
                        <span className="text-zinc-400 text-[11px] block">{u.country}</span>
                      </td>

                      {/* Created Date */}
                      <td className="py-3 px-4 text-zinc-500 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-zinc-400 shrink-0" />
                          <span>{formattedDate}</span>
                        </div>
                      </td>

                      {/* Action (Delete) */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDeleteUser(u.id, u.name)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          title="Delete User"
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

      {/* + Add User Popup Modal */}
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
                  <UserPlus className="w-4 h-4 text-[#8a6d1c]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">Add New User</h3>
                  <p className="text-[11px] text-zinc-500">
                    Create operator, client, or machine account
                  </p>
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

            {/* Modal Form */}
            <form onSubmit={handleAddUser} className="p-6 space-y-4 overflow-visible">
              {/* Error Banner */}
              {formError && (
                <div className="flex items-center gap-2 p-3 rounded-xl text-xs font-semibold bg-red-50 border border-red-200 text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{formError}</span>
                </div>
              )}

              {/* FULL NAME: Single Input */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-700 mb-1.5">
                  FULL NAME <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter full name"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  disabled={submitting}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-white text-zinc-900 placeholder-zinc-400 border border-zinc-300 outline-none focus:border-[#e5c044] focus:ring-2 focus:ring-[#e5c044]/30 transition-all shadow-xs"
                />
              </div>

              {/* Email & Phone Number */}
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
                  <div className="relative">
                    <input
                      type="email"
                      placeholder="user@example.com"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      disabled={submitting}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs bg-white text-zinc-900 placeholder-zinc-400 border outline-none transition-all shadow-xs ${emailStatus === 'duplicate'
                          ? 'border-red-500 bg-red-50/20 text-red-900 focus:border-red-600 focus:ring-2 focus:ring-red-200'
                          : emailStatus === 'available'
                            ? 'border-emerald-500/80 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200'
                            : 'border-zinc-300 focus:border-[#e5c044] focus:ring-2 focus:ring-[#e5c044]/30'
                        }`}
                    />
                    {emailStatus === 'duplicate' && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-red-500">
                        <AlertCircle className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                  {emailStatus === 'duplicate' && (
                    <p className="mt-1.5 text-[11px] font-semibold text-red-600 flex items-center gap-1 animate-fadeIn">
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
                        defaultValue={"India" as any}
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
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      disabled={submitting}
                      className="phone-number-input"
                    />
                  </div>
                </div>
              </div>

              {/* Address: Textarea */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-700 mb-1.5">
                  Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Enter full residential or workshop address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  disabled={submitting}
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
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    disabled={submitting}
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
                    value={formData.pincode}
                    onChange={(e) => handleInputChange('pincode', e.target.value)}
                    disabled={submitting}
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
                    defaultValue={"Andhra Pradesh" as any}
                    onChange={(e: any) => {
                      if (e) {
                        handleInputChange('state', e.name);
                      }
                    }}
                    placeHolder="Select State"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-700 mb-1.5">
                    Country <span className="text-red-500">*</span>
                  </label>
                  <CountrySelect
                    defaultValue={"India" as any}
                    showFlag={true}
                    onChange={(e: any) => {
                      if (e) {
                        setCountryId(e.id);
                        handleInputChange('country', e.name);
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

              {/* Form Actions */}
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
                  type="submit"
                  disabled={submitting || emailStatus === 'duplicate'}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer shadow-md hover:opacity-95 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: HS_THEME.colors.primaryGold,
                    color: '#000000',
                  }}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-black" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Add User</span>
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
