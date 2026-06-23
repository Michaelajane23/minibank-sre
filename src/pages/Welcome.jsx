import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function Welcome() {
  const [chaosLoading, setChaosLoading] = useState(null);
  const [chaosError, setChaosError] = useState(null);

  const handleChaos = async (action) => {
    setChaosError(null);
    setChaosLoading(action);
    try {
      await fetch(`/chaos/${action}`, { method: 'POST' });
    } catch (e) {
      setChaosError('Failed to ' + action + ' chaos engine. Is the server running?');
    }
    setChaosLoading(null);
  };

  return (
    <div className="p-8 lg:p-12 max-w-[1000px]">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">SRE Training</h1>
        <p className="text-sm text-gray-500 mt-1">Your work experience missions and operator tools</p>
      </div>

      {/* Two main cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {/* Training Missions card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-brand-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Training Missions</h2>
              <span className="text-xs font-medium text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">7 missions available</span>
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-6 flex-1">
            Work through structured scenarios that simulate real production incidents. Each mission teaches a different SRE skill.
          </p>
          <Link to="/student-missions" className="inline-flex items-center justify-center gap-2 bg-brand-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-brand-700 transition">
            Start Missions →
          </Link>
        </div>

        {/* Operator Console card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-red-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 001.5 2.122m-7.5 0A2.25 2.25 0 005 14.5m0 0l-1.5 1.5M5 14.5v3m14.25-3.104v-5.71m0 0c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 00-4.5 0m4.5 0V14.5M19.25 14.5l1.5 1.5M19.25 14.5v3" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Operator Console</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4 flex-1">
            Trigger chaos scenarios, view live service health, and control the failure injection engine. Use alongside Grafana and Splunk.
          </p>
          <div className="flex gap-2 mb-4">
            <button onClick={() => handleChaos('start')} disabled={chaosLoading !== null}
              className="flex-1 py-2 text-xs font-semibold bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition disabled:opacity-50">
              {chaosLoading === 'start' ? 'Starting...' : '▶ Start chaos'}
            </button>
            <button onClick={() => handleChaos('stop')} disabled={chaosLoading !== null}
              className="flex-1 py-2 text-xs font-semibold bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition disabled:opacity-50">
              {chaosLoading === 'stop' ? 'Stopping...' : '■ Stop chaos'}
            </button>
          </div>
          <Link to="/operator-training" className="inline-flex items-center justify-center gap-2 border border-gray-200 text-gray-700 py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-50 transition">
            Open Console →
          </Link>
          {chaosError && <p className="text-xs text-red-500 mt-2">{chaosError}</p>}
        </div>
      </div>

      {/* Three tools explainer */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">How it works — your three tools</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-4">
            <div className="w-8 h-8 bg-brand-100 rounded-lg flex items-center justify-center text-brand-700 font-bold text-sm flex-shrink-0">1</div>
            <div>
              <p className="text-sm font-medium text-gray-900">MiniBank App</p>
              <p className="text-xs text-gray-500">The banking platform. Make transfers, trigger incidents, use it like a customer.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-4">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">2</div>
            <div>
              <p className="text-sm font-medium text-gray-900">Splunk (logs)</p>
              <p className="text-xs text-gray-500">Every action produces structured logs. Search and investigate errors here.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-4">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center text-green-700 font-bold text-sm flex-shrink-0">3</div>
            <div>
              <p className="text-sm font-medium text-gray-900">Grafana (metrics)</p>
              <p className="text-xs text-gray-500">Dashboards showing request rates, error rates, and latency in real time.</p>
            </div>
          </div>
        </div>

        {/* Flow diagram */}
        <div className="bg-gray-900 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-gray-300 font-mono">
            <div className="text-center">
              <div className="bg-brand-600 rounded-lg px-3 py-2 text-white mb-1">MiniBank App</div>
              <p className="text-gray-500">generates logs</p>
            </div>
            <span className="text-gray-500">→</span>
            <div className="text-center">
              <div className="bg-blue-600 rounded-lg px-3 py-2 text-white mb-1">Splunk</div>
              <p className="text-gray-500">ingests & indexes</p>
            </div>
            <span className="text-gray-500">→</span>
            <div className="text-center">
              <div className="bg-green-600 rounded-lg px-3 py-2 text-white mb-1">You investigate</div>
              <p className="text-gray-500">find root cause</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
