#!/usr/bin/env node

/**
 * NetworkBuster Server Startup Script
 * Manages backend (port 8080) and frontend dev server (port 5173)
 */

const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m'
};

console.log(`\n${colors.blue}🚀 NetworkBuster Development Environment${colors.reset}`);
console.log(`${colors.blue}==========================================${colors.reset}\n`);

const projectRoot = __dirname;
process.chdir(projectRoot);

// Backend server process
console.log(`${colors.yellow}Starting backend server on port 8080...${colors.reset}`);
const backendEnv = { ...process.env, PORT: '8080' };
const backend = spawn('node', ['server.js'], {
  cwd: projectRoot,
  env: backendEnv,
  stdio: 'inherit'
});

backend.on('error', (err) => {
  console.error(`${colors.red}❌ Backend error: ${err.message}${colors.reset}`);
  process.exit(1);
});

backend.on('exit', (code) => {
  console.log(`${colors.red}Backend exited with code ${code}${colors.reset}`);
  process.exit(code);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(`\n${colors.yellow}Shutting down...${colors.reset}`);
  backend.kill();
  process.exit(0);
});

console.log(`${colors.green}✅ Backend running on http://localhost:8080${colors.reset}\n`);
console.log(`${colors.blue}Available endpoints:${colors.reset}`);
console.log(`  - Home: http://localhost:8080/home`);
console.log(`  - AI World: http://localhost:8080/ai-world`);
console.log(`  - Control Panel: http://localhost:8080/control-panel`);
console.log(`  - Health Check: http://localhost:8080/api/health`);
console.log(`\n${colors.yellow}Press Ctrl+C to stop${colors.reset}\n`);
