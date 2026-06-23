import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

async function fetchJson(url) {
  const res = await fetch(url);
  return res.json();
}

const severityColors = {
  P1: 'bg-red-100 text-red-700',
  P2: 'bg-yellow-100 text-yellow-700',
  P3: 'bg-blue-100 text-blue-700'
};

const statusColors = {
  NEW: 'bg-red-50 text-red-600 border-red-200',
  INVESTIGATING: 'bg-yellow-50 text-yellow-600 border-yellow-200',
  RESOLVED: 'bg-green-50 text-green-600 border-green-200'
};

export default function Incidents() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['incidents'], queryFn: () => fetchJson('/incidents'), refetchInterval: 5000 });
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [resolveNotes, setResolveNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  const incidents = data?.incidents || [];
  const stats = data?.stats || {};

  const loadDetail = async (id) => {
    setSelected(id);
    setActionError('');
    setResolveNotes('');
    const d = await fetchJson(`/incidents/${id}`);
    setDetail(d);
  };

  const handleAcknowledge = async () => {
    setActionLoading(true);
    setActionError('');
    try {
      const res = await fetch(`/incidents/${selected}/acknowledge`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignee: 'student' })
      });
      const d = await res.json();
      if (d.error) { setActionError(d.error); } else { setDetail(d); queryClient.invalidateQueries({ queryKey: ['incidents'] }); }
    } catch (e) { setActionError('Failed to acknowledge'); }
    setActionLoading(false);
  };

  const handleResolve = async () => {
    if (resolveNotes.trim().length < 5) { setActionError('Please describe what you found (at least 5 characters)'); return; }
    setActionLoading(true);
    setActionError('');
    try {
      const res = await fetch(`/incidents/${selected}/resolve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolutionNotes: resolveNotes })
      });
      const d = await res.json();
      if (d.error) { setActionError(d.error); } else { setDetail(d); queryClient.invalidateQueries({ queryKey: ['incidents'] }); }
    } catch (e) { setActionError('Failed to resolve'); }
    setActionLoading(false);
  };

  const formatTime = (ms) => {
    if (!ms) return '—';
    const s = Math.round(ms / 1000);
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  };

  return (
    <div className="p-8 lg:p-12 max-w-[1000px]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">🎫 Incidents</h1>
        <p className="text-sm text-gray-500 mt-1">Active and resolved incident tickets — like ServiceNow</p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm text-center">
          <p className="text-2xl font-bold text-gray-900">{stats.total || 0}</p>
          <p className="text-xs text-gray-500">Total</p>
        </div>
        <div className="bg-red-50 rounded-xl p-4 border border-red-200 text-center">
          <p className="text-2xl font-bold text-red-700">{stats.open || 0}</p>
          <p className="text-xs text-red-600">New</p>
        </div>
        <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200 text-center">
          <p className="text-2xl font-bold text-yellow-700">{stats.investigating || 0}</p>
          <p className="text-xs text-yellow-600">Investigating</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 border border-green-200 text-center">
          <p className="text-2xl font-bold text-green-700">{stats.resolved || 0}</p>
          <p className="text-xs text-green-600">Resolved</p>
        </div>
      </div>

      {!detail ? (
        /* Incident list */
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <p className="p-8 text-center text-gray-400 text-sm">Loading...</p>
          ) : incidents.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-400 text-sm">No incidents yet</p>
              <p className="text-xs text-gray-300 mt-1">Start the chaos engine from the SRE Training hub to generate incidents</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {incidents.map(inc => (
                <button key={inc.id} onClick={() => loadDetail(inc.id)}
                  className="w-full text-left px-6 py-4 hover:bg-gray-50/50 transition flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${severityColors[inc.severity]}`}>{inc.severity}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-gray-400">{inc.number}</span>
                        <p className="text-sm font-medium text-gray-900 truncate">{inc.title}</p>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{new Date(inc.createdAt).toLocaleString('en-GB')}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${statusColors[inc.status]}`}>{inc.status}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Incident detail */
        <div>
          <button onClick={() => { setSelected(null); setDetail(null); }}
            className="text-sm text-brand-600 font-medium mb-4 hover:underline">← Back to incidents</button>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-mono text-gray-400">{detail.number}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${severityColors[detail.severity]}`}>{detail.severity}</span>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${statusColors[detail.status]}`}>{detail.status}</span>
              </div>
              <h2 className="text-lg font-bold text-gray-900">{detail.title}</h2>
              <p className="text-sm text-gray-600 mt-1">{detail.description}</p>
            </div>

            {/* Timeline */}
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2"><span className="text-gray-400 w-20">Created</span><span className="text-gray-700">{new Date(detail.createdAt).toLocaleString('en-GB')}</span></div>
                {detail.acknowledgedAt && <div className="flex items-center gap-2"><span className="text-gray-400 w-20">Ack'd</span><span className="text-gray-700">{new Date(detail.acknowledgedAt).toLocaleString('en-GB')}</span></div>}
                {detail.resolvedAt && <div className="flex items-center gap-2"><span className="text-gray-400 w-20">Resolved</span><span className="text-gray-700">{new Date(detail.resolvedAt).toLocaleString('en-GB')} ({formatTime(detail.timeToResolveMs)})</span></div>}
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-5">
              {actionError && <p className="text-xs text-red-500 mb-3">{actionError}</p>}

              {detail.status === 'NEW' && (
                <div>
                  <p className="text-sm text-gray-600 mb-3">This incident needs investigation. Pick it up to begin.</p>
                  <button onClick={handleAcknowledge} disabled={actionLoading}
                    className="bg-brand-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-brand-700 transition disabled:opacity-50">
                    {actionLoading ? 'Picking up...' : 'Pick up incident → Start investigating'}
                  </button>
                </div>
              )}

              {detail.status === 'INVESTIGATING' && (
                <div>
                  <p className="text-sm text-gray-600 mb-3">
                    You're investigating. Use Splunk and Grafana to find the root cause, then resolve with your findings.
                  </p>
                  {detail.clue && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
                      <p className="text-xs font-semibold text-amber-800 mb-1">💡 Clue</p>
                      <p className="text-sm text-amber-700">{detail.clue}</p>
                    </div>
                  )}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">What did you find? (resolution notes)</label>
                      <textarea value={resolveNotes} onChange={e => setResolveNotes(e.target.value)} rows={3} placeholder="Describe the root cause you identified..."
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 outline-none resize-none" />
                    </div>
                    <button onClick={handleResolve} disabled={actionLoading}
                      className="bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-700 transition disabled:opacity-50">
                      {actionLoading ? 'Resolving...' : 'Resolve incident ✓'}
                    </button>
                  </div>
                </div>
              )}

              {detail.status === 'RESOLVED' && (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                    <p className="text-xs font-semibold text-green-800 mb-1">✓ Your resolution</p>
                    <p className="text-sm text-green-700">{detail.resolutionNotes}</p>
                  </div>
                  {detail.rootCause && (
                    <div className="bg-gray-900 rounded-xl px-4 py-3">
                      <p className="text-xs font-semibold text-gray-300 mb-1">🔑 Actual root cause</p>
                      <p className="text-sm text-white">{detail.rootCause}</p>
                    </div>
                  )}
                  <p className="text-xs text-gray-400">Time to resolve: {formatTime(detail.timeToResolveMs)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
