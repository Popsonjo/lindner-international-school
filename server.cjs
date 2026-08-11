// Load .env into process.env
try { require('dotenv').config(); } catch (e) { /* dotenv optional */ }
const express = require('express');
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const nodemailer = require('nodemailer');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '2mb' }));

const EXPORT_DIR = path.join(__dirname, 'exports');
if (!fs.existsSync(EXPORT_DIR)) fs.mkdirSync(EXPORT_DIR, { recursive: true });

// SMTP config from env
const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@lindner.local';
const SCHOOL_EMAIL = process.env.SCHOOL_EMAIL || 'lindnerinternationalschool@gmail.com';

// Shared secret required on every export request. This endpoint writes files and
// sends mail containing student PII, so it must not be callable by anything that can
// merely reach the port. Set EXPORT_API_TOKEN in .env and send it as `x-export-token`.
const EXPORT_API_TOKEN = process.env.EXPORT_API_TOKEN || '';
// Bound to loopback by default; override only behind a trusted reverse proxy.
const HOST = process.env.EXPORT_SERVER_HOST || '127.0.0.1';
const PORT = Number(process.env.EXPORT_SERVER_PORT) || 4001;

const MAX_ROWS = 5000;

if (!EXPORT_API_TOKEN) {
  console.warn(
    '[export] EXPORT_API_TOKEN is not set — every /export request will be rejected.\n' +
    '         Set it in .env (see .env.example) and send it as the x-export-token header.',
  );
}

/**
 * Reduce a caller-supplied label to a safe filename component.
 * `classLevel` used to be interpolated into the path after only collapsing
 * whitespace, so a value like "../../evil" escaped the exports directory and let an
 * unauthenticated caller write an .xlsx anywhere the process could reach.
 */
function toSafeFileSlug(value, fallback) {
  const slug = String(value == null ? '' : value)
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
  return slug || fallback;
}

/** Belt-and-braces: confirm the resolved path really is inside EXPORT_DIR. */
function resolveInsideExportDir(filename) {
  const resolved = path.resolve(EXPORT_DIR, filename);
  const root = path.resolve(EXPORT_DIR) + path.sep;
  if (!resolved.startsWith(root)) {
    throw new Error('Resolved export path escaped the export directory');
  }
  return resolved;
}

/** Rows must be flat objects — nested values would be serialised unpredictably. */
function normalizeRows(rows) {
  return rows.map((row) => {
    if (row === null || typeof row !== 'object' || Array.isArray(row)) return { value: String(row) };
    const flat = {};
    for (const [key, value] of Object.entries(row)) {
      if (value === null || value === undefined) flat[key] = '';
      else if (typeof value === 'object') flat[key] = JSON.stringify(value);
      else flat[key] = value;
    }
    return flat;
  });
}

function requireToken(req, res, next) {
  if (!EXPORT_API_TOKEN) {
    return res.status(503).json({ error: 'Export service is not configured.' });
  }
  const provided = req.get('x-export-token') || '';
  // Length check first so the comparison below cannot throw on a mismatch.
  if (provided.length !== EXPORT_API_TOKEN.length) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const crypto = require('crypto');
  const ok = crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(EXPORT_API_TOKEN));
  if (!ok) return res.status(401).json({ error: 'Unauthorized' });
  return next();
}

/** Crude in-memory throttle so a caller cannot spam exports (and outbound email). */
const requestLog = new Map();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 10;

function rateLimit(req, res, next) {
  const key = req.ip || 'unknown';
  const now = Date.now();
  const hits = (requestLog.get(key) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (hits.length >= RATE_MAX) {
    return res.status(429).json({ error: 'Too many export requests. Please wait a minute.' });
  }
  hits.push(now);
  requestLog.set(key, hits);
  return next();
}

function createWorkbookFromJsonArray(name, arr) {
  const ws = xlsx.utils.json_to_sheet(arr);
  const wb = xlsx.utils.book_new();
  // Excel sheet names cap at 31 chars and forbid : \ / ? * [ ]
  const sheetName = toSafeFileSlug(name, 'Sheet1').slice(0, 31);
  xlsx.utils.book_append_sheet(wb, ws, sheetName);
  return wb;
}

let transporter = null;
function getTransporter() {
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return transporter;
}

async function sendEmailWithAttachment(subject, text, filename, filepath) {
  const mailer = getTransporter();
  if (!mailer) {
    console.warn('SMTP not configured; skipping email send. File saved as:', filename);
    return { skipped: true, reason: 'smtp-not-configured' };
  }

  await mailer.sendMail({
    from: FROM_EMAIL,
    to: SCHOOL_EMAIL,
    subject,
    text,
    attachments: [{ filename, path: filepath }],
  });

  // Deliberately not returning nodemailer's `info`: it echoes envelope details.
  return { skipped: false, delivered: true };
}

async function handleExport(req, res, { rowsKey, labelKey, defaultLabel, subject, body }) {
  const rows = req.body ? req.body[rowsKey] : undefined;
  if (!Array.isArray(rows)) {
    return res.status(400).json({ error: `${rowsKey} array required` });
  }
  if (rows.length === 0) {
    return res.status(400).json({ error: `${rowsKey} array must not be empty` });
  }
  if (rows.length > MAX_ROWS) {
    return res.status(413).json({ error: `Refusing to export more than ${MAX_ROWS} rows` });
  }

  const label = toSafeFileSlug(labelKey ? req.body[labelKey] : null, defaultLabel);
  const filename = `${label}_${Date.now()}.xlsx`;
  const filepath = resolveInsideExportDir(filename);

  xlsx.writeFile(createWorkbookFromJsonArray(label, normalizeRows(rows)), filepath);
  const mail = await sendEmailWithAttachment(subject(label), body(label), filename, filepath);

  // Only the filename — the absolute server path used to be returned to the caller.
  return res.json({ ok: true, filename, mail });
}

app.post('/export/students', requireToken, rateLimit, async (req, res) => {
  try {
    await handleExport(req, res, {
      rowsKey: 'students',
      labelKey: 'classLevel',
      defaultLabel: 'students',
      subject: (label) => `Student Registry - ${label}`,
      body: (label) => `Attached registry for ${label}`,
    });
  } catch (e) {
    console.error('[export/students]', e);
    // Generic message: e.message can disclose paths and internal state.
    res.status(500).json({ error: 'Export failed. Check the server logs for details.' });
  }
});

app.post('/export/teachers', requireToken, rateLimit, async (req, res) => {
  try {
    await handleExport(req, res, {
      rowsKey: 'teachers',
      labelKey: null,
      defaultLabel: 'teachers',
      subject: () => 'Teacher Registry',
      body: () => 'Attached teacher registry',
    });
  } catch (e) {
    console.error('[export/teachers]', e);
    res.status(500).json({ error: 'Export failed. Check the server logs for details.' });
  }
});

app.listen(PORT, HOST, () => {
  console.log(`Export server listening on http://${HOST}:${PORT}`);
});
