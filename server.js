import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Serve the web-app on the root
app.use('/', express.static(path.join(__dirname, 'web-app')));

// Serve the real-time-overlay build on /overlay
app.use('/overlay', express.static(path.join(__dirname, 'challengerepo/real-time-overlay/dist')));

// Fallback for overlay SPA
app.get('/overlay*', (req, res) => {
  res.sendFile(path.join(__dirname, 'challengerepo/real-time-overlay/dist/index.html'));
});

// Fallback for root SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'web-app/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Web app: http://localhost:${PORT}`);
  console.log(`Real-time overlay: http://localhost:${PORT}/overlay`);
});
