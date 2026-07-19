import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import logger from './config/logger.js';
import globalErrorHandler from './middlewares/globalErrorHandler.js';
import AppError from './utils/AppError.js';

import { userRoutes } from './modules/user/user.route.js';
import { saleRoutes } from './modules/sale/sale.route.js';
import { payoutRoutes } from './modules/payout/payout.route.js';
import { withdrawalRoutes } from './modules/withdrawal/withdrawal.route.js';

BigInt.prototype.toJSON = function () {
  return this.toString();
};

const app = express();

app.use(helmet());

const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim().replace(/\/$/, ''))
  : ['http://localhost:3000'];

app.use(cors({
  origin: function (origin, callback) {
   
    if (!origin) return callback(null, true);

    const cleanOrigin = origin.replace(/\/$/, '');
    if (allowedOrigins.indexOf(cleanOrigin) === -1 && !allowedOrigins.includes('*')) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  if (req.url === '/health') return next();
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const method = req.method.padEnd(5, ' ');
    const url = req.originalUrl.padEnd(30, ' ');
    const msStr = `${ms}ms`.padStart(5, ' ');
    logger.info(`${method} ${url} ${res.statusCode} ${msStr}`);
  });
  next();
});

app.use('/api/v1/users', userRoutes);
app.use('/api/v1/sales', saleRoutes);
app.use('/api/v1/payouts', payoutRoutes);
app.use('/api/v1/withdrawals', withdrawalRoutes);

app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));

app.use((req, res, next) => {
  next(new AppError(404, `Not Found - ${req.originalUrl}`));
});

app.use(globalErrorHandler);

export default app;
