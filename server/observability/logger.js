// Structured JSON logger — single-line JSON to stdout + optional Splunk HEC forwarding
const https = require('https');
const http = require('http');

const buffer = [];
const MAX_BUFFER = 10000;

// Splunk HEC configuration (set via environment variables)
const SPLUNK_HEC_URL = process.env.SPLUNK_HEC_URL || null;    // e.g. https://inputs.splunkcloud.com:8088/services/collector/event
const SPLUNK_HEC_TOKEN = process.env.SPLUNK_HEC_TOKEN || null;
const SPLUNK_INDEX = process.env.SPLUNK_INDEX || 'main';
const SPLUNK_SOURCE = process.env.SPLUNK_SOURCE || 'minibank';
const SPLUNK_SOURCETYPE = process.env.SPLUNK_SOURCETYPE || '_json';

// Batch Splunk sends (every 2 seconds or 50 events, whichever comes first)
const splunkBatch = [];
const SPLUNK_BATCH_SIZE = 50;
const SPLUNK_BATCH_INTERVAL = 2000;
let splunkTimer = null;

function startSplunkBatching() {
  if (!SPLUNK_HEC_URL || !SPLUNK_HEC_TOKEN) return;
  splunkTimer = setInterval(flushSplunk, SPLUNK_BATCH_INTERVAL);
  // Log that Splunk forwarding is active (to stdout only, not to Splunk itself)
  process.stdout.write(JSON.stringify({
    timestamp: new Date().toISOString(),
    service_name: 'logger',
    severity: 'INFO',
    message: `Splunk HEC forwarding enabled → ${SPLUNK_HEC_URL}`
  }) + '\n');
}

function sendToSplunk(entry) {
  if (!SPLUNK_HEC_URL || !SPLUNK_HEC_TOKEN) return;
  splunkBatch.push(entry);
  if (splunkBatch.length >= SPLUNK_BATCH_SIZE) {
    flushSplunk();
  }
}

function flushSplunk() {
  if (splunkBatch.length === 0) return;

  const events = splunkBatch.splice(0, splunkBatch.length);
  const payload = events.map(entry => JSON.stringify({
    event: entry,
    time: new Date(entry.timestamp).getTime() / 1000,
    source: SPLUNK_SOURCE,
    sourcetype: SPLUNK_SOURCETYPE,
    index: SPLUNK_INDEX
  })).join('');

  const url = new URL(SPLUNK_HEC_URL);
  const transport = url.protocol === 'https:' ? https : http;

  const options = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 8088),
    path: url.pathname,
    method: 'POST',
    headers: {
      'Authorization': `Splunk ${SPLUNK_HEC_TOKEN}`,
      'Content-Type': 'application/json'
    },
    rejectUnauthorized: false // Splunk Cloud certs can be tricky
  };

  const req = transport.request(options, (res) => {
    // Handle redirects
    if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 303) {
      const redirectUrl = new URL(res.headers.location);
      // retry with redirected URL — log it once
      process.stderr.write(`[splunk-hec] Redirected to: ${redirectUrl.href}\n`);
      res.resume();
      return;
    }
    // Consume response to free up socket
    res.resume();
    if (res.statusCode !== 200) {
      process.stderr.write(`[splunk-hec] Non-200 response: ${res.statusCode}\n`);
    }
  });

  req.on('error', (err) => {
    process.stderr.write(`[splunk-hec] Send failed: ${err.message}\n`);
  });

  req.write(payload);
  req.end();
}

const logger = {
  log(entry) {
    const line = JSON.stringify(entry);
    buffer.push(line);
    if (buffer.length > MAX_BUFFER) buffer.shift();
    process.stdout.write(line + '\n');

    // Forward to Splunk HEC if configured
    sendToSplunk(entry);
  },

  info(service, endpoint, message, extra = {}) {
    this.log({ timestamp: new Date().toISOString(), service_name: service, endpoint, severity: 'INFO', message, ...extra });
  },

  warn(service, endpoint, message, extra = {}) {
    this.log({ timestamp: new Date().toISOString(), service_name: service, endpoint, severity: 'WARN', message, ...extra });
  },

  error(service, endpoint, message, extra = {}) {
    this.log({ timestamp: new Date().toISOString(), service_name: service, endpoint, severity: 'ERROR', message, ...extra });
  },

  getRecent(count = 100) {
    const logs = buffer.slice(-count).map(l => JSON.parse(l));
    const oldestEntry = buffer.length > 0 ? JSON.parse(buffer[0]) : null;
    return {
      total_in_buffer: buffer.length,
      oldest_timestamp: oldestEntry?.timestamp || null,
      logs
    };
  }
};

// Start batching on module load
startSplunkBatching();

module.exports = { logger };
