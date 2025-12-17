import express from 'express';
import {
  createCategory,
  listCategories,
  updateCategory,
  deleteCategory,
  createItem,
  listItemsByCategory,
  updateItem,
  deleteItem
} from '../controllers/priceListController.js';
import { checkRegistrationStage } from '../middlewares/auth.js';
import { uploadSingle, handleUploadErrors } from '../middlewares/upload.js';

const router = express.Router();

// All routes require authenticated merchant
router.use(checkRegistrationStage);

// Categories
router.get('/categories', listCategories);
router.post('/categories', createCategory);
router.put('/categories/:categoryId', updateCategory);
router.delete('/categories/:categoryId', deleteCategory);

// Items within a category
router.get('/categories/:categoryId/items', listItemsByCategory);
router.post(
  '/categories/:categoryId/items',
  uploadSingle('image'),
  handleUploadErrors,
  createItem
);
router.put(
  '/categories/:categoryId/items/:itemId',
  uploadSingle('image'),
  handleUploadErrors,
  updateItem
);
router.delete('/categories/:categoryId/items/:itemId', deleteItem);

export default router;


