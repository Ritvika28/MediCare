import { Hospital } from '../models/Hospital.js';
import { EmergencyRequest } from '../models/EmergencyRequest.js';
import { Patient } from '../models/Patient.js';
import { BloodBank } from '../models/BloodBank.js';
import { getOpenStreetMapRouteUrl, enrichHospitalWithDistance, haversineDistance } from './locationService.js';
import { createNotification } from './notificationService.js';
import { generateSOSNotifications } from './notificationEngineService.js';
import { User } from '../models/User.js';
import { OverpassLiveService } from './OverpassLiveService.js';
import { reverseGeocode } from './geocodeService.js';
import { sendEmergencyAlerts } from './emergencyNotificationService.js';

export const findNearestEmergencyHospital = async (latitude, longitude) => {
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

  // 1. Reverse Geocode user coordinates to get their address
  let addressDetails = null;
  try {
    addressDetails = await reverseGeocode(lat, lng);
  } catch (err) {
    console.warn('[Emergency Service] Reverse geocoding failed:', err.message);
  }

  // 2. Fetch nearest emergency hospitals from local database
  let dbHospitals = await Hospital.find({
    isActive: true,
    $or: [{ emergencyAvailable: true }, { emergencyServices: true }],
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [lng, lat] },
        $maxDistance: 100000, // 100km
      },
    },
  }).limit(10);

  // 3. Query Overpass API for nearby hospitals
  let osmHospitals = [];
  try {
    osmHospitals = await OverpassLiveService.queryOverpass('hospital', lat, lng, 15000) || [];
  } catch (err) {
    console.warn('[Emergency Service] Overpass hospital query failed:', err.message);
  }

  // 4. Merge and Deduplicate Hospitals
  const mergedHospitals = [];
  const allHospitals = [
    ...dbHospitals.map(h => enrichHospitalWithDistance(h, lat, lng)),
    ...osmHospitals
  ];

  for (const h of allHospitals) {
    const isDuplicate = mergedHospitals.some(existing => {
      const exLat = existing.latitude || existing.location?.coordinates?.[1];
      const exLng = existing.longitude || existing.location?.coordinates?.[0];
      const hLat = h.latitude || h.location?.coordinates?.[1];
      const hLng = h.longitude || h.location?.coordinates?.[0];
      const dist = haversineDistance(hLat, hLng, exLat, exLng);
      return dist < 150 || h.name.toLowerCase().trim() === existing.name.toLowerCase().trim();
    });

    if (!isDuplicate) {
      mergedHospitals.push(h);
    }
  }

  // Rank by emergency ward and distance
  mergedHospitals.sort((a, b) => {
    const aEmergency = a.emergencyAvailable || a.emergencyServices || a.emergency === true;
    const bEmergency = b.emergencyAvailable || b.emergencyServices || b.emergency === true;
    if (aEmergency && !bEmergency) return -1;
    if (!aEmergency && bEmergency) return 1;
    return (a.distance || 0) - (b.distance || 0);
  });

  const nearestHospital = mergedHospitals[0] || null;

  // Trauma Centers: hospitals containing "trauma" or marked emergency on OSM
  const traumaCenters = mergedHospitals.filter(h => 
    h.name.toLowerCase().includes('trauma') || 
    h.name.toLowerCase().includes('emergency') ||
    h.osmTags?.emergency === 'yes'
  ).slice(0, 5);

  // 5. Fetch Blood Banks (MongoDB + Overpass)
  let dbBloodBanks = await BloodBank.find({
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [lng, lat] },
        $maxDistance: 100000,
      },
    },
  }).limit(10);

  let osmBloodBanks = [];
  try {
    osmBloodBanks = await OverpassLiveService.queryOverpass('blood_bank', lat, lng, 20000) || [];
  } catch (err) {
    console.warn('[Emergency Service] Overpass blood bank query failed:', err.message);
  }

  const mergedBloodBanks = [];
  const allBloodBanks = [
    ...dbBloodBanks.map(b => {
      const doc = b.toObject();
      const dist = haversineDistance(lat, lng, doc.location.coordinates[1], doc.location.coordinates[0]);
      return {
        ...doc,
        latitude: doc.location.coordinates[1],
        longitude: doc.location.coordinates[0],
        distance: dist,
        distanceText: `${(dist / 1000).toFixed(1)} km away`,
        source: 'database'
      };
    }),
    ...osmBloodBanks
  ];

  for (const b of allBloodBanks) {
    const isDuplicate = mergedBloodBanks.some(existing => {
      const dist = haversineDistance(
        b.latitude, b.longitude,
        existing.latitude, existing.longitude
      );
      return dist < 150 || b.name.toLowerCase().trim() === existing.name.toLowerCase().trim();
    });
    if (!isDuplicate) {
      mergedBloodBanks.push(b);
    }
  }
  mergedBloodBanks.sort((a, b) => (a.distance || 0) - (b.distance || 0));

  // 6. Fetch Ambulance Providers (Overpass + Static Fallback for safety)
  let osmAmbulances = [];
  try {
    osmAmbulances = await OverpassLiveService.queryOverpass('ambulance', lat, lng, 15000) || [];
  } catch (err) {
    console.warn('[Emergency Service] Overpass ambulance query failed:', err.message);
  }

  const staticAmbulances = [
    {
      _id: 'static_amb_108',
      name: 'National Emergency Medical Service (108)',
      phone: '108',
      distance: 1200,
      address: { street: 'Distributed Dispatch Center', city: 'Emergency Service' },
      timings: '24x7',
      emergency: true,
      rating: 4.8,
      source: 'simulated'
    },
    {
      _id: 'static_amb_102',
      name: 'Janani Shishu Suraksha Ambulance (102)',
      phone: '102',
      distance: 2400,
      address: { street: 'Free Public MICU Services', city: 'Government Healthcare' },
      timings: '24x7',
      emergency: true,
      rating: 4.2,
      source: 'simulated'
    },
    {
      _id: 'static_amb_112',
      name: 'All-in-One SOS Dispatch (112)',
      phone: '112',
      distance: 800,
      address: { street: 'National Unified Helpline', city: 'Public Safety' },
      timings: '24x7',
      emergency: true,
      rating: 4.9,
      source: 'simulated'
    }
  ];

  const mergedAmbulances = [...osmAmbulances, ...staticAmbulances];
  mergedAmbulances.sort((a, b) => (a.distance || 0) - (b.distance || 0));

  // 7. Fetch Pharmacies (Overpass)
  let osmPharmacies = [];
  try {
    osmPharmacies = await OverpassLiveService.queryOverpass('pharmacy', lat, lng, 10000) || [];
  } catch (err) {
    console.warn('[Emergency Service] Overpass pharmacy query failed:', err.message);
  }
  osmPharmacies.sort((a, b) => (a.distance || 0) - (b.distance || 0));

  const [hLng, hLat] = nearestHospital?.location?.coordinates || 
                     [nearestHospital?.longitude, nearestHospital?.latitude] || 
                     [lng, lat];

  return {
    hospital: nearestHospital,
    nearestHospitals: mergedHospitals.slice(0, 5),
    nearestTraumaCenters: traumaCenters.length ? traumaCenters : mergedHospitals.slice(0, 3),
    nearestBloodBanks: mergedBloodBanks.slice(0, 5),
    nearestAmbulanceProviders: mergedAmbulances.slice(0, 5),
    nearestPharmacies: osmPharmacies.slice(0, 5),
    routeUrl: getOpenStreetMapRouteUrl(lat, lng, hLat, hLng),
    phone: nearestHospital?.phone || '112',
    addressDetails,
    distanceKm: nearestHospital ? (haversineDistance(lat, lng, hLat, hLng) / 1000) : 0
  };
};

