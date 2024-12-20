import asyncHandler from 'express-async-handler';
import { inventoryService } from '../services/inventoryService.js';
import { StatusCodes } from 'http-status-codes';

export const getInventory = asyncHandler(async (req, res) => {
  const inventory = await inventoryService.getAllInventory();
  res.status(StatusCodes.OK).json(inventory);
});

export const getProductInventory = asyncHandler(async (req, res) => {
  const inventory = await inventoryService.getProductInventory(req.params.productId);
  res.status(StatusCodes.OK).json(inventory);
});

export const updateInventory = asyncHandler(async (req, res) => {
  const inventory = await inventoryService.updateInventory(
    req.params.id,
    req.body.quantity,
    req.user._id
  );
  res.status(StatusCodes.OK).json(inventory);
});

export const addInventory = asyncHandler(async (req, res) => {
  const inventory = await inventoryService.addInventory(req.body, req.user._id);
  res.status(StatusCodes.CREATED).json(inventory);
});

export const getLowStockItems = asyncHandler(async (req, res) => {
  const items = await inventoryService.getLowStockItems();
  res.status(StatusCodes.OK).json(items);
});

export const bulkUpdateInventory = asyncHandler(async (req, res) => {
  await inventoryService.bulkUpdateInventory(req.body.items, req.user._id);
  res.status(StatusCodes.OK).json({ 
    success: true,
    message: 'Inventory updated successfully' 
  });
});