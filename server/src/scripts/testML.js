import 'dotenv/config';
import { connectDB } from '../config/db.js';
import { runMLSuiteForUser } from '../services/HealthTwinService.js';
import { generateRecommendationsForUser } from '../services/RecommendationEngineService.js';
import { User } from '../models/User.js';
import { Patient } from '../models/Patient.js';
import { HealthPrediction } from '../models/HealthPrediction.js';
import { HealthForecast } from '../models/HealthForecast.js';
import { HealthAnomaly } from '../models/HealthAnomaly.js';
import { HospitalRecommendation } from '../models/HospitalRecommendation.js';
import { HealthTwin } from '../models/HealthTwin.js';
import mongoose from 'mongoose';

const test = async () => {
  await connectDB();
  console.log('Finding a test patient in DB...');
  const user = await User.findOne({ role: 'patient' });
  if (!user) {
    console.warn('No patient user found in database!');
    await mongoose.connection.close();
    return;
  }
  const userId = user._id;
  console.log(`Verifying ML models inside database for: ${user.firstName} ${user.lastName} (${userId})`);

  // Run the orchestrator
  await runMLSuiteForUser(userId);

  // Run recommendations
  await generateRecommendationsForUser(userId, {
    latitude: 12.9716,
    longitude: 77.5946
  });

  // Retrieve records from all collections
  const [predictions, forecasts, anomalies, recommendations, healthTwin] = await Promise.all([
    HealthPrediction.find({ userId }).lean(),
    HealthForecast.findOne({ userId }).lean(),
    HealthAnomaly.find({ userId }).lean(),
    HospitalRecommendation.findOne({ userId }).lean(),
    HealthTwin.findOne({ userId }).lean()
  ]);

  console.log('\n--- VERIFICATION REPORT ---');
  console.log(`1. HealthPredictions found: ${predictions.length}`);
  console.log(`2. HealthForecast found: ${forecasts ? 'Yes' : 'No'}`);
  if (forecasts) console.log('   Forecast sample:', JSON.stringify(forecasts.forecasts[0], null, 2));
  
  console.log(`3. HealthAnomalies found: ${anomalies.length}`);
  if (anomalies.length) console.log('   Anomaly messages:', anomalies.map(a => a.message));

  console.log(`4. HospitalRecommendation found: ${recommendations ? 'Yes' : 'No'}`);
  if (recommendations) {
    console.log(`   Recommended hospitals count: ${recommendations.recommendedHospitals?.length || 0}`);
    console.log(`   Recommended doctors count: ${recommendations.recommendedDoctors?.length || 0}`);
  }

  console.log(`5. HealthTwin found: ${healthTwin ? 'Yes' : 'No'}`);
  if (healthTwin) {
    console.log('   Health Twin Data:', {
      healthAge: healthTwin.healthAge,
      biologicalAgeEstimate: healthTwin.biologicalAgeEstimate,
      healthStabilityIndex: healthTwin.healthStabilityIndex,
      healthTwinScore: healthTwin.healthTwinScore
    });
  }
  
  await mongoose.connection.close();
  console.log('\nMongoose connection closed successfully.');
};

test().catch(async (err) => {
  console.error('Test script crashed:', err);
  try {
    await mongoose.connection.close();
  } catch {}
});
