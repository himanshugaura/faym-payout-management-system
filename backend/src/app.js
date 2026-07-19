import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import pinoHttp from 'pino-http';
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

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use(pinoHttp({ logger }));

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
