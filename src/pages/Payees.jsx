import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function Payees() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['payees'], queryFn: () => api.getPayees(token) });
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState('');
  const [sortCode, setSortCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [error, setError] = useState('');

  const payees = data?.payees || [];

  const resetForm = () => { setName(''); setSortCode(''); setAccountNumber(''); setEditing(null); setShowForm(false); setError(''); };

  const handleSave = async () => {
    setError('');
    if (!name || !sortCode || !accountNumber) return setError('All fields are required');
    try {
      if (editing) {
        await api.updatePayee(editing.id, { name, sortCode, accountNumber }, token);
      } else {
        await api.addPayee({ name, sortCode, accountNumber }, token);
      }
      queryClient.invalidateQueries({ queryKey: ['payees'] });
      resetForm();
    } catch(e) { setError(e.message); }
  };

  const handleEdit = (p) => { setEditing(p); setName(p.name); setSortCode(p.sortCode); setAccountNumber(p.accountNumber); setShowForm(true); };

  const handleDelete = async (id) => {
    if (!confirm('Remove this payee?')) return;
    await api.deletePayee(id, token);
    queryClient.invalidateQueries({ queryKey: ['payees'] });
  };

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Payees</h1>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-brand-700 transition">
          + Add payee
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">{editing ? 'Edit payee' : 'New payee'}</h3>
          {error && <div className="mb-3 p-3 bg-red-50 rounded-lg text-red-600 text-sm">{error}</div>}
          <div className="space-y-3">
            <input type="text" placeholder="Full name" value={name} onChange={e => setName(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 outline-none" />
            <input type="text" placeholder="Sort code (e.g. 04-00-04)" value={sortCode} onChange={e => setSortCode(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 outline-none" />
            <input type="text" placeholder="Account number" value={accountNumber} onChange={e => setAccountNumber(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 outline-none" />
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={resetForm} className="flex-1 py-2.5 rounded-lg text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={handleSave} className="flex-1 bg-brand-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-brand-700">Save</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? <p className="p-6 text-center text-gray-400 text-sm">Loading...</p> :
         payees.length === 0 ? <p className="p-6 text-center text-gray-400 text-sm">No payees yet. Add one to get started.</p> :
         payees.map(p => (
          <div key={p.id} className="flex items-center justify-between px-6 py-4 border-b border-gray-50 last:border-0">
            <div>
              <p className="text-sm font-medium text-gray-900">{p.name}</p>
              <p className="text-xs text-gray-400">{p.sortCode} • {p.accountNumber}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleEdit(p)} className="text-xs text-brand-600 font-medium hover:underline">Edit</button>
              <button onClick={() => handleDelete(p.id)} className="text-xs text-red-500 font-medium hover:underline">Remove</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
