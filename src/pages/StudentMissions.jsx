import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

async function fetchJson(url) {
  const res = await fetch(url);
  return res.json();
}

const difficultyColors = {
  beginner: 'bg-green-100 text-green-700',
  intermediate: 'bg-yellow-100 text-yellow-700',
  advanced: 'bg-red-100 text-red-700'
};

export default function StudentMissions() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ['missions'], queryFn: () => fetchJson('/missions') });
  const { data: progressData } = useQuery({
    queryKey: ['mission-progress'],
    queryFn: async () => {
      if (!token) return { completed: [] };
      const res = await fetch('/api/missions/progress', { headers: { Authorization: `Bearer ${token}` } });
      return res.json();
    },
    enabled: !!token
  });
  const [selected, setSelected] = useState(null);
  const [missionDetail, setMissionDetail] = useState(null);
  const [triggering, setTriggering] = useState(false);
  const [completing, setCompleting] = useState(false);

  const missions = data?.missions || [];
  const completedIds = new Set((progressData?.completed || []).map(c => c.mission_id));

  const loadMission = async (id) => {
    setSelected(id);
    const detail = await fetchJson(`/missions/${id}`);
    setMissionDetail(detail);
  };

  const triggerScenario = async (scenarioId) => {
    setTriggering(true);
    try {
      await fetch(`/scenarios/${scenarioId}/trigger`, { method: 'POST' });
    } catch(e) {}
    setTriggering(false);
  };

  const markComplete = async (missionId) => {
    if (!token) return;
    setCompleting(true);
    try {
      await fetch(`/api/missions/${missionId}/complete`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
      queryClient.invalidateQueries({ queryKey: ['mission-progress'] });
    } catch(e) {}
    setCompleting(false);
  };

  return (
    <div className="p-8 lg:p-12 max-w-[900px]">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">🎯 Training Missions</h1>
        <p className="text-sm text-gray-500 mt-1">Complete these missions to learn how production engineers investigate and resolve incidents</p>
        {completedIds.size > 0 && (
          <p className="text-xs text-brand-600 font-medium mt-2">{completedIds.size} of {missions.length} missions completed</p>
        )}
      </div>

      {!missionDetail ? (
        <div className="space-y-3">
          {missions.map(m => (
            <button key={m.id} onClick={() => loadMission(m.id)}
              className={`w-full text-left bg-white rounded-xl p-5 border shadow-sm hover:border-brand-300 hover:shadow-md transition ${completedIds.has(m.id) ? 'border-green-200' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {completedIds.has(m.id) && <span className="text-green-600 text-sm">✓</span>}
                  <h3 className="text-sm font-semibold text-gray-900">Mission {m.id}: {m.title}</h3>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${difficultyColors[m.difficulty]}`}>{m.difficulty}</span>
              </div>
              <p className="text-xs text-gray-500">{m.description}</p>
            </button>
          ))}
        </div>
      ) : (
        <div>
          <button onClick={() => { setSelected(null); setMissionDetail(null); }}
            className="text-sm text-brand-600 font-medium mb-4 hover:underline">← Back to missions</button>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Mission {missionDetail.id}: {missionDetail.title}</h2>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${difficultyColors[missionDetail.difficulty]}`}>{missionDetail.difficulty}</span>
              </div>
              <p className="text-sm text-gray-600 mt-2">{missionDetail.description}</p>
            </div>

            {missionDetail.scenario && (
              <div className="px-6 py-4 border-b border-gray-100 bg-blue-50/50">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-blue-700 font-medium">💡 This mission has a scenario you can trigger to simulate the incident</p>
                  <button onClick={() => triggerScenario(missionDetail.scenario)} disabled={triggering}
                    className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
                    {triggering ? 'Triggering...' : 'Start scenario'}
                  </button>
                </div>
              </div>
            )}

            <div className="px-6 py-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Objectives</h3>
              <ol className="space-y-2">
                {missionDetail.objectives.map((obj, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center text-xs font-semibold text-gray-500">{i + 1}</span>
                    <span className="text-sm text-gray-700">{obj}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="px-6 py-5 border-t border-gray-100 bg-amber-50/30">
              <details className="group">
                <summary className="text-sm font-semibold text-amber-800 cursor-pointer">🔍 Hints (try without these first!)</summary>
                <ul className="mt-3 space-y-2">
                  {missionDetail.hints.map((hint, i) => (
                    <li key={i} className="text-xs text-amber-700 bg-amber-100/50 rounded-lg px-3 py-2 font-mono">{hint}</li>
                  ))}
                </ul>
              </details>
            </div>

            <div className="px-6 py-5 border-t border-gray-100 bg-green-50/30">
              <details className="group">
                <summary className="text-sm font-semibold text-green-800 cursor-pointer">✅ Success criteria (check your answer)</summary>
                <p className="mt-3 text-sm text-green-700">{missionDetail.successCriteria}</p>
              </details>
            </div>

            {/* Mark as complete */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              {completedIds.has(missionDetail.id) ? (
                <p className="text-sm text-green-600 font-medium">✓ Mission completed</p>
              ) : (
                <button onClick={() => markComplete(missionDetail.id)} disabled={completing || !token}
                  className="px-4 py-2 text-sm font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50">
                  {completing ? 'Saving...' : 'Mark as complete'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
