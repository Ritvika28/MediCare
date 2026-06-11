import { ActivityLog } from '../models/ActivityLog.js';

export const logActivity = (action, resource) => async (req, res, next) => {
  res.on('finish', () => {
    if (res.statusCode < 400) {
      ActivityLog.create({
        user: req.user?._id,
        action,
        resource,
        resourceId: req.params.id,
        details: { method: req.method, path: req.path },
        ip: req.ip,
        userAgent: req.get('user-agent'),
      }).catch(() => {});
    }
  });
  next();
};
