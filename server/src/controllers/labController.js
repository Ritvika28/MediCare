import { Lab } from '../models/Lab.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Get all labs with optional filters
export const getLabs = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.city) filter['address.city'] = new RegExp(req.query.city, 'i');
  if (req.query.testCategory) filter['testsAvailable.category'] = req.query.testCategory;

  const labs = await Lab.find(filter).sort('-rating').limit(parseInt(req.query.limit) || 50);

  res.json({ success: true, count: labs.length, data: labs });
});

// Get nearby labs
export const getNearbyLabs = asyncHandler(async (req, res) => {
  const { lng, lat, maxDistance = 15000 } = req.query;
  if (!lng || !lat) throw new AppError('Longitude and latitude are required', 400);

  const labs = await Lab.find({
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
        $maxDistance: parseInt(maxDistance),
      },
    },
  }).limit(20);

  res.json({ success: true, count: labs.length, data: labs });
});

// Get single lab by ID
export const getLab = asyncHandler(async (req, res) => {
  const lab = await Lab.findById(req.params.id);
  if (!lab) throw new AppError('Lab not found', 404);

  res.json({ success: true, data: lab });
});
