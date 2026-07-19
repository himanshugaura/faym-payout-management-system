import catchAsync from '../../utils/catchAsync.js';
import { sendResponse } from '../../utils/response.js';
import { saleService } from './sale.service.js';

const createSale = catchAsync(async (req, res) => {
  const sale = await saleService.createSale(req.body);
  return sendResponse(res, 201, 'Sale created successfully', sale);
});

const getAllSales = catchAsync(async (req, res) => {
  const { userId, status, brand } = req.query;
  const sales = await saleService.getAllSales({ userId, status, brand });
  return sendResponse(res, 200, 'Sales fetched successfully', sales);
});

const getSaleById = catchAsync(async (req, res) => {
  const sale = await saleService.getSaleById(req.params.saleId);
  return sendResponse(res, 200, 'Sale fetched successfully', sale);
});

const getSalesByUser = catchAsync(async (req, res) => {
  const sales = await saleService.getSalesByUser(req.params.userId);
  return sendResponse(res, 200, 'Sales fetched successfully', sales);
});

const reconcileSale = catchAsync(async (req, res) => {
  const sale = await saleService.reconcileSale(req.params.saleId, req.body.status);
  return sendResponse(res, 200, 'Sale reconciled successfully', sale);
});

export const saleController = {
  createSale,
  getAllSales,
  getSaleById,
  getSalesByUser,
  reconcileSale,
};
