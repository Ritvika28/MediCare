import { Router } from 'express';
import * as searchController from '../controllers/searchController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

// Publicly accessible search operations
router.get('/', searchController.searchHealthcareProviders);
router.get('/autocomplete', searchController.getAutocompleteSuggestions);

// User-specific protected operations
router.get('/history', protect, searchController.getUserSearchHistory);
router.get('/favorites', protect, searchController.getUserFavorites);
router.post('/favorites/toggle', protect, searchController.toggleFavorite);

export default router;
