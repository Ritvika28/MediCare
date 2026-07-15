import fs from 'fs';
import path from 'path';

const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'ai-requests.log');

// Keep brief statistics in memory for the health endpoint
let totalRequests = 0;
let totalResponseTime = 0;

export const logAIRequest = async ({
  userId = null,
  endpoint = 'unknown',
  uploadedFilename = null,
  fileSize = null,
  cloudinaryResult = null,
  geminiRequest = null,
  geminiResponseTime = 0,
  status = 'success',
  error = null,
  stackTrace = null,
}) => {
  try {
    // Increment memory statistics
    totalRequests++;
    totalResponseTime += geminiResponseTime;

    // Create log directory if it doesn't exist
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      userId,
      endpoint,
      uploadedFilename,
      fileSize,
      cloudinaryResult: cloudinaryResult ? {
        public_id: cloudinaryResult.public_id,
        secure_url: cloudinaryResult.secure_url,
      } : null,
      geminiRequest: geminiRequest ? maskSensitiveData(geminiRequest) : null,
      geminiResponseTime,
      status,
      error: error ? {
        message: error.message || error,
        code: error.code || error.status || 'N/A',
      } : null,
      stackTrace: stackTrace || (error instanceof Error ? error.stack : null),
    };

    // Append to log file
    fs.appendFileSync(LOG_FILE, JSON.stringify(logEntry) + '\n', 'utf8');
  } catch (err) {
    console.error('[AI Logger Error] Failed to write structured AI log:', err.message);
  }
};

/**
 * Returns average response time from in-memory stats.
 */
export const getAverageResponseTime = () => {
  return totalRequests > 0 ? Math.round(totalResponseTime / totalRequests) : 0;
};

/**
 * Helper to mask sensitive details from logs if they appear in queries or options.
 */
const maskSensitiveData = (data) => {
  if (typeof data === 'string') {
    return data.length > 500 ? data.slice(0, 500) + '... (truncated)' : data;
  }
  if (typeof data === 'object') {
    const serialized = JSON.stringify(data);
    return serialized.length > 500 ? serialized.slice(0, 500) + '... (truncated)' : data;
  }
  return data;
};
