import { ActivityLog } from '../models/ActivityLog.js';

export const errorHandler = async (err, req, res, _next) => {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal server error';

  if (statusCode >= 500) {
    await ActivityLog.create({
      user: req.user?._id,
      action: 'server_error',
      details: { message: err.message, stack: err.stack },
      ip: req.ip,
      userAgent: req.get('user-agent'),
      level: 'error',
    }).catch(() => {});
  }

  // Intercept and structure any error in AI, Record, or ML pipelines
  if (req.originalUrl && (
    req.originalUrl.includes('/ai') ||
    req.originalUrl.includes('/records') ||
    req.originalUrl.includes('/ml') ||
    err.code === 'LIMIT_FILE_SIZE' ||
    err.code === 'INVALID_FILE' ||
    err.code === 'OCR_FAILED' ||
    err.code === 'REPORT_PARSE_FAILED'
  )) {
    const { handleGeminiError } = await import('../utils/geminiErrorHandler.js');
    const { status, payload } = handleGeminiError(err, req.user?._id);
    return res.status(status).json(payload);
  }

  res.status(statusCode).json({
    success: false,
    message: err.isOperational ? message : 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export const notFound = (req, res, next) => {
  const err = new Error(`Route ${req.originalUrl} not found`);
  err.statusCode = 404;
  err.isOperational = true;
  next(err);
};
