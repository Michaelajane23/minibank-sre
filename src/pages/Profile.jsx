import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { token, user, logout } = useAuth();
  const { data: account } = useQuery({ queryKey: ['account'], queryFn: () => api.getAccount(token) });
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  return (
    <div className="p-8 lg:p-12 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Profile & Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your account details and security preferences</p>
      </div>

      {/* Personal details */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-6 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-sm font-semibold text-gray-900">Personal details</h3>
        </div>
        <div className="divide-y divide-gray-100">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Full name</p>
              <p className="text-sm font-medium text-gray-900">{user?.name || '—'}</p>
            </div>
          </div>
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Email address</p>
              <p className="text-sm font-medium text-gray-900">{user?.email || '—'}</p>
            </div>
          </div>
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Member since</p>
              <p className="text-sm font-medium text-gray-900">
                {account?.user?.createdAt
                  ? new Date(account.user.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
                  : 'Today'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Account details */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-6 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-sm font-semibold text-gray-900">Account details</h3>
        </div>
        <div className="divide-y divide-gray-100">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Account number</p>
              <p className="text-sm font-medium text-gray-900 font-mono">{account?.accountNumber || '—'}</p>
            </div>
          </div>
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Sort code</p>
              <p className="text-sm font-medium text-gray-900 font-mono">{account?.sortCode || '—'}</p>
            </div>
          </div>
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Currency</p>
              <p className="text-sm font-medium text-gray-900">{account?.currency || 'GBP'} — British Pound</p>
            </div>
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-6 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-sm font-semibold text-gray-900">Security</h3>
        </div>
        <div className="divide-y divide-gray-100">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="text-sm font-medium text-gray-900">Password</p>
              <p className="text-xs text-gray-400">Last changed: Never</p>
            </div>
            <button
              onClick={() => setShowPasswordForm(!showPasswordForm)}
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 px-3 py-1.5 rounded-lg hover:bg-brand-50 transition"
            >
              Change
            </button>
          </div>
          {showPasswordForm && (
            <div className="px-6 py-4 bg-gray-50/50">
              <div className="space-y-3 max-w-sm">
                <input type="password" placeholder="Current password"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 outline-none" />
                <input type="password" placeholder="New password"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 outline-none" />
                <input type="password" placeholder="Confirm new password"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 outline-none" />
                <button className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-brand-700 transition">
                  Update password
                </button>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="text-sm font-medium text-gray-900">Two-factor authentication</p>
              <p className="text-xs text-gray-400">Add an extra layer of security</p>
            </div>
            <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">Coming soon</span>
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-red-50 bg-red-50/30">
          <h3 className="text-sm font-semibold text-red-700">Account actions</h3>
        </div>
        <div className="px-6 py-4">
          <button
            onClick={logout}
            className="flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700 px-4 py-2.5 rounded-lg border border-red-200 hover:bg-red-50 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
            Sign out of all devices
          </button>
        </div>
      </div>
    </div>
  );
}
