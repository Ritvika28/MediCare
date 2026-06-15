import { Hospital } from '../models/Hospital.js';
import { EmergencyRequest } from '../models/EmergencyRequest.js';
import { Patient } from '../models/Patient.js';
import { getGoogleMapsRouteUrl } from './locationService.js';
import { createNotification } from './notificationService.js';
import { generateSOSNotifications } from './notificationEngineService.js';
import { User } from '../models/User.js';

export const findNearestEmergencyHospital = async (latitude, longitude) => {
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  let hospitals = await Hospital.find({
    isActive: true,
    $or: [{ emergencyAvailable: true }, { emergencyServices: true }],
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [lng, lat] },
        $maxDistance: 100000,
      },
    },
  }).limit(5);

  if (!hospitals.length) {
    hospitals = await Hospital.find({ isActive: true }).limit(1);
  }

  const nearest = hospitals[0];
  if (!nearest) return null;

  const [hLng, hLat] = nearest.location?.coordinates || [lng, lat];
  return {
    hospital: nearest,
    routeUrl: getGoogleMapsRouteUrl(lat, lng, hLat, hLng),
    phone: nearest.phone,
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
      address: body.address,
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
        message: `New emergency from patient at ${body.address || 'unknown location'}`,
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

  return {
    emergency,
    nearestHospital: nearest?.hospital,
    routeUrl: nearest?.routeUrl,
    hospitalPhone: nearest?.phone,
    emergencyContact: patient.emergencyContact,
  };
};
