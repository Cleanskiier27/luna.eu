import express from 'express';

const app = express();
const PORT = process.env.PORT || 3001;

app.get('/', (req, res) => {
  res.json({ status: 'ok', port: PORT });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', uptime: process.uptime() });
});

const server = app.listen(PORT, () => {
  console.log(`\n✅ Test server running on http://localhost:${PORT}`);
  console.log(`Test endpoint: http://localhost:${PORT}/api/health\n`);
});

// Error handling
server.on('error', (err) => {
  console.error('Server error:', err);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});
