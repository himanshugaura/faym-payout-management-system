import logger from '../config/logger.js';
import { env } from '../config/env.js';

const globalErrorHandler = (err, req, res, next) => {
  let { statusCode, message } = err;

    if (!statusCode) statusCode = 500;
  if (!message) message = 'Internal Server Error';

  res.locals.errorMessage = err.message;

  const response = {
    success: false,
    message,
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  };

  if (env.NODE_ENV === 'development') {
    logger.error(err);
  }

  res.status(statusCode).json(response);
};

export default globalErrorHandler;