export const createEmergencyRequest = async (userId, body) => {
  const patient = await Patient.findOne({ user: userId });
  if (!patient) throw new Error('Patient profile required');

  const { latitude, longitude, description, type, hospitalId } = body;
  let nearest = null;
  let assignedHospital = hospitalId;

  if (latitude && longitude) {
    nearest = await findNearestEmergencyHospital(latitude, longitude);
    if (!assignedHospital && nearest?.hospital) {
      assignedHospital = nearest.hospital._id;
    }
  }

  const emergency = await EmergencyRequest.create({
    patient: patient._id,
    patientId: patient._id,
    type: type || 'ambulance',
    hospital: assignedHospital,
    hospitalId: assignedHospital,
    assignedHospital,
    location: {
      type: 'Point',
      coordinates: longitude && latitude ? [parseFloat(longitude), parseFloat(latitude)] : undefined,
      address: body.address || nearest?.addressDetails?.displayName || undefined,
    },
    description,
    routeUrl: nearest?.routeUrl,
    contactNotified: !!patient.emergencyContact?.phone,
    priority: body.priority || 'critical',
  });

  const admins = await User.find({ role: 'admin', isActive: true });
  await Promise.all(
    admins.map((admin) =>
      createNotification({
        userId: admin._id,
        type: 'emergency',
        title: 'Emergency Request',
        message: `New emergency from patient at ${body.address || nearest?.addressDetails?.displayName || 'unknown location'}`,
        data: { emergencyId: emergency._id },
        priority: 'critical',
      })
    )
  );

  await generateSOSNotifications(userId, 'sos_activated', { emergencyId: emergency._id });
  if (patient.emergencyContact?.phone) {
    await generateSOSNotifications(userId, 'contact_notified', { contactName: patient.emergencyContact.name });
  }
  if (latitude && longitude) {
    await generateSOSNotifications(userId, 'location_shared', { latitude, longitude });
  }
  if (nearest?.hospital) {
    await generateSOSNotifications(userId, 'hospital_found', { hospitalName: nearest.hospital.name });
  }

  // Dispatch SMS and Email notifications to emergency contacts asynchronously
  sendEmergencyAlerts(patient, {
    latitude,
    longitude,
    emergencyType: type,
    hospital: nearest?.hospital
  }).catch(err => {
    console.error('[Emergency Service] Async emergency notification alert failed:', err.message);
  });

  return {
    emergency,
    nearestHospital: nearest?.hospital,
    routeUrl: nearest?.routeUrl,
    hospitalPhone: nearest?.phone,
    emergencyContact: patient.emergencyContact,
  };
};
