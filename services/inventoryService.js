import Inventory from '../models/Inventory.js';
import Product from '../models/Product.js';
import InventoryHistory from '../models/InventoryHistory.js';
import { StatusCodes } from 'http-status-codes';
import { ApiError } from '../utils/ApiError.js';

class InventoryService {
  async getAllInventory() {
    try {
      const inventory = await Inventory.find()
        .populate('product', 'name')
        .sort({ 'product.name': 1, size: 1, color: 1 });
      return inventory;
    } catch (error) {
      throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error fetching inventory');
    }
  }

  async getProductInventory(productId) {
    try {
      const inventory = await Inventory.find({ product: productId })
        .populate('product', 'name')
        .sort('size color');
      return inventory;
    } catch (error) {
      throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error fetching product inventory');
    }
  }

  async updateInventory(id, quantity, userId) {
    try {
      const inventory = await Inventory.findByIdAndUpdate(
        id,
        { quantity },
        { new: true, runValidators: true }
      ).populate('product', 'name');

      if (!inventory) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Inventory record not found');
      }

      // Update product total stock
      await this.#updateProductStock(inventory.product._id);

      // Create history record
      await this.#createHistoryRecord({
        product: inventory.product._id,
        type: 'update',
        quantity,
        reason: 'Manual update',
        user: userId
      });

      return inventory;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, error.message);
    }
  }

  async addInventory(data, userId) {
    try {
      const inventory = new Inventory(data);
      const savedInventory = await inventory.save();
      
      // Update product total stock
      await this.#updateProductStock(savedInventory.product);

      // Create history record
      await this.#createHistoryRecord({
        product: savedInventory.product,
        type: 'increase',
        quantity: savedInventory.quantity,
        reason: 'Initial stock',
        user: userId
      });

      return savedInventory;
    } catch (error) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Error adding inventory record');
    }
  }

  async getLowStockItems() {
    try {
      return await Inventory.find({ status: 'low_stock' })
        .populate('product', 'name images')
        .sort('quantity');
    } catch (error) {
      throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error fetching low stock items');
    }
  }

  async bulkUpdateInventory(items, userId) {
    try {
      const updates = items.map(async (item) => {
        const inventory = await Inventory.findByIdAndUpdate(
          item._id,
          { quantity: item.quantity },
          { new: true }
        );

        if (inventory) {
          await this.#updateProductStock(inventory.product);
          await this.#createHistoryRecord({
            product: inventory.product,
            type: 'update',
            quantity: item.quantity,
            reason: 'Bulk update',
            user: userId
          });
        }
      });

      await Promise.all(updates);
    } catch (error) {
      throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error performing bulk update');
    }
  }

  async #updateProductStock(productId) {
    try {
      const inventoryItems = await Inventory.find({ product: productId });
      const totalStock = inventoryItems.reduce((sum, item) => sum + item.quantity, 0);
      await Product.findByIdAndUpdate(productId, { stock: totalStock });
    } catch (error) {
      throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error updating product stock');
    }
  }

  async #createHistoryRecord(data) {
    try {
      await new InventoryHistory(data).save();
    } catch (error) {
      throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error creating history record');
    }
  }
}

export const inventoryService = new InventoryService();