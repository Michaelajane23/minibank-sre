import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function Cards() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['card'], queryFn: () => api.getCard(token) });

  const card = data?.card;
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['card'] });

  const handleFreeze = async () => { await api.freezeCard(token); refresh(); };
  const handleUnfreeze = async () => { await api.unfreezeCard(token); refresh(); };
  const handleReplace = async () => {
    if (!confirm('Request a replacement card? Your current card will be cancelled.')) return;
    await api.replaceCard(token);
    refresh();
  };

  if (isLoading) return <div className="p-8"><p className="text-gray-400 text-sm">Loading...</p></div>;

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Cards</h1>

      {card && (
        <>
          {/* Card visual */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-700 rounded-2xl p-8 text-white mb-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2"></div>
            <p className="text-xs uppercase tracking-wider opacity-60 mb-8">MiniBank Debit</p>
            <p className="text-xl tracking-widest font-mono mb-6">•••• •••• •••• {card.lastFour}</p>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-xs opacity-60">Card holder</p>
                <p className="text-sm font-medium">{card.holderName}</p>
              </div>
              <div>
                <p className="text-xs opacity-60">Expires</p>
                <p className="text-sm font-medium">{card.expiry}</p>
              </div>
              <div className="text-right">
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                  card.status === 'active' ? 'bg-green-500/20 text-green-300' :
                  card.status === 'frozen' ? 'bg-blue-500/20 text-blue-300' : 'bg-red-500/20 text-red-300'
                }`}>{card.status}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4">Card controls</h3>
            <div className="space-y-3">
              {card.status === 'active' ? (
                <button onClick={handleFreeze} className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">❄️</span>
                    <div className="text-left"><p className="text-sm font-medium text-gray-900">Freeze card</p><p className="text-xs text-gray-400">Temporarily disable your card</p></div>
                  </div>
                </button>
              ) : card.status === 'frozen' ? (
                <button onClick={handleUnfreeze} className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 transition">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">🔓</span>
                    <div className="text-left"><p className="text-sm font-medium text-gray-900">Unfreeze card</p><p className="text-xs text-gray-400">Your card is currently frozen</p></div>
                  </div>
                </button>
              ) : null}
              <button onClick={handleReplace} className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition">
                <div className="flex items-center gap-3">
                  <span className="text-lg">🔄</span>
                  <div className="text-left"><p className="text-sm font-medium text-gray-900">Replace card</p><p className="text-xs text-gray-400">Lost or damaged? Get a new one</p></div>
                </div>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
