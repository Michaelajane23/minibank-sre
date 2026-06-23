import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const categoryColors = {
  groceries: '#10b981',
  bills: '#f59e0b',
  subscriptions: '#8b5cf6',
  transport: '#3b82f6',
  restaurants: '#ef4444',
  shopping: '#ec4899',
  transfers: '#6366f1',
  income: '#14b8a6'
};

export default function Dashboard() {
  const { token, user } = useAuth();
  const { data: account } = useQuery({ queryKey: ['account'], queryFn: () => api.getAccount(token) });
  const { data: txData } = useQuery({ queryKey: ['transactions-recent'], queryFn: () => api.getTransactions(token, '?limit=8') });
  const { data: pots } = useQuery({ queryKey: ['pots'], queryFn: () => api.getPots(token) });
  const { data: card } = useQuery({ queryKey: ['card'], queryFn: () => api.getCard(token) });
  const { data: analytics } = useQuery({ queryKey: ['analytics'], queryFn: () => api.getAnalytics(token) });

  const balance = account?.balance ?? 0;
  const available = account?.available ?? 0;
  const savingsTotal = pots?.pots?.reduce((sum, p) => sum + p.balance, 0) ?? 0;

  const spending = analytics?.spending || {};
  const monthlyTotals = analytics?.monthly || [];
  const monthlySpend = Object.values(spending).reduce((a, b) => a + b, 0);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const doughnutData = {
    labels: Object.keys(spending).map(k => k.charAt(0).toUpperCase() + k.slice(1)),
    datasets: [{
      data: Object.values(spending),
      backgroundColor: Object.keys(spending).map(k => categoryColors[k] || '#9ca3af'),
      borderWidth: 0
    }]
  };

  const barData = {
    labels: monthlyTotals.map(m => m.month),
    datasets: [{
      label: 'Spending',
      data: monthlyTotals.map(m => m.total),
      backgroundColor: '#4f46e5',
      borderRadius: 6
    }]
  };

  return (
    <div className="p-8 lg:p-12 max-w-[1100px]">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{greeting}, {user?.name?.split(' ')[0]}</h1>
        <p className="text-sm text-gray-500 mt-1">Here's your financial overview</p>
      </div>

      {/* Balance overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="md:col-span-2 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Current account</p>
          <p className="text-3xl font-bold tracking-tight mb-1">£{balance.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-gray-400">{account?.sortCode || '—'} • {account?.accountNumber || '—'}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Available</p>
          <p className="text-xl font-bold text-gray-900">£{available.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-gray-400 mt-1">Ready to spend</p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Savings</p>
          <p className="text-xl font-bold text-gray-900">£{savingsTotal.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-gray-400 mt-1">{pots?.pots?.length || 0} pots</p>
        </div>
      </div>

      {/* Quick actions + Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Quick actions</h3>
          <div className="space-y-2">
            <Link to="/transfer" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition group">
              <div className="w-9 h-9 bg-brand-50 rounded-lg flex items-center justify-center text-brand-600 group-hover:bg-brand-100 transition">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-700">Send money</span>
            </Link>
            <Link to="/pots" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition group">
              <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 group-hover:bg-emerald-100 transition">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-700">Move to savings</span>
            </Link>
            <Link to="/cards" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition group">
              <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600 group-hover:bg-amber-100 transition">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-700">Card controls</span>
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">This month</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500">Spent</span>
                <span className="text-sm font-semibold text-gray-900">£{monthlySpend.toFixed(2)}</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-brand-500 rounded-full" style={{ width: `${Math.min((monthlySpend / 2000) * 100, 100)}%` }}></div>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Budget remaining</span>
              <span className="text-emerald-600 font-medium">£{Math.max(2000 - monthlySpend, 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Card</h3>
          <div className="flex items-center gap-4">
            <div className="w-14 h-9 bg-gradient-to-br from-gray-800 to-gray-600 rounded-md flex items-center justify-center">
              <span className="text-white text-[10px] font-mono">••{card?.card?.lastFour || '••'}</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {card?.card?.status === 'frozen' ? '❄️ Frozen' : card?.card?.status === 'active' ? 'Active' : '—'}
              </p>
              <p className="text-xs text-gray-400">Visa Debit</p>
            </div>
          </div>
          {card?.card?.status === 'frozen' && (
            <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2 mt-3">Your card is currently frozen.</p>
          )}
        </div>
      </div>

      {/* Spending Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        {/* Category breakdown */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Spending by category</h3>
          {Object.keys(spending).length > 0 ? (
            <div className="flex items-center gap-6">
              <div className="w-32 h-32 flex-shrink-0">
                <Doughnut data={doughnutData} options={{ plugins: { legend: { display: false }, tooltip: { enabled: true } }, cutout: '70%', maintainAspectRatio: true }} />
              </div>
              <div className="flex-1 space-y-2">
                {Object.entries(spending).sort((a, b) => b[1] - a[1]).map(([cat, amount]) => (
                  <div key={cat} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: categoryColors[cat] || '#9ca3af' }} />
                      <span className="text-xs text-gray-600 capitalize">{cat}</span>
                    </div>
                    <span className="text-xs font-semibold text-gray-900 tabular-nums">£{amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-6">No spending data this month</p>
          )}
        </div>

        {/* Monthly spending trend */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Monthly spending</h3>
          {monthlyTotals.length > 0 ? (
            <div className="h-40">
              <Bar data={barData} options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  y: { beginAtZero: true, grid: { color: '#f3f4f6' }, ticks: { font: { size: 10 }, callback: v => '£' + v } },
                  x: { grid: { display: false }, ticks: { font: { size: 10 } } }
                }
              }} />
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-6">No monthly data yet</p>
          )}
        </div>
      </div>

      {/* Recent transactions */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Recent transactions</h3>
          <Link to="/transactions" className="text-xs text-brand-600 font-semibold hover:text-brand-700 transition">View all →</Link>
        </div>
        {txData?.transactions?.length > 0 ? (
          <div className="divide-y divide-gray-50">
            {txData.transactions.map(tx => (
              <div key={tx.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50/50 transition">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium ${
                    tx.type === 'credit' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {tx.type === 'credit' ? '↓' : '↑'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{tx.description}</p>
                    <p className="text-xs text-gray-400">{tx.category} • {new Date(tx.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
                  </div>
                </div>
                <span className={`text-sm font-semibold tabular-nums ${tx.type === 'credit' ? 'text-emerald-600' : 'text-gray-900'}`}>
                  {tx.type === 'credit' ? '+' : '−'}£{Math.abs(tx.amount).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-gray-400">No transactions yet</p>
            <p className="text-xs text-gray-300 mt-1">Transactions will appear here as you use your account</p>
          </div>
        )}
      </div>
    </div>
  );
}
