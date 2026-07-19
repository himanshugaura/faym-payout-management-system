import express from 'express';
import { saleController } from './sale.controller.js';
import validate from '../../middlewares/validate.js';
import { saleValidation } from './sale.validation.js';

const router = express.Router();

router.post('/', validate(saleValidation.createSale), saleController.createSale);

router.get('/', saleController.getAllSales);

router.get('/user/:userId', validate(saleValidation.getSalesByUser), saleController.getSalesByUser);

router.get('/:saleId', validate(saleValidation.getSaleById), saleController.getSaleById);

router.patch('/:saleId/reconcile', validate(saleValidation.reconcileSale), saleController.reconcileSale);

export const saleRoutes = router;
