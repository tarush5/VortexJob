const { spawn } = require('child_process');
const path = require('path');

console.log('Starting Codity Job Scheduler in production (Combined Server + Worker)...');

const apiProcess = spawn('node', [path.join(__dirname, 'dist', 'index.js')], { stdio: 'inherit' });
const workerProcess = spawn('node', [path.join(__dirname, 'dist', 'worker', 'worker-process.js')], { stdio: 'inherit' });

function handleShutdown(signal) {
  console.log(`Supervisor: Received ${signal}, propagating to child processes...`);
  apiProcess.kill(signal);
  workerProcess.kill(signal);
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

apiProcess.on('exit', (code) => {
  console.log(`Supervisor: API process exited with code ${code}. Terminating worker...`);
  workerProcess.kill('SIGTERM');
  process.exit(code || 0);
});

workerProcess.on('exit', (code) => {
  console.log(`Supervisor: Worker process exited with code ${code}. Terminating API...`);
  apiProcess.kill('SIGTERM');
  process.exit(code || 0);
});
