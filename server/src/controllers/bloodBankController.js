import { BloodBank } from '../models/BloodBank.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Get all blood banks with optional city filter
export const getBloodBanks = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.city) filter['address.city'] = new RegExp(req.query.city, 'i');
  if (req.query.bloodGroup) {
    filter['bloodGroups.group'] = req.query.bloodGroup;
    filter['bloodGroups.unitsAvailable'] = { $gt: 0 };
  }

  const bloodBanks = await BloodBank.find(filter)
    .populate('hospital', 'name')
    .sort('-rating')
    .limit(parseInt(req.query.limit) || 50);

  res.json({ success: true, count: bloodBanks.length, data: bloodBanks });
});

// Get nearby blood banks by coordinates
export const getNearbyBloodBanks = asyncHandler(async (req, res) => {
  const { lng, lat, maxDistance = 20000 } = req.query; // maxDistance in meters, default 20km
  if (!lng || !lat) throw new AppError('Longitude and latitude are required', 400);

  const bloodBanks = await BloodBank.find({
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
        $maxDistance: parseInt(maxDistance),
      },
    },
  }).populate('hospital', 'name').limit(20);

  res.json({ success: true, count: bloodBanks.length, data: bloodBanks });
});

// Get single blood bank by ID
export const getBloodBank = asyncHandler(async (req, res) => {
  const bloodBank = await BloodBank.findById(req.params.id).populate('hospital', 'name');
  if (!bloodBank) throw new AppError('Blood bank not found', 404);

  res.json({ success: true, data: bloodBank });
});

// Register as a volunteer donor
export const registerVolunteer = asyncHandler(async (req, res) => {
  const { bloodBankId } = req.params;
  const { name, bloodGroup, phone, email } = req.body;

  if (!name || !bloodGroup || !phone) {
    throw new AppError('Name, blood group, and phone are required', 400);
  }

  const bloodBank = await BloodBank.findById(bloodBankId);
  if (!bloodBank) throw new AppError('Blood bank not found', 404);

  bloodBank.volunteers.push({ name, bloodGroup, phone, email });
  await bloodBank.save();

  res.status(201).json({ success: true, message: 'Registered as volunteer donor' });
});
