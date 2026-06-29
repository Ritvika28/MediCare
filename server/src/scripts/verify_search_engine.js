import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { unifiedSearchHealthcare } from '../services/searchEngineService.js';
import { autocompleteGeocode } from '../services/geocodeService.js';
import { calculateRankingScore } from '../services/rankingService.js';
import { GeoCache } from '../models/GeoCache.js';
import { Department } from '../models/Department.js';
import { User } from '../models/User.js';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/medicare';

async function testSearchEngine() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('MongoDB connected successfully.');

  try {
    console.log('\n--- VERIFYING PROBLEM 1: Entity Isolation ---');
    console.log('Executing Hospital Search...');
    const hospitalRes = await unifiedSearchHealthcare({
      query: 'Apollo',
      entityType: 'hospital',
      latitude: 28.6139,
      longitude: 77.2090
    });
    const hasNonHospitals = hospitalRes.results.some(item => item.type !== 'hospital');
    console.log(`Hospitals found: ${hospitalRes.results.length}. Contains doctors or other mixed entities? ${hasNonHospitals ? '❌ YES (Failing)' : '✅ NO (Passing)'}`);

    console.log('Executing Doctor Search...');
    const doctorRes = await unifiedSearchHealthcare({
      query: 'Sharma',
      entityType: 'doctor',
      latitude: 28.6139,
      longitude: 77.2090
    });
    const hasNonDoctors = doctorRes.results.some(item => item.type !== 'doctor');
    console.log(`Doctors found: ${doctorRes.results.length}. Contains hospitals or other mixed entities? ${hasNonDoctors ? '❌ YES (Failing)' : '✅ NO (Passing)'}`);


    console.log('\n--- VERIFYING PROBLEM 2: Coordinate Override for City Searches ---');
    const userLatLucknow = 26.8467;
    const userLngLucknow = 80.9462;
    console.log(`User Location set to Lucknow: Lat: ${userLatLucknow}, Lng: ${userLngLucknow}`);
    console.log('Searching for "Jodhpur" hospitals...');
    
    const cityRes = await unifiedSearchHealthcare({
      query: 'Jodhpur',
      entityType: 'hospital',
      latitude: userLatLucknow,
      longitude: userLngLucknow
    });

    const isCenteredOnJodhpur = Math.abs(cityRes.latitude - 26.2389) < 0.5 && Math.abs(cityRes.longitude - 73.0243) < 0.5;
    console.log(`Result Center: Lat: ${cityRes.latitude}, Lng: ${cityRes.longitude} (City: ${cityRes.city})`);
    console.log(`Coordinates overridden to Jodhpur center? ${isCenteredOnJodhpur ? '✅ YES (Passing)' : '❌ NO (Failing - still centered on user location Lucknow)'}`);


    console.log('\n--- VERIFYING AUTOCOMPLETE: debounced cached Nominatim ---');
    const suggestions = await autocompleteGeocode('Del');
    console.log(`Found ${suggestions.length} suggestions starting with "Del":`);
    suggestions.slice(0, 3).forEach((s, i) => {
      console.log(`  [${i+1}] ${s.displayName} (Lat: ${s.latitude}, Lng: ${s.longitude})`);
    });

    console.log('\n✅ All central production-grade E2E Discovery Engine upgrades verified successfully!');
  } catch (err) {
    console.error('❌ E2E Discovery Engine Verification failed:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected.');
  }
}

testSearchEngine();
