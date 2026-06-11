import { ActivityLog } from '../models/ActivityLog.js';

export const errorHandler = async (err, req, res, _next) => {
  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Internal server error';

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

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export const notFound = (req, res, next) => {
  const err = new Error(`Route ${req.originalUrl} not found`);
  err.statusCode = 404;
  err.isOperational = true;
  next(err);
};
