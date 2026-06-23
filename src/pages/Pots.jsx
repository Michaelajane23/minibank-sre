import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function Pots() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['pots'], queryFn: () => api.getPots(token) });
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newGoal, setNewGoal] = useState('');
  const [actionPot, setActionPot] = useState(null);
  const [actionType, setActionType] = useState('');
  const [actionAmount, setActionAmount] = useState('');

  const pots = data?.pots || [];
  const refresh = () => { queryClient.invalidateQueries({ queryKey: ['pots'] }); queryClient.invalidateQueries({ queryKey: ['account'] }); };

  const handleCreate = async () => {
    if (!newName) return;
    await api.createPot({ name: newName, goal: parseFloat(newGoal) || 0 }, token);
    setShowCreate(false); setNewName(''); setNewGoal('');
    refresh();
  };

  const handleAction = async () => {
    if (!actionAmount || parseFloat(actionAmount) <= 0) return;
    if (actionType === 'deposit') await api.depositPot(actionPot.id, { amount: parseFloat(actionAmount) }, token);
    else await api.withdrawPot(actionPot.id, { amount: parseFloat(actionAmount) }, token);
    setActionPot(null); setActionAmount('');
    refresh();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this pot? Funds will return to your balance.')) return;
    await api.deletePot(id, token);
    refresh();
  };

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Savings Pots</h1>
        <button onClick={() => setShowCreate(true)} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-brand-700 transition">
          + Create pot
        </button>
      </div>

      {showCreate && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">New savings pot</h3>
          <div className="space-y-3">
            <input type="text" placeholder="Pot name (e.g. Holiday fund)" value={newName} onChange={e => setNewName(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 outline-none" />
            <input type="number" placeholder="Goal amount (optional)" value={newGoal} onChange={e => setNewGoal(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 outline-none" />
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 rounded-lg text-sm font-semibold border border-gray-200 text-gray-600">Cancel</button>
            <button onClick={handleCreate} className="flex-1 bg-brand-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-brand-700">Create</button>
          </div>
        </div>
      )}

      {actionPot && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">{actionType === 'deposit' ? 'Add to' : 'Withdraw from'} {actionPot.name}</h3>
          <input type="number" placeholder="Amount" value={actionAmount} onChange={e => setActionAmount(e.target.value)} min="0.01" step="0.01"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 outline-none mb-4" />
          <div className="flex gap-3">
            <button onClick={() => setActionPot(null)} className="flex-1 py-2.5 rounded-lg text-sm font-semibold border border-gray-200 text-gray-600">Cancel</button>
            <button onClick={handleAction} className="flex-1 bg-brand-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-brand-700">Confirm</button>
          </div>
        </div>
      )}

      {isLoading ? <p className="text-center text-gray-400 text-sm">Loading...</p> :
       pots.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-gray-100 shadow-sm text-center">
          <p className="text-gray-400 text-sm">No savings pots yet. Create one to start saving!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pots.map(pot => (
            <div key={pot.id} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">{pot.name}</h3>
                <button onClick={() => handleDelete(pot.id)} className="text-xs text-red-500 hover:underline">Delete</button>
              </div>
              <p className="text-2xl font-bold text-gray-900 mb-1">£{pot.balance.toFixed(2)}</p>
              {pot.goal > 0 && (
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Progress</span>
                    <span>£{pot.goal.toFixed(0)} goal</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-600 rounded-full transition-all" style={{ width: `${Math.min((pot.balance / pot.goal) * 100, 100)}%` }} />
                  </div>
                </div>
              )}
              <div className="flex gap-2 mt-3">
                <button onClick={() => { setActionPot(pot); setActionType('deposit'); }} className="flex-1 py-2 rounded-lg text-xs font-semibold bg-brand-50 text-brand-700 hover:bg-brand-100 transition">Add money</button>
                <button onClick={() => { setActionPot(pot); setActionType('withdraw'); }} className="flex-1 py-2 rounded-lg text-xs font-semibold bg-gray-50 text-gray-600 hover:bg-gray-100 transition">Withdraw</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
