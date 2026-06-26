import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

async function fetchJson(url) {
  const res = await fetch(url);
  return res.json();
}

function relativeTime(isoString) {
  if (!isoString) return '—';
  const ms = Date.now() - new Date(isoString).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min${m > 1 ? 's' : ''} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr${h > 1 ? 's' : ''} ago`;
  return 'yesterday';
}

function formatTTR(ms) {
  if (!ms) return '—';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

const priorityBadge = { P1: 'bg-red-600', P2: 'bg-orange-500', P3: 'bg-blue-500' };
const priorityBorder = { P1: 'border-l-red-600', P2: 'border-l-orange-500', P3: 'border-l-blue-500' };
const priorityBanner = { P1: 'bg-red-600', P2: 'bg-orange-500', P3: 'bg-blue-400' };
const statusBadge = { NEW: 'bg-red-100 text-red-700', INVESTIGATING: 'bg-yellow-100 text-yellow-700', RESOLVED: 'bg-green-100 text-green-700' };

export default function Incidents() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['incidents'], queryFn: () => fetchJson('/incidents'), refetchInterval: 5000 });
  const [filter, setFilter] = useState('All');
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [resolveNotes, setResolveNotes] = useState('');
  const [workNote, setWorkNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  const allIncidents = data?.incidents || [];
  const stats = data?.stats || {};
  const filtered = filter === 'All' ? allIncidents : allIncidents.filter(i => i.status === filter);

  const selectIncident = async (id) => {
    setSelectedId(id);
    setActionError('');
    setResolveNotes('');
    setWorkNote('');
    const d = await fetchJson(`/incidents/${id}`);
    setDetail(d);
  };

  const refreshDetail = async () => {
    if (selectedId) {
      const d = await fetchJson(`/incidents/${selectedId}`);
      setDetail(d);
    }
    queryClient.invalidateQueries({ queryKey: ['incidents'] });
  };

  const handleAcknowledge = async () => {
    setActionLoading(true); setActionError('');
    try {
      const res = await fetch(`/incidents/${selectedId}/acknowledge`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assignee: 'student' }) });
      const d = await res.json();
      if (d.error) { setActionError(d.error); } else { await refreshDetail(); }
    } catch (e) { setActionError('Failed'); }
    setActionLoading(false);
  };

  const handleResolve = async () => {
    if (resolveNotes.trim().length < 5) { setActionError('Resolution notes must be at least 5 characters'); return; }
    setActionLoading(true); setActionError('');
    try {
      const res = await fetch(`/incidents/${selectedId}/resolve`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resolutionNotes: resolveNotes }) });
      const d = await res.json();
      if (d.error) { setActionError(d.error); } else { await refreshDetail(); }
    } catch (e) { setActionError('Failed'); }
    setActionLoading(false);
  };

  const handleAddNote = async () => {
    if (workNote.trim().length < 2) return;
    try {
      await fetch(`/incidents/${selectedId}/worknote`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ note: workNote }) });
      setWorkNote('');
      await refreshDetail();
    } catch (e) {}
  };

  const tabs = ['All', 'NEW', 'INVESTIGATING', 'RESOLVED'];

  return (
    <div className="h-full flex flex-col bg-gray-100">
      {/* Header bar */}
      <div className="bg-gray-800 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-white font-semibold text-lg">Incident Management</h1>
          <p className="text-gray-400 text-xs">MiniBank IT Service Management</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded text-xs font-semibold ${stats.open > 0 ? 'bg-red-600 text-white' : 'bg-gray-600 text-gray-300'}`}>{stats.open || 0} Open</span>
          <span className={`px-2.5 py-1 rounded text-xs font-semibold ${stats.investigating > 0 ? 'bg-yellow-500 text-white' : 'bg-gray-600 text-gray-300'}`}>{stats.investigating || 0} Investigating</span>
          <span className={`px-2.5 py-1 rounded text-xs font-semibold ${stats.p1_open > 0 ? 'bg-red-700 text-white animate-pulse' : 'bg-gray-600 text-gray-300'}`}>{stats.p1_open || 0} P1 Active</span>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="bg-white border-b border-gray-200 px-6 flex gap-6 flex-shrink-0">
        {tabs.map(tab => (
          <button key={tab} onClick={() => setFilter(tab)}
            className={`py-3 text-xs font-semibold border-b-2 transition ${filter === tab ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {tab === 'All' ? 'All' : tab.charAt(0) + tab.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Main content — two panel layout */}
      <div className="flex-1 overflow-hidden lg:grid lg:grid-cols-5">
        {/* Left panel — queue */}
        <div className="lg:col-span-3 overflow-y-auto border-r border-gray-200 bg-white">
          {isLoading ? (
            <p className="p-8 text-center text-gray-400 text-sm">Loading...</p>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-400 text-sm">No incidents</p>
              <p className="text-xs text-gray-300 mt-1">Start the chaos engine to generate incidents</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="px-3 py-2.5 w-8"></th>
                  <th className="px-3 py-2.5">Number</th>
                  <th className="px-3 py-2.5">Description</th>
                  <th className="px-3 py-2.5 hidden xl:table-cell">Category</th>
                  <th className="px-3 py-2.5 hidden xl:table-cell">Service</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Opened</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(inc => (
                  <tr key={inc.id} onClick={() => selectIncident(inc.id)}
                    className={`cursor-pointer hover:bg-blue-50/50 transition border-l-4 ${selectedId === inc.id ? `${priorityBorder[inc.severity]} bg-blue-50/30` : 'border-l-transparent'}`}>
                    <td className="px-3 py-3"><div className={`w-3 h-3 rounded-sm ${priorityBadge[inc.severity]}`}></div></td>
                    <td className="px-3 py-3 text-xs font-mono text-gray-600">{inc.number}</td>
                    <td className="px-3 py-3">
                      <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{inc.title}</p>
                      <p className="text-xs text-gray-400 truncate max-w-[200px]">{inc.description}</p>
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-500 hidden xl:table-cell">{inc.category}</td>
                    <td className="px-3 py-3 text-xs text-gray-500 font-mono hidden xl:table-cell">{inc.affectedService}</td>
                    <td className="px-3 py-3"><span className={`text-xs font-semibold px-2 py-0.5 rounded ${statusBadge[inc.status]}`}>{inc.status}</span></td>
                    <td className="px-3 py-3 text-xs text-gray-400">{relativeTime(inc.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Right panel — detail */}
        <div className="lg:col-span-2 overflow-y-auto bg-gray-50">
          {!detail ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-gray-400">Select an incident to view details</p>
            </div>
          ) : (
            <div>
              {/* Priority banner */}
              <div className={`${priorityBanner[detail.severity]} px-6 py-4 text-white`}>
                <p className="text-xs opacity-80 font-mono">{detail.number}</p>
                <h2 className="text-lg font-bold mt-1">{detail.title}</h2>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded">{detail.priority}</span>
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded">{detail.status}</span>
                </div>
              </div>

              {/* Form fields */}
              <div className="px-6 py-4 bg-white border-b border-gray-200">
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">Caller</p><p className="text-sm text-gray-900 font-medium">{detail.caller}</p></div>
                  <div><p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">Category</p><p className="text-sm text-gray-900 font-medium">{detail.category}</p></div>
                  <div><p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">Affected Service</p><p className="text-sm text-gray-900 font-medium font-mono">{detail.affectedService}</p></div>
                  <div><p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">Priority</p><p className="text-sm text-gray-900 font-medium">{detail.priority}</p></div>
                  <div><p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">Opened</p><p className="text-sm text-gray-900 font-medium">{new Date(detail.createdAt).toLocaleString('en-GB')}</p></div>
                  <div><p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">Assigned to</p><p className="text-sm text-gray-900 font-medium">{detail.assignee || 'Unassigned'}</p></div>
                  {detail.acknowledgedAt && <div><p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">Acknowledged</p><p className="text-sm text-gray-900 font-medium">{new Date(detail.acknowledgedAt).toLocaleString('en-GB')}</p></div>}
                  {detail.resolvedAt && <div><p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">Resolved</p><p className="text-sm text-gray-900 font-medium">{new Date(detail.resolvedAt).toLocaleString('en-GB')}</p></div>}
                </div>
              </div>

              {/* Description */}
              <div className="px-6 py-4 bg-white border-b border-gray-200">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Description</p>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 border border-gray-100">{detail.description}</p>
              </div>

              {/* Clue (only during investigation) */}
              {detail.status === 'INVESTIGATING' && detail.clue && (
                <div className="px-6 py-4 bg-amber-50 border-b border-amber-200">
                  <p className="text-xs font-semibold text-amber-800 mb-1">🔍 Investigation Hint</p>
                  <p className="text-sm text-amber-700">{detail.clue}</p>
                </div>
              )}

              {/* Work Notes */}
              {detail.status !== 'RESOLVED' && (
                <div className="px-6 py-4 bg-white border-b border-gray-200">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Work Notes</p>
                  {detail.workNotes && detail.workNotes.length > 0 && (
                    <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                      {[...detail.workNotes].reverse().map((wn, i) => (
                        <div key={i} className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">{wn.author}</span>
                            <span className="text-xs text-gray-400">{relativeTime(wn.timestamp)}</span>
                          </div>
                          <p className="text-sm text-gray-700">{wn.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input type="text" value={workNote} onChange={e => setWorkNote(e.target.value)} placeholder="Add a work note..."
                      className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                    <button onClick={handleAddNote} className="px-3 py-2 text-xs font-semibold bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition">Add Note</button>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="px-6 py-4 bg-white">
                {actionError && <p className="text-xs text-red-500 mb-3">{actionError}</p>}

                {detail.status === 'NEW' && (
                  <button onClick={handleAcknowledge} disabled={actionLoading}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50">
                    {actionLoading ? 'Assigning...' : 'Assign to Me & Investigate'}
                  </button>
                )}

                {detail.status === 'INVESTIGATING' && (
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Resolution Notes</p>
                      <textarea value={resolveNotes} onChange={e => setResolveNotes(e.target.value)} rows={3} placeholder="Describe the root cause you identified..."
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none resize-none" />
                    </div>
                    <button onClick={handleResolve} disabled={actionLoading}
                      className="w-full bg-green-600 text-white py-3 rounded-lg text-sm font-semibold hover:bg-green-700 transition disabled:opacity-50">
                      {actionLoading ? 'Resolving...' : 'Mark Resolved ✓'}
                    </button>
                  </div>
                )}

                {detail.status === 'RESOLVED' && (
                  <div className="space-y-3">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-xs font-semibold text-green-800 mb-1">✓ Resolution</p>
                      <p className="text-sm text-green-700">{detail.resolutionNotes}</p>
                    </div>
                    {detail.rootCause && (
                      <div className="bg-gray-900 rounded-lg p-3">
                        <p className="text-xs font-semibold text-gray-300 mb-1">🔑 Root Cause Revealed</p>
                        <p className="text-sm text-white">{detail.rootCause}</p>
                      </div>
                    )}
                    {detail.workNotes && detail.workNotes.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Work Notes History</p>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {[...detail.workNotes].reverse().map((wn, i) => (
                            <div key={i} className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">{wn.author}</span>
                                <span className="text-xs text-gray-400">{relativeTime(wn.timestamp)}</span>
                              </div>
                              <p className="text-xs text-gray-600">{wn.text}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-gray-400">Time to resolve: {formatTTR(detail.timeToResolveMs)}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
