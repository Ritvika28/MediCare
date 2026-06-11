import { asyncHandler } from '../utils/asyncHandler.js';
import { getRecommendations } from '../services/aiSymptomService.js';
import { AppError } from '../utils/AppError.js';

export const getRecommendation = asyncHandler(async (req, res) => {
  const { symptoms, latitude, longitude, hospitalId } = req.body;
  if (!symptoms?.trim()) throw new AppError('Symptoms are required', 400);

  const data = await getRecommendations({
    symptoms,
    latitude,
    longitude,
    hospitalId,
  });

  res.json({
    success: true,
    data: {
      recommendedHospital: data.recommendedHospital,
      recommendedDepartment: data.recommendedDepartment,
      recommendedDoctor: data.recommendedDoctor,
      analysis: data.analysis,
      aiInsight: data.aiInsight,
      alternativeDoctors: data.alternativeDoctors,
      nearbyHospitals: data.nearbyHospitals,
    },
  });
});
