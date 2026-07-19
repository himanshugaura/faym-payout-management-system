import AppError from '../utils/AppError.js';

const validate = (schema) => (req, res, next) => {
  try {
    const validSchema = typeof schema === 'function' ? schema(req) : schema;

        if (validSchema.params) {
      req.params = validSchema.params.parse(req.params);
    }
    if (validSchema.query) {
      req.query = validSchema.query.parse(req.query);
    }
    if (validSchema.body) {
      req.body = validSchema.body.parse(req.body ?? {});
    }
    next();
  } catch (error) {
    if (error?.errors && Array.isArray(error.errors)) {
      const errorMessage = error.errors
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join(', ');
      return next(new AppError(400, errorMessage));
    }
    next(error);
  }
};

export default validate;
