import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function Transfer() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const { data: payeesData } = useQuery({ queryKey: ['payees'], queryFn: () => api.getPayees(token) });
  const [step, setStep] = useState(1);
  const [payeeId, setPayeeId] = useState('');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);

  const payees = payeesData?.payees || [];
  const selectedPayee = payees.find(p => p.id === payeeId);

  const handleReview = () => {
    if (!payeeId) return setError('Select a payee');
    if (!amount || parseFloat(amount) <= 0) return setError('Enter a valid amount');
    setError('');
    setStep(2);
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.transfer({ payeeId, amount: parseFloat(amount), reference }, token);
      setSuccess(res);
      setStep(3);
      queryClient.invalidateQueries({ queryKey: ['account'] });
      queryClient.invalidateQueries({ queryKey: ['transactions-recent'] });
    } catch(e) {
      setError(e.message || 'Transfer failed');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setStep(1); setPayeeId(''); setAmount(''); setReference(''); setError(''); setSuccess(null); };

  return (
    <div className="p-8 max-w-lg">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Send money</h1>

      {step === 1 && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          {error && <div className="mb-4 p-3 bg-red-50 rounded-lg text-red-600 text-sm">{error}</div>}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">To</label>
              <select value={payeeId} onChange={e => setPayeeId(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 outline-none bg-white">
                <option value="">Select a payee...</option>
                {payees.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sortCode} {p.accountNumber})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount</label>
              <div className="relative">
                <span className="absolute left-4 top-2.5 text-gray-400 font-medium">£</span>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} min="0.01" step="0.01"
                  className="w-full pl-8 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 outline-none" placeholder="0.00" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Reference (optional)</label>
              <input type="text" value={reference} onChange={e => setReference(e.target.value)} maxLength={50}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 outline-none" placeholder="e.g. Dinner split" />
            </div>
            <button onClick={handleReview} className="w-full bg-brand-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-brand-700 transition">
              Review transfer
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Confirm transfer</h3>
          {error && <div className="mb-4 p-3 bg-red-50 rounded-lg text-red-600 text-sm">{error}</div>}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3 mb-6">
            <div className="flex justify-between text-sm"><span className="text-gray-500">To</span><span className="font-medium">{selectedPayee?.name}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Sort code</span><span className="font-medium">{selectedPayee?.sortCode}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Account</span><span className="font-medium">{selectedPayee?.accountNumber}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Amount</span><span className="font-semibold text-lg">£{parseFloat(amount).toFixed(2)}</span></div>
            {reference && <div className="flex justify-between text-sm"><span className="text-gray-500">Reference</span><span className="font-medium">{reference}</span></div>}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 py-2.5 rounded-lg font-semibold text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 transition">Edit</button>
            <button onClick={handleConfirm} disabled={loading} className="flex-1 bg-brand-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-brand-700 transition disabled:opacity-50">
              {loading ? 'Sending...' : 'Confirm & send'}
            </button>
          </div>
        </div>
      )}

      {step === 3 && success && (
        <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm text-center">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-green-600 text-2xl font-bold">✓</span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Payment sent</h3>
          <p className="text-gray-500 text-sm mb-6">£{parseFloat(amount).toFixed(2)} sent to {selectedPayee?.name}</p>
          <button onClick={reset} className="bg-brand-600 text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-brand-700 transition">
            Send another
          </button>
        </div>
      )}
    </div>
  );
}
