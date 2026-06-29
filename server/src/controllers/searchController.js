import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { unifiedSearchHealthcare, extractSearchIntent } from '../services/searchEngineService.js';
import { autocompleteGeocode } from '../services/geocodeService.js';
import { SearchHistory } from '../models/SearchHistory.js';
import { Favorite } from '../models/Favorite.js';
import { GeoCache } from '../models/GeoCache.js';

export const searchHealthcareProviders = asyncHandler(async (req, res) => {
  const {
    query = '',
    latitude,
    longitude,
    radius = 10,
    city,
    locality,
    entityType = 'all',
    rating,
    verified,
    emergency,
    specialty,
    gender
  } = req.query;

  // AI Natural Language Search Intent parsing
  let finalQuery = query;
  let finalEntityType = entityType;
  let finalCity = city;
  let finalLocality = locality;
  let finalSpecialty = specialty;
  let finalEmergency = emergency === 'true';

  const isNaturalLanguage = query.trim().split(/\s+/).length > 2;
  if (isNaturalLanguage) {
    console.log('[Search Controller] Parsing natural language query intent:', query);
    const intent = await extractSearchIntent(query);
    if (intent) {
      // Only override entityType if the client requested 'all' to avoid escaping active module constraints
      if (entityType === 'all' && intent.entityType && intent.entityType !== 'all') {
        finalEntityType = intent.entityType;
      }
      if (intent.city) finalCity = intent.city;
      if (intent.locality) finalLocality = intent.locality;
      if (intent.specialty) finalSpecialty = intent.specialty;
      if (intent.emergency) finalEmergency = true;
      if (intent.nameKeyword) finalQuery = intent.nameKeyword;
    }
  }

  const userId = req.user ? req.user._id : null;

  // Execute unified search pipeline (Modes 1 - 7)
  const results = await unifiedSearchHealthcare({
    query: finalQuery,
    latitude: parseFloat(latitude),
    longitude: parseFloat(longitude),
    radius: parseInt(radius, 10),
    city: finalCity,
    locality: finalLocality,
    entityType: finalEntityType,
    filters: {
      rating,
      verified: verified === 'true',
      emergency: finalEmergency,
      specialty: finalSpecialty,
      gender
    }
  }, userId);

  res.json({
    success: true,
    data: results
  });
});

export const getAutocompleteSuggestions = asyncHandler(async (req, res) => {
  const { q = '' } = req.query;
  const cleanQ = q.trim();
  if (cleanQ.length < 2) {
    return res.json({ success: true, data: [] });
  }

  // Check MongoDB GeoCache first to avoid rate limiting Nominatim
  const cacheKey = `autocomplete:${cleanQ.toLowerCase()}`;
  try {
    const cached = await GeoCache.findOne({ key: cacheKey, type: 'autocomplete' });
    if (cached) {
      console.log('[Search Controller] Returning cached autocomplete results for query:', cleanQ);
      return res.json({ success: true, data: cached.data });
    }
  } catch (err) {
    console.error('[Search Controller] Autocomplete cache read error:', err.message);
  }

  const suggestions = await autocompleteGeocode(cleanQ);

  // Cache suggestions for 12 hours
  try {
    const expireAt = new Date(Date.now() + 12 * 60 * 60 * 1000);
    await GeoCache.findOneAndUpdate(
      { key: cacheKey, type: 'autocomplete' },
      { data: suggestions, expireAt },
      { upsert: true, new: true }
    );
  } catch (err) {
    console.error('[Search Controller] Autocomplete cache write error:', err.message);
  }

  res.json({
    success: true,
    data: suggestions
  });
});

export const getUserSearchHistory = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new AppError('Authentication required to retrieve search history', 401);
  }

  const recent = await SearchHistory.find({ user: req.user._id })
    .sort({ updatedAt: -1 })
    .limit(10);

  const popularSpecialties = await SearchHistory.aggregate([
    { $match: { user: req.user._id, specialty: { $exists: true, $ne: null } } },
    { $group: { _id: '$specialty', count: { $sum: '$count' } } },
    { $sort: { count: -1 } },
    { $limit: 5 }
  ]);

  const popularCities = await SearchHistory.aggregate([
    { $match: { user: req.user._id, city: { $exists: true, $ne: null } } },
    { $group: { _id: '$city', count: { $sum: '$count' } } },
    { $sort: { count: -1 } },
    { $limit: 5 }
  ]);

  res.json({
    success: true,
    data: {
      recent: recent.map(h => h.query),
      popularSpecialties: popularSpecialties.map(s => s._id),
      popularCities: popularCities.map(c => c._id)
    }
  });
});

export const toggleFavorite = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new AppError('Authentication required to manage favorites', 401);
  }

  const { entityId, entityType, name, address, rating, details } = req.body;
  if (!entityId || !entityType || !name) {
    throw new AppError('entityId, entityType, and name are required', 400);
  }

  const existing = await Favorite.findOne({ user: req.user._id, entityId });
  if (existing) {
    await Favorite.deleteOne({ _id: existing._id });
    return res.json({
      success: true,
      message: 'Item removed from favorites',
      isFavorite: false
    });
  }

  const favorite = await Favorite.create({
    user: req.user._id,
    entityId,
    entityType,
    name,
    address,
    rating: parseFloat(rating || 0),
    details: details || {}
  });

  res.json({
    success: true,
    message: 'Item added to favorites',
    isFavorite: true,
    data: favorite
  });
});

export const getUserFavorites = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new AppError('Authentication required to retrieve favorites', 401);
  }

  const favorites = await Favorite.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json({
    success: true,
    data: favorites
  });
});
