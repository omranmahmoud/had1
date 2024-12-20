import express from 'express';
import { adminAuth } from '../middleware/auth.js';
import {
  getBackgrounds,
  getActiveBackground,
  createBackground,
  updateBackground,
  deleteBackground,
  reorderBackgrounds
} from '../controllers/backgroundController.js';

const router = express.Router();

// Public routes
router.get('/active', getActiveBackground);

// Admin routes
router.get('/', adminAuth, getBackgrounds);
router.post('/', adminAuth, createBackground);
router.put('/:id', adminAuth, updateBackground);
router.delete('/:id', adminAuth, deleteBackground);
router.put('/reorder', adminAuth, reorderBackgrounds);

export default router;