const { Router } = require('express');
const { chaosEngine } = require('../observability/chaos-engine');

const router = Router();

// GET /chaos — current status
router.get('/chaos', (req, res) => {
  res.json(chaosEngine.getStatus());
});

// POST /chaos/start — turn on random incidents
router.post('/chaos/start', (req, res) => {
  const result = chaosEngine.start();
  res.json(result);
});

// POST /chaos/stop — turn off random incidents
router.post('/chaos/stop', (req, res) => {
  const result = chaosEngine.stop();
  res.json(result);
});

// GET /chaos/history — see past incidents (with clues only, not answers)
router.get('/chaos/history', (req, res) => {
  const history = chaosEngine.getHistory();
  // Only show clues, not root causes — they need to investigate!
  const safe = history.map(inc => ({
    id: inc.id,
    severity: inc.severity,
    clue: inc.clue,
    status: inc.status,
    started_at: inc.startedAt,
    ended_at: inc.endedAt,
    duration_seconds: inc.duration_seconds
  }));
  res.json({ incidents: safe });
});

// GET /chaos/reveal/:id — reveal the root cause (only after investigating!)
router.get('/chaos/reveal/:id', (req, res) => {
  const answer = chaosEngine.getIncidentAnswer(req.params.id);
  if (!answer) return res.status(404).json({ error: 'Incident not found' });
  res.json(answer);
});

module.exports = router;
