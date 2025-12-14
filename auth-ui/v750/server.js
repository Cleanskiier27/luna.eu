import express from 'express';
import compression from 'compression';
import helmet from 'helmet';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.AUTH_PORT || 3003;

// Middleware
app.use(helmet());
app.use(compression());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Mock user database
const users = new Map();

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'auth-ui-v750',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Health
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: 'v750' });
});

// Login endpoint
app.post('/api/auth/login', (req, res) => {
  const { email, password, remember } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password required'
    });
  }

  // Mock authentication
  const user = users.get(email);
  
  if (user && user.password === password) {
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token: generateToken(email),
      user: {
        email: user.email,
        name: user.name,
        createdAt: user.createdAt
      },
      rememberMe: remember
    });
  }

  // For demo: auto-create user if it doesn't exist
  users.set(email, {
    email,
    password,
    name: email.split('@')[0],
    createdAt: new Date().toISOString()
  });

  res.status(200).json({
    success: true,
    message: 'Login successful (demo mode)',
    token: generateToken(email),
    user: {
      email,
      name: email.split('@')[0]
    }
  });
});

// Signup endpoint
app.post('/api/auth/signup', (req, res) => {
  const { name, email, password } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({
      success: false,
      message: 'Name, email and password required'
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 8 characters'
    });
  }

  if (users.has(email)) {
    return res.status(409).json({
      success: false,
      message: 'Email already registered'
    });
  }

  // Create user
  users.set(email, {
    email,
    password,
    name,
    createdAt: new Date().toISOString()
  });

  res.status(201).json({
    success: true,
    message: 'Account created successfully',
    token: generateToken(email),
    user: {
      email,
      name,
      createdAt: new Date().toISOString()
    }
  });
});

// Verify token endpoint
app.post('/api/auth/verify', (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({
      success: false,
      message: 'Token required'
    });
  }

  try {
    const decoded = Buffer.from(token, 'base64').toString();
    const email = decoded.split(':')[0];

    if (users.has(email)) {
      return res.status(200).json({
        success: true,
        valid: true,
        user: {
          email,
          name: users.get(email).name
        }
      });
    }

    res.status(401).json({
      success: false,
      valid: false,
      message: 'Invalid token'
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      valid: false,
      message: 'Token verification failed'
    });
  }
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// Get current user
app.get('/api/auth/me', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'No token provided'
    });
  }

  try {
    const decoded = Buffer.from(token, 'base64').toString();
    const email = decoded.split(':')[0];

    if (users.has(email)) {
      const user = users.get(email);
      return res.json({
        success: true,
        user: {
          email: user.email,
          name: user.name,
          createdAt: user.createdAt
        }
      });
    }

    res.status(404).json({
      success: false,
      message: 'User not found'
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
});

// Get auth stats
app.get('/api/auth/stats', (req, res) => {
  res.json({
    totalUsers: users.size,
    registeredEmails: Array.from(users.keys()),
    timestamp: new Date().toISOString()
  });
});

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Not found',
    path: req.path
  });
});

function generateToken(email) {
  const data = `${email}:${Date.now()}`;
  return Buffer.from(data).toString('base64');
}

app.listen(PORT, () => {
  console.log(`
🔐 Auth UI Server v750 running at http://localhost:${PORT}
📍 Features:
   ✓ Login & Sign Up
   ✓ Token verification
   ✓ User management
   ✓ REST API endpoints
   ✓ Compression & Security headers
`);
});
