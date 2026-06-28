import 'dotenv/config';
import { reverseGeocode, forwardGeocode } from '../services/geocodeService.js';
import { fetchNearbyHealthcareFromOverpass } from '../services/overpassService.js';
import { getRouteDirections } from '../services/openRouteService.js';
import { connectDB } from '../config/db.js';
import mongoose from 'mongoose';

const test = async () => {
  console.log('--- STARTING MAPPING VERIFICATION ---');
  await connectDB();

  // Test GPS Coordinates (e.g., Lucknow coordinates)
  const lat = 26.8467;
  const lng = 80.9462;

  console.log('\n1. Testing Reverse Geocoding (Nominatim)...');
  const revResult = await reverseGeocode(lat, lng);
  console.log('Reverse Geocode Result:', JSON.stringify(revResult, null, 2));

  console.log('\n2. Testing Forward Geocoding (Nominatim)...');
  const forwardResult = await forwardGeocode('Lucknow');
  console.log(`Found ${forwardResult.length} search results. First result:`, JSON.stringify(forwardResult[0], null, 2));

  console.log('\n3. Testing Overpass - Hospitals...');
  const hospitals = await fetchNearbyHealthcareFromOverpass(lat, lng, 'hospital', 5000);
  console.log(`Found ${hospitals.length} hospitals near Lucknow.`);
  if (hospitals.length > 0) {
    console.log('First Hospital Sample:', JSON.stringify(hospitals[0], null, 2));
  }

  console.log('\n4. Testing Overpass - Labs...');
  const labs = await fetchNearbyHealthcareFromOverpass(lat, lng, 'laboratory', 10000);
  console.log(`Found ${labs.length} labs near Lucknow.`);
  if (labs.length > 0) {
    console.log('First Lab Sample:', JSON.stringify(labs[0], null, 2));
  }

  console.log('\n5. Testing Overpass - Blood Banks...');
  const bloodBanks = await fetchNearbyHealthcareFromOverpass(lat, lng, 'blood_bank', 10000);
  console.log(`Found ${bloodBanks.length} blood banks near Lucknow.`);
  if (bloodBanks.length > 0) {
    console.log('First Blood Bank Sample:', JSON.stringify(bloodBanks[0], null, 2));
  }

  console.log('\n6. Testing OpenRouteService (Routing & ETA)...');
  // Route from Lucknow center to first found hospital (or a fallback point if none)
  const destLat = hospitals[0]?.latitude || 26.8500;
  const destLng = hospitals[0]?.longitude || 80.9500;
  const route = await getRouteDirections(lat, lng, destLat, destLng);
  console.log('Route / ETA Result:', JSON.stringify(route, null, 2));

  console.log('\n7. Testing MongoDB Caching...');
  console.log('Calling reverse geocode again (should be instant from cache)...');
  const startCached = Date.now();
  const cachedRevResult = await reverseGeocode(lat, lng);
  console.log(`Cached lookup took ${Date.now() - startCached} ms.`);

  console.log('\n8. Testing Search Cities (Mumbai, Delhi, Lucknow, Hyderabad, Pune, Bangalore)...');
  const cities = ['Mumbai', 'Delhi', 'Lucknow', 'Hyderabad', 'Pune', 'Bangalore'];
  for (const city of cities) {
    const res = await forwardGeocode(city);
    console.log(`- ${city}: lat ${res[0]?.latitude}, lng ${res[0]?.longitude}`);
  }

  console.log('\n--- VERIFICATION COMPLETED ---');
  await mongoose.connection.close();
};

test().catch(err => {
  console.error('Test failed:', err);
  mongoose.connection.close();
});
