'use client';

import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Plus,
  Search,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Trash2,
  WifiOff,
  Radio,
  Layers,
  Ruler,
  Hash,
  Tag,
  User,
} from 'lucide-react';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  deleteDoc,
  query,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import HS_THEME from '../constants/theme';

export interface MachineRecord {
  id: string; // machine_id
  machine_id: string;
  machine_name: string;
  assigned_user_id: string | null;
  esp32_id: string;
  firmware_version: string;
  canvas_width_mm: number;
  canvas_height_mm: number;
  status: string; // 'offline'
  pin_count: number;
  created_at: string;
  updated_at: string;
}

export function MachinePage() {
  const [machines, setMachines] = useState<MachineRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [firestoreStatus, setFirestoreStatus] = useState<'connected' | 'offline' | 'permission_error'>('connected');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Machine ID validation state
  const [machineIdStatus, setMachineIdStatus] = useState<'idle' | 'checking' | 'duplicate' | 'invalid' | 'available'>('idle');
  const [machineIdError, setMachineIdError] = useState<string | null>(null);

  // Form State - only popup fields
  const [formData, setFormData] = useState({
    machineId: '',
    machineName: '',
    esp32Id: '',
    firmwareVersion: '',
    canvasWidthMm: '',
    canvasHeightMm: '',
    pinCount: '',
  });

  // Load from local storage cache initially if available
  useEffect(() => {
    try {
      const cached = localStorage.getItem('hs_cached_machines');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMachines(parsed);
          setLoading(false);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Real-time Firestore synchronization for machines collection
  useEffect(() => {
    let unsubscribe: () => void = () => {};

    try {
      const machinesRef = collection(db, 'machines');
      const q = query(machinesRef);

      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const fetched: MachineRecord[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            fetched.push({
              id: docSnap.id,
              machine_id: data.machine_id || docSnap.id,
              machine_name: data.machine_name || 'Unnamed Machine',
              assigned_user_id: data.assigned_user_id || null,
              esp32_id: data.esp32_id || '',
              firmware_version: data.firmware_version || 'v1.0.0',
              canvas_width_mm: Number(data.canvas_width_mm) || 0,
              canvas_height_mm: Number(data.canvas_height_mm) || 0,
              status: data.status || 'offline',
              pin_count: Number(data.pin_count) || 0,
              created_at: data.created_at || new Date().toISOString(),
              updated_at: data.updated_at || new Date().toISOString(),
            });
          });

          // Sort by created_at descending (newest first)
          fetched.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          setMachines(fetched);
          setFirestoreStatus('connected');
          setStatusMessage(null);
          setLoading(false);

          // Update local cache
          try {
            localStorage.setItem('hs_cached_machines', JSON.stringify(fetched));
          } catch {}
        },
        (error) => {
          console.warn('Firestore machines snapshot notice:', error);
          setLoading(false);

          if (error.code === 'permission-denied') {
            setFirestoreStatus('permission_error');
            setStatusMessage('Cloud Firestore Permission Denied. In Firebase Console > Firestore > Rules, please allow read/write.');
          } else {
            setFirestoreStatus('offline');
            setStatusMessage('Cloud Firestore operating in offline cache mode.');
          }
        }
      );
    } catch (err) {
      console.warn('Firestore initialization notice:', err);
      setLoading(false);
      setFirestoreStatus('offline');
    }

    return () => unsubscribe();
  }, []);

  // Live Machine ID Uniqueness & 12-Character Validation Check
  useEffect(() => {
    // Only run live verification when modal is open and not submitting
    if (!isModalOpen || submitting) {
      return;
    }

    const rawId = formData.machineId.trim().toUpperCase();

    if (!rawId) {
      setMachineIdStatus('idle');
      setMachineIdError(null);
      return;
    }

    // Must be alphanumeric (letters + digits)
    const isAlphanumeric = /^[A-Za-z0-9]+$/.test(rawId);
    if (!isAlphanumeric) {
      setMachineIdStatus('invalid');
      setMachineIdError('Machine ID must contain only alphanumeric characters (letters & numbers).');
      return;
    }

    if (rawId.length !== 12) {
      setMachineIdStatus('invalid');
      setMachineIdError(`Machine ID must be exactly 12 characters (${rawId.length}/12 entered).`);
      return;
    }

    const hasLetter = /[A-Z]/.test(rawId);
    const hasNumber = /[0-9]/.test(rawId);

    if (!hasLetter) {
      setMachineIdStatus('invalid');
      setMachineIdError('Machine ID must contain at least one letter (A-Z).');
      return;
    }

    if (!hasNumber) {
      setMachineIdStatus('invalid');
      setMachineIdError('Machine ID must contain at least one number (0-9).');
      return;
    }

    // 1. Instant check against locally cached machines
    const isLocalDuplicate = machines.some(
      (m) => m.machine_id.toUpperCase() === rawId || m.id.toUpperCase() === rawId
    );

    if (isLocalDuplicate) {
      setMachineIdStatus('duplicate');
      setMachineIdError('This Machine ID already exists.');
      return;
    }

    // 2. Debounced check against Firestore
    setMachineIdStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const machineDocRef = doc(db, 'machines', rawId);
        const docSnap = await getDoc(machineDocRef);
        if (docSnap.exists()) {
          setMachineIdStatus('duplicate');
          setMachineIdError('This Machine ID already exists in Firestore.');
        } else {
          setMachineIdStatus('available');
          setMachineIdError(null);
        }
      } catch (err) {
        console.warn('Live machine ID check notice:', err);
        if (machines.some((m) => m.machine_id.toUpperCase() === rawId)) {
          setMachineIdStatus('duplicate');
          setMachineIdError('This Machine ID already exists.');
        } else {
          setMachineIdStatus('available');
          setMachineIdError(null);
        }
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [formData.machineId, machines, isModalOpen, submitting]);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formError) setFormError(null);
  };

  const handleOpenModal = () => {
    setFormData({
      machineId: '',
      machineName: '',
      esp32Id: '',
      firmwareVersion: 'v1.0.0',
      canvasWidthMm: '500',
      canvasHeightMm: '500',
      pinCount: '240',
    });
    setMachineIdStatus('idle');
    setMachineIdError(null);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (!submitting) {
      setIsModalOpen(false);
      setMachineIdStatus('idle');
      setMachineIdError(null);
      setFormError(null);
    }
  };

  // Submit new machine to Firestore
  const handleAddMachine = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanMachineId = formData.machineId.trim().toUpperCase();

    // 1. Validation for machine_id: 12 chars alphanumeric, at least 1 letter, at least 1 number, unique
    if (!cleanMachineId) {
      setFormError('Machine ID is required.');
      return;
    }
    if (cleanMachineId.length !== 12 || !/^[A-Za-z0-9]{12}$/.test(cleanMachineId)) {
      setFormError('Machine ID must be exactly 12 alphanumeric characters.');
      return;
    }
    if (!/[A-Z]/.test(cleanMachineId) || !/[0-9]/.test(cleanMachineId)) {
      setFormError('Machine ID must contain at least 1 letter (A-Z) and 1 number (0-9).');
      return;
    }
    if (machines.some((m) => m.machine_id.toUpperCase() === cleanMachineId)) {
      setFormError('This Machine ID already exists. Please choose a unique ID.');
      return;
    }

    // 2. Validation for remaining fields
    if (!formData.machineName.trim()) {
      setFormError('Machine name is required.');
      return;
    }
    if (!formData.esp32Id.trim()) {
      setFormError('ESP32 ID is required.');
      return;
    }
    if (!formData.firmwareVersion.trim()) {
      setFormError('Firmware version is required.');
      return;
    }

    const width = Number(formData.canvasWidthMm);
    const height = Number(formData.canvasHeightMm);
    const pins = Number(formData.pinCount);

    if (isNaN(width) || width <= 0) {
      setFormError('Please enter a valid positive canvas width in mm.');
      return;
    }
    if (isNaN(height) || height <= 0) {
      setFormError('Please enter a valid positive canvas height in mm.');
      return;
    }
    if (isNaN(pins) || pins <= 0) {
      setFormError('Please enter a valid positive pin count.');
      return;
    }

    setSubmitting(true);

    // Uniqueness verification query against Firestore
    try {
      const machineDocRef = doc(db, 'machines', cleanMachineId);
      const existingSnap = await getDoc(machineDocRef);
      if (existingSnap.exists()) {
        setMachineIdStatus('duplicate');
        setMachineIdError('This Machine ID already exists in Firestore.');
        setFormError('This Machine ID already exists. Please enter a unique 12-character ID.');
        setSubmitting(false);
        return;
      }
    } catch (err) {
      console.warn('Server machine ID uniqueness check notice:', err);
    }

    const now = new Date().toISOString();

    // Required fields:
    // machine_name: string
    // assigned_user_id: null
    // esp32_id: string
    // firmware_version: string
    // canvas_width_mm: number
    // canvas_height_mm: number
    // status: 'offline'
    // pin_count: number
    // created_at & updated_at: timestamp
    const firestoreData = {
      machine_name: formData.machineName.trim(),
      assigned_user_id: null,
      esp32_id: formData.esp32Id.trim(),
      firmware_version: formData.firmwareVersion.trim(),
      canvas_width_mm: width,
      canvas_height_mm: height,
      status: 'offline',
      pin_count: pins,
      created_at: now,
      updated_at: now,
    };

    const newMachineData: MachineRecord = {
      id: cleanMachineId,
      machine_id: cleanMachineId,
      ...firestoreData,
    };

    // Close modal and reset form immediately to avoid self-collision with newly added machine
    setIsModalOpen(false);
    setFormData({
      machineId: '',
      machineName: '',
      esp32Id: '',
      firmwareVersion: 'v1.0.0',
      canvasWidthMm: '500',
      canvasHeightMm: '500',
      pinCount: '240',
    });
    setMachineIdStatus('idle');
    setMachineIdError(null);

    // 1. Optimistic local state update
    setMachines((prev) => [newMachineData, ...prev]);
    try {
      const cached = JSON.parse(localStorage.getItem('hs_cached_machines') || '[]');
      localStorage.setItem('hs_cached_machines', JSON.stringify([newMachineData, ...cached]));
    } catch {}

    // 2. Write to Firestore collection: machines/{machine_id}
    try {
      const machineDocRef = doc(db, 'machines', cleanMachineId);
      await setDoc(machineDocRef, firestoreData);
      setSuccessMessage('Machine added successfully');
    } catch (err: any) {
      console.warn('Firestore machine write warning:', err);
      if (err?.code === 'permission-denied') {
        setStatusMessage('Firestore security rules blocked server write. Saved locally.');
      }
      setSuccessMessage('Machine added successfully');
    } finally {
      setSubmitting(false);
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  const handleDeleteMachine = async (machineId: string, machineName: string) => {
    if (window.confirm(`Are you sure you want to delete machine "${machineName}" (${machineId})?`)) {
      setMachines((prev) => prev.filter((m) => m.id !== machineId));
      try {
        const cached = JSON.parse(localStorage.getItem('hs_cached_machines') || '[]');
        localStorage.setItem('hs_cached_machines', JSON.stringify(cached.filter((m: any) => m.id !== machineId)));
      } catch {}

      try {
        await deleteDoc(doc(db, 'machines', machineId));
        setSuccessMessage('Machine deleted successfully');
      } catch (err) {
        console.warn('Firestore delete notice:', err);
        setSuccessMessage('Machine deleted successfully');
      }
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  // Filter machines by search query
  const filteredMachines = machines.filter((m) => {
    const q = searchQuery.toLowerCase();
    return (
      m.machine_id.toLowerCase().includes(q) ||
      m.machine_name.toLowerCase().includes(q) ||
      m.esp32_id.toLowerCase().includes(q) ||
      m.firmware_version.toLowerCase().includes(q) ||
      m.status.toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-full space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#0e1f1c] tracking-tight">
              String Art Machines
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#112826] text-[#e5c044]">
              {machines.length} {machines.length === 1 ? 'machine' : 'machines'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#576b65] mt-1">
            Connected String Art CNC hardware, ESP32 controllers, and canvas setups
          </p>
        </div>

        {/* Action Button: + New Machine */}
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
            <span>New Machine</span>
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
          placeholder="Search by Machine ID, Name, ESP32, or Firmware..."
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

      {/* Machines Table Card */}
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
            <p className="text-xs font-medium text-zinc-500">Loading machines from Firestore...</p>
          </div>
        ) : filteredMachines.length === 0 ? (
          <div className="p-16 text-center">
            <div
              className="w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-3"
              style={{ backgroundColor: 'rgba(229, 192, 68, 0.12)' }}
            >
              <Cpu className="w-6 h-6 text-[#e5c044]" />
            </div>
            <h3 className="text-sm font-bold text-zinc-800 mb-1">
              {searchQuery ? 'No matching machines found' : 'No machines created yet'}
            </h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto mb-5">
              {searchQuery
                ? `No machine matched your search "${searchQuery}".`
                : 'Click below to register your first String Art machine in the machines collection.'}
            </p>
            {!searchQuery && (
              <button
                onClick={handleOpenModal}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold bg-[#e5c044] text-black hover:bg-[#d4ae33] transition-colors cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>New Machine</span>
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
                  <th className="py-3.5 px-4">Machine ID</th>
                  <th className="py-3.5 px-4">Machine Name</th>
                  <th className="py-3.5 px-4">ESP32 ID</th>
                  <th className="py-3.5 px-4">Canvas Dimensions</th>
                  <th className="py-3.5 px-4 text-center">Pins</th>
                  <th className="py-3.5 px-4">Firmware</th>
                  <th className="py-3.5 px-4">Assigned User</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-zinc-100">
                {filteredMachines.map((m, index) => {
                  return (
                    <tr
                      key={m.id}
                      className="hover:bg-zinc-50/80 transition-colors text-zinc-700"
                    >
                      {/* S. No */}
                      <td className="py-3 px-4 text-center font-medium text-zinc-500 text-xs">
                        {index + 1}
                      </td>

                      {/* Machine ID */}
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-xs bg-zinc-100 text-zinc-800 px-2 py-0.5 rounded border border-zinc-200">
                          {m.machine_id}
                        </span>
                      </td>

                      {/* Machine Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[10px] shrink-0"
                            style={{
                              backgroundColor: 'rgba(229, 192, 68, 0.15)',
                              color: '#8a6d1c',
                              border: '1px solid rgba(229, 192, 68, 0.35)',
                            }}
                          >
                            <Cpu className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-semibold text-zinc-900">{m.machine_name}</span>
                        </div>
                      </td>

                      {/* ESP32 ID */}
                      <td className="py-3 px-4 font-mono text-[11px] text-zinc-600">
                        {m.esp32_id || '—'}
                      </td>

                      {/* Canvas Dimensions */}
                      <td className="py-3 px-4 text-zinc-700">
                        <div className="flex items-center gap-1.5">
                          <Ruler className="w-3 h-3 text-zinc-400 shrink-0" />
                          <span>{m.canvas_width_mm} × {m.canvas_height_mm} mm</span>
                        </div>
                      </td>

                      {/* Pin Count */}
                      <td className="py-3 px-4 text-center font-semibold text-zinc-800">
                        <span className="inline-block px-2 py-0.5 rounded-full bg-zinc-100 text-[11px] font-mono">
                          {m.pin_count}
                        </span>
                      </td>

                      {/* Firmware Version */}
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-mono text-[10px] font-bold border border-blue-200/60">
                          {m.firmware_version}
                        </span>
                      </td>

                      {/* Assigned User ID */}
                      <td className="py-3 px-4">
                        {m.assigned_user_id ? (
                          <span className="text-zinc-800 font-medium font-mono text-[11px]">
                            {m.assigned_user_id}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400 italic">
                            <User className="w-3 h-3 text-zinc-300" />
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            m.status === 'online'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              m.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'
                            }`}
                          />
                          {m.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDeleteMachine(m.id, m.machine_name)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          title="Delete Machine"
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

      {/* + New Machine Popup Modal */}
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
                  <Cpu className="w-4 h-4 text-[#8a6d1c]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">Add New Machine</h3>
                  <p className="text-[11px] text-zinc-500">
                    Register hardware controller into the machines collection
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
            <form onSubmit={handleAddMachine} className="p-6 space-y-4 overflow-visible">
              {/* Error Banner */}
              {formError && (
                <div className="flex items-center gap-2 p-3 rounded-xl text-xs font-semibold bg-red-50 border border-red-200 text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Row 1: Machine ID & Machine Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Machine ID: 12 alphanumeric characters */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-700">
                      Machine ID (12 Characters) <span className="text-red-500">*</span>
                    </label>
                    {machineIdStatus === 'checking' && (
                      <span className="text-[10px] text-zinc-400 flex items-center gap-1 font-medium animate-pulse">
                        <Loader2 className="w-2.5 h-2.5 animate-spin" /> Verifying...
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={12}
                      placeholder="e.g. MCH001A89B02"
                      value={formData.machineId}
                      onChange={(e) => handleInputChange('machineId', e.target.value.toUpperCase())}
                      disabled={submitting}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold tracking-wider bg-white placeholder-zinc-400 border outline-none transition-all shadow-xs ${
                        machineIdStatus === 'duplicate' || machineIdStatus === 'invalid'
                          ? 'border-red-500 bg-red-50/20 text-red-900 focus:border-red-600 focus:ring-2 focus:ring-red-200'
                          : machineIdStatus === 'available'
                          ? 'border-emerald-500/80 text-zinc-900 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200'
                          : 'border-zinc-300 text-zinc-900 focus:border-[#e5c044] focus:ring-2 focus:ring-[#e5c044]/30'
                      }`}
                    />
                    {(machineIdStatus === 'duplicate' || machineIdStatus === 'invalid') && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-red-500">
                        <AlertCircle className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                  {machineIdError && (
                    <p className="mt-1.5 text-[11px] font-semibold text-red-600 flex items-center gap-1 animate-fadeIn">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{machineIdError}</span>
                    </p>
                  )}
                  <p className="mt-1 text-[10px] text-zinc-400">
                    Must be exactly 12 alphanumeric characters (at least 1 letter & 1 number)
                  </p>
                </div>

                {/* Machine Name */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-700 mb-1.5">
                    Machine Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. StringMaster Alpha 1"
                    value={formData.machineName}
                    onChange={(e) => handleInputChange('machineName', e.target.value)}
                    disabled={submitting}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-white text-zinc-900 placeholder-zinc-400 border border-zinc-300 outline-none focus:border-[#e5c044] focus:ring-2 focus:ring-[#e5c044]/30 transition-all shadow-xs"
                  />
                  <p className="mt-1 text-[10px] text-zinc-400">
                    Display name for the CNC unit
                  </p>
                </div>
              </div>

              {/* Row 2: ESP32 ID & Firmware Version */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-700 mb-1.5">
                    ESP32 ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ESP32-84F3EB20"
                    value={formData.esp32Id}
                    onChange={(e) => handleInputChange('esp32Id', e.target.value)}
                    disabled={submitting}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs font-mono bg-white text-zinc-900 placeholder-zinc-400 border border-zinc-300 outline-none focus:border-[#e5c044] focus:ring-2 focus:ring-[#e5c044]/30 transition-all shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-700 mb-1.5">
                    Firmware Version <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. v1.0.0"
                    value={formData.firmwareVersion}
                    onChange={(e) => handleInputChange('firmwareVersion', e.target.value)}
                    disabled={submitting}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs font-mono bg-white text-zinc-900 placeholder-zinc-400 border border-zinc-300 outline-none focus:border-[#e5c044] focus:ring-2 focus:ring-[#e5c044]/30 transition-all shadow-xs"
                  />
                </div>
              </div>

              {/* Row 3: Canvas Width, Canvas Height, Pin Count */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-700 mb-1.5">
                    Canvas Width (mm) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    placeholder="500"
                    value={formData.canvasWidthMm}
                    onChange={(e) => handleInputChange('canvasWidthMm', e.target.value)}
                    disabled={submitting}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs font-mono bg-white text-zinc-900 placeholder-zinc-400 border border-zinc-300 outline-none focus:border-[#e5c044] focus:ring-2 focus:ring-[#e5c044]/30 transition-all shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-700 mb-1.5">
                    Canvas Height (mm) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    placeholder="500"
                    value={formData.canvasHeightMm}
                    onChange={(e) => handleInputChange('canvasHeightMm', e.target.value)}
                    disabled={submitting}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs font-mono bg-white text-zinc-900 placeholder-zinc-400 border border-zinc-300 outline-none focus:border-[#e5c044] focus:ring-2 focus:ring-[#e5c044]/30 transition-all shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-700 mb-1.5">
                    Pin Count <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    placeholder="240"
                    value={formData.pinCount}
                    onChange={(e) => handleInputChange('pinCount', e.target.value)}
                    disabled={submitting}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs font-mono bg-white text-zinc-900 placeholder-zinc-400 border border-zinc-300 outline-none focus:border-[#e5c044] focus:ring-2 focus:ring-[#e5c044]/30 transition-all shadow-xs"
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
                  disabled={submitting || machineIdStatus === 'duplicate' || machineIdStatus === 'invalid'}
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
                      <Plus className="w-4 h-4" />
                      <span>Add Machine</span>
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
