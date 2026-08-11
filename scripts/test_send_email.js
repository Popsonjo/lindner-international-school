// Smoke-test for the export server.
//   1. Start it:  npm run start-server
//   2. Run this:  node scripts/test_send_email.js
//
// The /export endpoints require the shared secret from EXPORT_API_TOKEN, sent as the
// `x-export-token` header. Without it the server answers 401 (or 503 if unconfigured).
try { (await import('dotenv')).default.config(); } catch { /* dotenv optional */ }

const TOKEN = process.env.EXPORT_API_TOKEN || '';
const HOST = process.env.EXPORT_SERVER_HOST || '127.0.0.1';
const PORT = process.env.EXPORT_SERVER_PORT || '4001';

if (!TOKEN) {
  console.error('EXPORT_API_TOKEN is not set — add it to .env before running this test.');
  process.exit(1);
}

const data = {
  teachers: [
    { id: 'test-teacher-1', name: 'Test Teacher', passcode: 'TEST1234', assignedStudentIds: [] },
  ],
};

try {
  const response = await fetch(`http://${HOST}:${PORT}/export/teachers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-export-token': TOKEN,
    },
    body: JSON.stringify(data),
  });

  const text = await response.text();
  console.log('STATUS', response.status);
  try {
    console.log('BODY', JSON.parse(text));
  } catch {
    console.log('BODY', text);
  }
} catch (err) {
  console.error('ERROR', err);
  process.exit(1);
}
