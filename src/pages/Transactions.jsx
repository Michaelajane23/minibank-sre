import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const categories = ['All', 'groceries', 'bills', 'subscriptions', 'transport', 'restaurants', 'shopping', 'transfers', 'income'];

export default function Transactions() {
  const { token } = useAuth();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const params = `?limit=100${category !== 'All' ? `&category=${category}` : ''}${search ? `&search=${search}` : ''}`;
  const { data, isLoading } = useQuery({ queryKey: ['transactions', category, search], queryFn: () => api.getTransactions(token, params) });

  const transactions = data?.transactions || [];

  // Group by date
  const grouped = {};
  transactions.forEach(tx => {
    const d = new Date(tx.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    if (!grouped[d]) grouped[d] = [];
    grouped[d].push(tx);
  });

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Transactions</h1>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-6">
        <div className="flex flex-col md:flex-row gap-3">
          <input type="text" placeholder="Search transactions..." value={search} onChange={e => setSearch(e.target.value)}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 outline-none" />
          <select value={category} onChange={e => setCategory(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 outline-none bg-white">
            {categories.map(c => <option key={c} value={c}>{c === 'All' ? 'All categories' : c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
        </div>
      </div>

      {/* Transaction list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <p className="text-center py-12 text-gray-400 text-sm">Loading...</p>
        ) : transactions.length === 0 ? (
          <p className="text-center py-12 text-gray-400 text-sm">No transactions found</p>
        ) : (
          Object.entries(grouped).map(([date, txs]) => (
            <div key={date}>
              <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{date}</p>
              </div>
              {txs.map(tx => (
                <div key={tx.id} className="flex items-center justify-between px-6 py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                      tx.type === 'credit' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {tx.type === 'credit' ? '↙' : '↗'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{tx.description}</p>
                      <p className="text-xs text-gray-400">{tx.category} • {new Date(tx.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-semibold ${tx.type === 'credit' ? 'text-green-600' : 'text-gray-900'}`}>
                    {tx.type === 'credit' ? '+' : '-'}£{Math.abs(tx.amount).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
