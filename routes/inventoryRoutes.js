import express from 'express';
import { adminAuth } from '../middleware/auth.js';
import {
  getInventory,
  getProductInventory,
  updateInventory,
  addInventory,
  getLowStockItems,
  bulkUpdateInventory
} from '../controllers/inventoryController.js';

const router = express.Router();

// Get all inventory
router.get('/', adminAuth, getInventory);

// Get inventory for specific product
router.get('/product/:productId', adminAuth, getProductInventory);

// Get low stock items
router.get('/low-stock', adminAuth, getLowStockItems);

// Add new inventory
router.post('/', adminAuth, addInventory);

// Update inventory
router.put('/:id', adminAuth, updateInventory);

// Bulk update inventory
router.post('/bulk', adminAuth, bulkUpdateInventory);

export default router;