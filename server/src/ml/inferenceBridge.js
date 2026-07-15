import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { telemetry } from './telemetry.js';

const PROJECT_ROOT = path.resolve(process.cwd());

function getPythonExecutable() {
  const candidates = [
    '/opt/anaconda3/bin/python3',
    '/opt/anaconda3/bin/python',
    '/usr/local/bin/python3'
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return c;
    }
  }
  return 'python3';
}

/**
 * Node-Python Inference Bridge utility with latency tracking & telemetry.
 * Runs predict.py child process and pipes payload through stdin/stdout.
 * 
 * @param {Object} payload - The JSON payload to send to predict.py.
 * @returns {Promise<Object>} Resolves prediction JSON output from Python.
 */
export function runPythonInference(payload) {
  const startTime = Date.now();
  const task = payload.task;
  const target = payload.disease || payload.task;

  return new Promise((resolve, reject) => {
    const scriptPath = path.join(PROJECT_ROOT, 'ml', 'scripts', 'inference', 'predict.py');
    const child = spawn(getPythonExecutable(), [scriptPath]);
    
    let stdoutData = '';
    let stderrData = '';
    
    child.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      stderrData += data.toString();
    });
    
    child.on('close', (code) => {
      const latencyMs = Date.now() - startTime;
      if (code !== 0) {
        const error = new Error(`Python process exited with code ${code}. Error: ${stderrData}`);
        telemetry.logRequest({ task, target, latencyMs, success: false, error });
        return reject(error);
      }
      try {
        const result = JSON.parse(stdoutData.trim());
        if (!result.success) {
          const error = new Error(`Python inference returned failure: ${result.error}\nTraceback:\n${result.traceback}`);
          telemetry.logRequest({ task, target, latencyMs, success: false, error });
          return reject(error);
        }
        telemetry.logRequest({ task, target, latencyMs, success: true });
        resolve(result.data);
      } catch (err) {
        const error = new Error(`Failed to parse Python stdout: ${stdoutData}. Error: ${err.message}`);
        telemetry.logRequest({ task, target, latencyMs, success: false, error });
        reject(error);
      }
    });
    
    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}
