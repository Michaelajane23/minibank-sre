const { Router } = require('express');
const { incidentManager } = require('../observability/incidents');

const router = Router();

// GET /incidents — list all incidents
router.get('/incidents', (req, res) => {
  const status = req.query.status || null;
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  const incidents = incidentManager.getAll({ status, limit });

  // Don't expose rootCause in the list view — student needs to investigate
  const safe = incidents.map(inc => ({
    id: inc.id,
    number: inc.number,
    title: inc.title,
    description: inc.description,
    severity: inc.severity,
    status: inc.status,
    assignee: inc.assignee,
    createdAt: inc.createdAt,
    acknowledgedAt: inc.acknowledgedAt,
    resolvedAt: inc.resolvedAt,
    timeToResolveMs: inc.timeToResolveMs
  }));

  res.json({ incidents: safe, stats: incidentManager.getStats() });
});

// GET /incidents/open — only open/investigating incidents
router.get('/incidents/open', (req, res) => {
  const open = incidentManager.getOpen();
  const safe = open.map(inc => ({
    id: inc.id,
    number: inc.number,
    title: inc.title,
    description: inc.description,
    severity: inc.severity,
    status: inc.status,
    assignee: inc.assignee,
    createdAt: inc.createdAt,
    acknowledgedAt: inc.acknowledgedAt
  }));
  res.json({ incidents: safe, count: safe.length });
});

// GET /incidents/:id — single incident detail
router.get('/incidents/:id', (req, res) => {
  const incident = incidentManager.getById(req.params.id) || incidentManager.getByNumber(req.params.id);
  if (!incident) return res.status(404).json({ error: 'Incident not found' });

  // Only show rootCause if resolved (reward for completing investigation)
  const response = {
    id: incident.id,
    number: incident.number,
    title: incident.title,
    description: incident.description,
    severity: incident.severity,
    status: incident.status,
    clue: incident.clue,
    assignee: incident.assignee,
    resolutionNotes: incident.resolutionNotes,
    createdAt: incident.createdAt,
    acknowledgedAt: incident.acknowledgedAt,
    resolvedAt: incident.resolvedAt,
    timeToResolveMs: incident.timeToResolveMs
  };

  if (incident.status === 'RESOLVED') {
    response.rootCause = incident.rootCause;
  }

  res.json(response);
});

// PATCH /incidents/:id/acknowledge — pick up the incident
router.patch('/incidents/:id/acknowledge', (req, res) => {
  const { assignee } = req.body || {};
  const result = incidentManager.acknowledge(req.params.id, assignee);
  if (!result) return res.status(404).json({ error: 'Incident not found' });
  if (result.error) return res.status(422).json(result);
  res.json(result);
});

// PATCH /incidents/:id/resolve — close the incident with findings
router.patch('/incidents/:id/resolve', (req, res) => {
  const { resolutionNotes } = req.body || {};
  if (!resolutionNotes || resolutionNotes.trim().length < 5) {
    return res.status(400).json({ error: 'Resolution notes are required (describe what you found)' });
  }
  const result = incidentManager.resolve(req.params.id, resolutionNotes);
  if (!result) return res.status(404).json({ error: 'Incident not found' });
  if (result.error) return res.status(422).json(result);

  // After resolving, reveal the actual root cause so they can compare
  result.rootCause = incidentManager.getById(req.params.id)?.rootCause || null;
  res.json(result);
});

// GET /incidents/stats — summary metrics
router.get('/incidents/stats', (req, res) => {
  res.json(incidentManager.getStats());
});

module.exports = router;
