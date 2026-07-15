import { Hospital } from '../models/Hospital.js';
import { Doctor } from '../models/Doctor.js';
import { Lab } from '../models/Lab.js';
import { BloodBank } from '../models/BloodBank.js';
import { buildHospitalSearchFilter } from './hospitalSearchService.js';
import { searchDoctorsNearby } from './doctorSearchService.js';
import { buildLabSearchFilter } from '../controllers/labController.js';
import { buildBloodBankSearchFilter } from '../controllers/bloodBankController.js';

export class DatasetService {
  /**
   * Queries the local MongoDB database for healthcare facilities based on coordinates, radius, and filters.
   * 
   * @param {string} entityType - The category of search: 'hospital', 'doctor', 'lab', 'blood_bank', 'clinic', 'pharmacy', 'emergency_center', or 'all'
   * @param {string} nameFilter - Search term / keyword
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {number} radiusM - Radius in meters
   * @param {object} filters - Additional filter parameters (specialty, facilities, etc.)
   * @returns {Promise<Array>} List of mapped dataset records
   */
  static async queryDataset(entityType, nameFilter, lat, lng, radiusM, filters = {}) {
    const dbResults = [];
    const radiusKm = radiusM / 1000;

    const mongoPointQuery = !Number.isNaN(lat) && !Number.isNaN(lng) ? {
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: radiusM
        }
      }
    } : null;

    const queries = [];

    // 1. HOSPITALS / CLINICS / EMERGENCY CENTERS
    if (entityType === 'all' || entityType === 'hospital' || entityType === 'clinic' || entityType === 'emergency_center') {
      queries.push((async () => {
        try {
          const baseFilter = await buildHospitalSearchFilter({
            search: nameFilter,
            city: filters.city,
            facilities: filters.facilities,
          });

          // Handle specific type overrides
          if (entityType === 'clinic') {
            baseFilter.name = { $regex: /clinic|dispensary|care center/i };
          }
          if (entityType === 'emergency_center' || filters.emergency) {
            baseFilter.$or = [{ emergencyServices: true }, { emergencyAvailable: true }];
          }

          let dbQuery = mongoPointQuery ? { ...baseFilter, ...mongoPointQuery } : { ...baseFilter, isActive: true };
          let items = await Hospital.find(dbQuery).populate('departments').limit(40).lean();

          // Fallback to global search if no local results found
          if (items.length === 0 && nameFilter && mongoPointQuery) {
            console.log(`[DatasetService] No nearby hospitals for "${nameFilter}". Falling back to global search.`);
            items = await Hospital.find({ ...baseFilter, isActive: true }).populate('departments').limit(40).lean();
          }

          dbResults.push(...items.map(item => ({
            ...item,
            type: 'hospital',
            isVerified: true
          })));
        } catch (err) {
          console.error('[DatasetService] Hospital query error:', err.message);
        }
      })());
    }

    // 2. DOCTORS
    if (entityType === 'all' || entityType === 'doctor') {
      queries.push((async () => {
        try {
          const docParams = {
            search: nameFilter,
            city: filters.city,
            lat,
            lng,
            latitude: lat,
            longitude: lng,
            radius: radiusKm,
            specialization: filters.specialty,
            gender: filters.gender,
            limit: 40,
            page: 1,
          };

          const { doctors } = await searchDoctorsNearby(docParams);
          const doctorsMapped = doctors.map(doc => {
            const docObj = doc.toObject ? doc.toObject() : { ...doc };
            const hospital = docObj.hospitalId || docObj.hospital;
            const hospLat = hospital?.location?.coordinates?.[1] || lat;
            const hospLng = hospital?.location?.coordinates?.[0] || lng;
            return {
              ...docObj,
              type: 'doctor',
              isVerified: true,
              name: docObj.name || `Dr. ${docObj.user?.firstName || ''} ${docObj.user?.lastName || ''}`.trim(),
              specialty: docObj.specialization || docObj.specialty,
              hospitalName: hospital?.name || docObj.hospitalName || 'Private Clinic',
              latitude: hospLat,
              longitude: hospLng,
              consultationFee: docObj.consultationFee || 500,
              experience: docObj.experience || docObj.experienceYears || 5,
              rating: docObj.rating || 4.5,
            };
          });
          dbResults.push(...doctorsMapped);
        } catch (err) {
          console.error('[DatasetService] Doctor query error:', err.message);
        }
      })());
    }

    // 3. LABORATORIES
    if (entityType === 'all' || entityType === 'lab') {
      queries.push((async () => {
        try {
          const labFilter = buildLabSearchFilter({
            search: nameFilter,
            city: filters.city,
          });

          let dbQuery = mongoPointQuery ? { ...labFilter, ...mongoPointQuery } : { ...labFilter };
          let items = await Lab.find(dbQuery).limit(40).lean();

          // Fallback to global search if no local results found
          if (items.length === 0 && nameFilter && mongoPointQuery) {
            console.log(`[DatasetService] No nearby labs for "${nameFilter}". Falling back to global search.`);
            items = await Lab.find(labFilter).limit(40).lean();
          }

          dbResults.push(...items.map(item => ({
            ...item,
            type: 'lab',
            isVerified: true
          })));
        } catch (err) {
          console.error('[DatasetService] Laboratory query error:', err.message);
        }
      })());
    }

    // 4. BLOOD BANKS
    if (entityType === 'all' || entityType === 'blood_bank') {
      queries.push((async () => {
        try {
          const { filter: bbFilter } = await buildBloodBankSearchFilter({
            search: nameFilter,
            city: filters.city,
            bloodGroup: filters.bloodGroup,
          });

          let dbQuery = mongoPointQuery ? { ...bbFilter, ...mongoPointQuery } : { ...bbFilter };
          let items = await BloodBank.find(dbQuery).populate('hospital', 'name').limit(40).lean();

          // Fallback to global search if no local results found
          if (items.length === 0 && nameFilter && mongoPointQuery) {
            console.log(`[DatasetService] No nearby blood banks for "${nameFilter}". Falling back to global search.`);
            items = await BloodBank.find(bbFilter).populate('hospital', 'name').limit(40).lean();
          }

          dbResults.push(...items.map(item => ({
            ...item,
            type: 'blood_bank',
            isVerified: true
          })));
        } catch (err) {
          console.error('[DatasetService] Blood bank query error:', err.message);
        }
      })());
    }

    await Promise.all(queries);
    return dbResults;
  }
}
