// Incident Management System — mirrors ServiceNow-style workflow
// Lifecycle: NEW → INVESTIGATING → RESOLVED
// Auto-created by the chaos engine when incidents fire

const { v4: uuidv4 } = require('uuid');

const PRIORITY_MAP = { P1: '1 - Critical', P2: '2 - High', P3: '3 - Medium' };

class IncidentManager {
  constructor() {
    this.incidents = [];
    this.counter = 0;
  }

  create({ title, description, severity, scenarioId, clue, category, affectedService }) {
    this.counter++;
    const incident = {
      id: uuidv4(),
      number: `INC${String(this.counter).padStart(5, '0')}`,
      title,
      description,
      severity, // P1, P2, P3
      priority: PRIORITY_MAP[severity] || '3 - Medium',
      category: category || 'Availability',
      affectedService: affectedService || 'unknown',
      caller: 'Chaos Engine (Automated)',
      status: 'NEW',
      scenarioId: scenarioId || null,
      clue: clue || null,
      rootCause: null,
      assignee: null,
      resolutionNotes: null,
      workNotes: [],
      createdAt: new Date().toISOString(),
      acknowledgedAt: null,
      resolvedAt: null,
      timeToResolveMs: null
    };
    this.incidents.push(incident);

    if (this.incidents.length > 100) this.incidents.shift();
    return incident;
  }

  acknowledge(incidentId, assignee) {
    const incident = this.incidents.find(i => i.id === incidentId);
    if (!incident) return null;
    if (incident.status !== 'NEW') return { error: `Cannot acknowledge — status is ${incident.status}` };

    incident.status = 'INVESTIGATING';
    incident.assignee = assignee || 'student';
    incident.acknowledgedAt = new Date().toISOString();
    return incident;
  }

  resolve(incidentId, resolutionNotes) {
    const incident = this.incidents.find(i => i.id === incidentId);
    if (!incident) return null;
    if (incident.status === 'RESOLVED') return { error: 'Incident is already resolved' };

    incident.status = 'RESOLVED';
    incident.resolutionNotes = resolutionNotes || '';
    incident.resolvedAt = new Date().toISOString();
    incident.timeToResolveMs = new Date(incident.resolvedAt) - new Date(incident.createdAt);
    return incident;
  }

  addWorkNote(incidentId, note) {
    const incident = this.incidents.find(i => i.id === incidentId);
    if (!incident) return null;
    incident.workNotes.push({ text: note, timestamp: new Date().toISOString(), author: 'student' });
    return incident;
  }

  getAll({ status, limit = 50 } = {}) {
    let results = [...this.incidents].reverse();
    if (status) results = results.filter(i => i.status === status);
    return results.slice(0, limit);
  }

  getById(id) {
    return this.incidents.find(i => i.id === id) || null;
  }

  getByNumber(number) {
    return this.incidents.find(i => i.number === number) || null;
  }

  getOpen() {
    return this.incidents.filter(i => i.status !== 'RESOLVED').reverse();
  }

  getStats() {
    const total = this.incidents.length;
    const open = this.incidents.filter(i => i.status === 'NEW').length;
    const investigating = this.incidents.filter(i => i.status === 'INVESTIGATING').length;
    const resolved = this.incidents.filter(i => i.status === 'RESOLVED').length;
    const p1_open = this.incidents.filter(i => i.severity === 'P1' && i.status !== 'RESOLVED').length;
    const sla_breached = this.incidents.filter(i => i.timeToResolveMs && i.timeToResolveMs > 300000).length;
    const resolvedIncidents = this.incidents.filter(i => i.timeToResolveMs);
    const avgResolveTime = resolvedIncidents.length > 0
      ? Math.round(resolvedIncidents.reduce((sum, i) => sum + i.timeToResolveMs, 0) / resolvedIncidents.length / 1000)
      : null;

    return { total, open, investigating, resolved, p1_open, sla_breached, avg_resolve_time_seconds: avgResolveTime };
  }
}

const incidentManager = new IncidentManager();
module.exports = { incidentManager };
