const { Router } = require('express');
const { incidentManager } = require('../observability/incidents');

const router = Router();

// GET /incidents — list all incidents
router.get('/incidents', (req, res) => {
  const status = req.query.status || null;
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  const incidents = incidentManager.getAll({ status, limit });

  const mapped = incidents.map(inc => ({
    id: inc.id,
    number: inc.number,
    title: inc.title,
    description: inc.description,
    severity: inc.severity,
    priority: inc.priority,
    category: inc.category,
    affectedService: inc.affectedService,
    caller: inc.caller,
    status: inc.status,
    assignee: inc.assignee,
    workNotes: inc.workNotes,
    createdAt: inc.createdAt,
    acknowledgedAt: inc.acknowledgedAt,
    resolvedAt: inc.resolvedAt,
    timeToResolveMs: inc.timeToResolveMs
  }));

  res.json({ incidents: mapped, stats: incidentManager.getStats() });
});

// GET /incidents/open
router.get('/incidents/open', (req, res) => {
  const open = incidentManager.getOpen();
  res.json({ incidents: open, count: open.length });
});

// GET /incidents/stats
router.get('/incidents/stats', (req, res) => {
  res.json(incidentManager.getStats());
});

// GET /incidents/:id — single incident detail
router.get('/incidents/:id', (req, res) => {
  const incident = incidentManager.getById(req.params.id) || incidentManager.getByNumber(req.params.id);
  if (!incident) return res.status(404).json({ error: 'Incident not found' });

  const response = {
    id: incident.id,
    number: incident.number,
    title: incident.title,
    description: incident.description,
    severity: incident.severity,
    priority: incident.priority,
    category: incident.category,
    affectedService: incident.affectedService,
    caller: incident.caller,
    status: incident.status,
    clue: incident.clue,
    assignee: incident.assignee,
    resolutionNotes: incident.resolutionNotes,
    workNotes: incident.workNotes,
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

// PATCH /incidents/:id/acknowledge
router.patch('/incidents/:id/acknowledge', (req, res) => {
  const { assignee } = req.body || {};
  const result = incidentManager.acknowledge(req.params.id, assignee);
  if (!result) return res.status(404).json({ error: 'Incident not found' });
  if (result.error) return res.status(422).json(result);
  res.json(result);
});

// PATCH /incidents/:id/resolve
router.patch('/incidents/:id/resolve', (req, res) => {
  const { resolutionNotes } = req.body || {};
  if (!resolutionNotes || resolutionNotes.trim().length < 5) {
    return res.status(400).json({ error: 'Resolution notes are required (describe what you found)' });
  }
  const result = incidentManager.resolve(req.params.id, resolutionNotes);
  if (!result) return res.status(404).json({ error: 'Incident not found' });
  if (result.error) return res.status(422).json(result);
  result.rootCause = incidentManager.getById(req.params.id)?.rootCause || null;
  res.json(result);
});

// POST /incidents/:id/worknote
router.post('/incidents/:id/worknote', (req, res) => {
  const { note } = req.body || {};
  if (!note || note.trim().length < 2) {
    return res.status(400).json({ error: 'Note cannot be empty' });
  }
  const result = incidentManager.addWorkNote(req.params.id, note);
  if (!result) return res.status(404).json({ error: 'Not found' });
  res.json(result);
});

module.exports = router;
