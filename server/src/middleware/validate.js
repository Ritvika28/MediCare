import { AppError } from '../utils/AppError.js';

export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  if (!result.success) {
    const messages = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
    throw new AppError(messages.join('; '), 400);
  }

  if (result.data.body) req.body = result.data.body;
  if (result.data.query) req.query = { ...req.query, ...result.data.query };
  if (result.data.params) req.params = { ...req.params, ...result.data.params };
  next();
};
