import { BedAvailability } from '../models/BedAvailability.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getBeds = asyncHandler(async (req, res) => {
  let beds = await BedAvailability.findOne({ hospitalId: req.params.hospitalId });
  if (!beds) {
    beds = await BedAvailability.create({
      hospitalId: req.params.hospitalId,
      icuBeds: 10,
      icuAvailable: 5,
      emergencyBeds: 15,
      emergencyAvailable: 7,
      generalBeds: 100,
      generalAvailable: 40,
    });
  }
  res.json({ success: true, data: beds });
});

export const updateBeds = asyncHandler(async (req, res) => {
  const beds = await BedAvailability.findOneAndUpdate(
    { hospitalId: req.params.hospitalId },
    req.body,
    { new: true, upsert: true, runValidators: true }
  );
  res.json({ success: true, data: beds });
});
