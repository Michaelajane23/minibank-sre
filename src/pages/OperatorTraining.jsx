import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

async function fetchJson(url) {
  const res = await fetch(url);
  return res.json();
}

export default function OperatorTraining() {
  const queryClient = useQueryClient();
  const { data: health } = useQuery({ queryKey: ['health-detailed'], queryFn: () => fetchJson('/health/detailed'), refetchInterval: 5000 });
  const { data: slo } = useQuery({ queryKey: ['slo-status'], queryFn: () => fetchJson('/slo'), refetchInterval: 5000 });
  const { data: chaos } = useQuery({ queryKey: ['chaos-status'], queryFn: () => fetchJson('/chaos'), refetchInterval: 5000 });
  const [chaosLoading, setChaosLoading] = useState(null);
  const [chaosError, setChaosError] = useState(null);

  const services = health?.services || {};
  const slis = slo?.slis || {};

  const handleChaosAction = async (action) => {
    setChaosError(null);
    setChaosLoading(action);
    try {
      await fetch(`/chaos/${action}`, { method: 'POST' });
      queryClient.invalidateQueries({ queryKey: ['chaos-status'] });
    } catch (e) {
      setChaosError('Failed to ' + action + ' chaos engine. Is the server running?');
    }
    setChaosLoading(null);
  };

  return (
    <div className="p-8 lg:p-12 max-w-[1200px]">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
          <h1 className="text-2xl font-bold text-gray-900">Operator Training Console</h1>
        </div>
        <p className="text-sm text-gray-500">Internal engineering dashboard — service health, metrics, and incident simulation</p>
      </div>

      {/* Service Health Grid */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">Service Health</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {Object.entries(services).map(([name, info]) => (
            <div key={name} className={`rounded-xl p-4 border ${info.healthy ? 'bg-white border-gray-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-gray-600">{name}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  info.state === 'healthy' ? 'bg-green-100 text-green-700' :
                  info.state === 'degraded' || info.state === 'custom' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>{info.state}</span>
              </div>
              {!info.healthy && (
                <div className="text-xs text-gray-500 space-y-0.5">
                  {info.latency_injection_ms > 0 && <p>Latency: +{info.latency_injection_ms}ms</p>}
                  {info.error_rate_injection > 0 && <p>Error rate: {(info.error_rate_injection * 100).toFixed(0)}%</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* SLO Status */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">SLO Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {Object.entries(slis).map(([name, data]) => (
            <div key={name} className={`rounded-xl p-4 border ${data?.met ? 'bg-white border-gray-200' : 'bg-red-50 border-red-200'}`}>
              <p className="text-xs text-gray-500 mb-1">{name.replace(/_/g, ' ')}</p>
              <p className="text-lg font-bold text-gray-900">{data?.current}{data?.unit}</p>
              <p className="text-xs text-gray-400">Target: {data?.target}{data?.unit}</p>
            </div>
          ))}
        </div>
        {slo?.error_budget && (
          <div className="mt-3 bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">Error budget consumed</span>
              <span className={`text-xs font-semibold ${slo.error_budget.burn_percent > 80 ? 'text-red-600' : 'text-gray-900'}`}>
                {slo.error_budget.burn_percent}%
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${slo.error_budget.burn_percent > 80 ? 'bg-red-500' : slo.error_budget.burn_percent > 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${Math.min(slo.error_budget.burn_percent, 100)}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Chaos Engine Status */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">Chaos Engine</h2>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">
                Status: {chaos?.running ? '🔴 Active — random incidents enabled' : '⚪ Stopped'}
              </p>
              {chaos?.current_incident && (
                <p className="text-xs text-red-600 mt-1">
                  Active incident: {chaos.current_incident.name} ({chaos.current_incident.severity})
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleChaosAction('start')}
                disabled={chaosLoading !== null}
                className="px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {chaosLoading === 'start' ? 'Starting...' : 'Start'}
              </button>
              <button
                onClick={() => handleChaosAction('stop')}
                disabled={chaosLoading !== null}
                className="px-3 py-1.5 text-xs font-semibold bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {chaosLoading === 'stop' ? 'Stopping...' : 'Stop'}
              </button>
            </div>
          </div>
        </div>
        {chaosError && <p className="text-xs text-red-500 mt-2">{chaosError}</p>}
      </div>

      {/* Quick Reference */}
      <div className="bg-gray-900 rounded-xl p-6 text-white">
        <h3 className="text-sm font-semibold mb-3">Quick Reference — Useful Commands</h3>
        <p className="text-xs text-gray-400 mb-3">Replace the URL below with your deployed address if not running locally.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-gray-400 mb-1"># Check all services</p>
            <p>curl {window.location.origin}/health/detailed</p>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-gray-400 mb-1"># View Prometheus metrics</p>
            <p>curl {window.location.origin}/metrics</p>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-gray-400 mb-1"># Check SLO status</p>
            <p>curl {window.location.origin}/slo</p>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-gray-400 mb-1"># Trigger a scenario</p>
            <p>curl -X POST {window.location.origin}/scenarios/auth-failing/trigger</p>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-gray-400 mb-1"># Reset everything</p>
            <p>curl -X POST {window.location.origin}/scenarios/reset</p>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-gray-400 mb-1"># Splunk: find errors</p>
            <p>severity=ERROR | stats count by service_name</p>
          </div>
        </div>
      </div>
    </div>
  );
}
