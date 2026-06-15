import { Hospital } from '../models/Hospital.js';
import { Doctor } from '../models/Doctor.js';
import { Lab } from '../models/Lab.js';
import { BloodBank } from '../models/BloodBank.js';
import { HospitalRecommendation } from '../models/HospitalRecommendation.js';
import { fetchNearbyHospitalsFromOverpass } from './overpassService.js';

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const generateRecommendationsForUser = async (userId, options = {}) => {
  const { latitude, longitude, specialization, isEmergency } = options;
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  const hasCoords = !Number.isNaN(lat) && !Number.isNaN(lng);

  const matchedDept = specialization || 'General Medicine';

  // 1. hospitals
  const allHospitals = await Hospital.find({ isActive: true }).lean();
  const scoredHospitals = allHospitals.map(h => {
    let score = (h.rating || 3.5) * 8; // out of 40
    const reasons = [];
    let distance = null;

    // Specialty check
    const hasSpecialty = h.specialties?.some(s => s.toLowerCase().includes(matchedDept.toLowerCase()));
    if (hasSpecialty) {
      score += 30;
      reasons.push(`Specialized department in ${matchedDept}`);
    }

    // Emergency check
    if (isEmergency && h.facilities?.Emergency) {
      score += 20;
      reasons.push('Has 24/7 active Emergency/Trauma services');
    }

    // Distance check
    const coords = h.location?.coordinates;
    if (hasCoords && coords && coords.length >= 2) {
      distance = haversineKm(lat, lng, coords[1], coords[0]);
      if (distance < 5) {
        score += 25;
        reasons.push('Very close proximity (< 5km)');
      } else if (distance < 15) {
        score += 15;
        reasons.push('Convenient distance (< 15km)');
      } else if (distance < 30) {
        score += 5;
      }
    }

    if (h.rating >= 4.5) {
      reasons.push('Highly rated by patients');
    }

    return {
      hospital: h._id,
      score: Math.round(score),
      reasons,
      distance: distance ? parseFloat(distance.toFixed(1)) : null
    };
  });

  // 2. Fetch external hospitals from Overpass API if coordinates are provided
  let scoredExternalHospitals = [];
  if (hasCoords) {
    try {
      const externalHospitals = await fetchNearbyHospitalsFromOverpass(lat, lng, 15000);
      const networkNames = new Set(allHospitals.map(h => h.name?.toLowerCase()));

      // Filter out external hospitals that have the same name as database hospitals
      const uniqueExternal = externalHospitals.filter(
        eh => eh.name && !networkNames.has(eh.name.toLowerCase())
      );

      scoredExternalHospitals = uniqueExternal.map(eh => {
        let score = 28; // Base score (equivalent to 3.5 rating)
        const reasons = ['Nearby medical center (public resource)'];

        const nameLower = eh.name.toLowerCase();
        const matchesDept = nameLower.includes(matchedDept.toLowerCase()) || 
                           (matchedDept !== 'General Medicine' && nameLower.includes(matchedDept.split(' ')[0].toLowerCase()));
        if (matchesDept) {
          score += 30;
          reasons.push(`Specialized in ${matchedDept} (inferred)`);
        }

        if (eh.emergencyAvailable) {
          score += 20;
          reasons.push('24/7 emergency services');
        }

        const distance = eh.distanceKm ? parseFloat(eh.distanceKm) : (eh.distance / 1000);
        if (distance < 5) {
          score += 25;
          reasons.push('Very close proximity (< 5km)');
        } else if (distance < 15) {
          score += 15;
          reasons.push('Convenient distance (< 15km)');
        } else if (distance < 30) {
          score += 5;
        }

        return {
          hospital: null,
          name: eh.name,
          address: eh.address?.street || 'Nearby location',
          city: eh.address?.city || 'Nearby',
          score: Math.round(score),
          reasons,
          distance: distance ? parseFloat(distance.toFixed(1)) : null
        };
      });
    } catch (err) {
      console.error('[RecommendationEngine] Error fetching Overpass hospitals:', err);
    }
  }

  // Combine database and external hospitals, then sort
  const combinedHospitals = [...scoredHospitals, ...scoredExternalHospitals]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  // 3. Doctors
  const matchedSpecWord = matchedDept === 'General Medicine' ? 'General' : matchedDept;
  const doctors = await Doctor.find({
    specialization: new RegExp(matchedSpecWord.split(' ')[0], 'i'),
    isActive: true,
    isVerified: true
  })
  .populate('user', 'firstName lastName avatar')
  .populate('hospitalId', 'name location')
  .populate('hospital', 'name location')
  .lean();

  const scoredDoctors = doctors.map(d => {
    let score = (d.rating || 3.5) * 8;
    const reasons = [];

    // Experience bonus
    const exp = d.experience || 5;
    score += Math.min(15, exp * 0.8);
    if (exp >= 10) {
      reasons.push(`Experienced specialist (${exp} years practice)`);
    }

    // Check association with top hospitals
    const dHospId = (d.hospitalId || d.hospital)?._id?.toString();
    const isTopHosp = combinedHospitals.some(sh => sh.hospital && sh.hospital.toString() === dHospId);
    if (isTopHosp) {
      score += 20;
      reasons.push('Practices at a highly recommended hospital');
    }

    if (d.rating >= 4.5) {
      reasons.push('Excellent patient reviews');
    }

    return {
      doctor: d._id,
      score: Math.round(score),
      reasons
    };
  })
  .sort((a, b) => b.score - a.score)
  .slice(0, 3);

  // 4. Labs
  const labs = await Lab.find({}).lean();
  const scoredLabs = labs.map(l => {
    let score = (l.rating || 3.5) * 8;
    const reasons = [];
    let distance = null;

    const coords = l.location?.coordinates;
    if (hasCoords && coords && coords.length >= 2) {
      distance = haversineKm(lat, lng, coords[1], coords[0]);
      if (distance < 5) {
        score += 25;
        reasons.push('Nearby facility (< 5km)');
      } else if (distance < 15) {
        score += 10;
      }
    }

    if (l.testsAvailable?.length > 10) {
      reasons.push('Comprehensive diagnostic test menu');
    }

    return {
      name: l.name,
      distance: distance ? parseFloat(distance.toFixed(1)) : null,
      rating: l.rating,
      address: `${l.address?.street || ''}, ${l.address?.city || ''}`,
      score: Math.round(score),
      reasons
    };
  })
  .sort((a, b) => b.score - a.score)
  .slice(0, 3);

  // 5. Blood Banks
  const bloodBanks = await BloodBank.find({}).lean();
  const scoredBloodBanks = bloodBanks.map(bb => {
    let score = (bb.rating || 3.5) * 8;
    const reasons = [];
    let distance = null;

    const coords = bb.location?.coordinates;
    if (hasCoords && coords && coords.length >= 2) {
      distance = haversineKm(lat, lng, coords[1], coords[0]);
      if (distance < 5) {
        score += 25;
        reasons.push('Close coordinates (< 5km)');
      } else if (distance < 15) {
        score += 10;
      }
    }

    if (bb.timings === '24x7') {
      reasons.push('24/7 Emergency Blood Dispensing');
    }

    return {
      name: bb.name,
      distance: distance ? parseFloat(distance.toFixed(1)) : null,
      address: `${bb.address?.street || ''}, ${bb.address?.city || ''}`,
      score: Math.round(score),
      reasons
    };
  })
  .sort((a, b) => b.score - a.score)
  .slice(0, 3);

  // Save to database
  await HospitalRecommendation.deleteMany({ userId });
  const doc = await HospitalRecommendation.create({
    userId,
    recommendedHospitals: combinedHospitals,
    recommendedDoctors: scoredDoctors,
    recommendedLabs: scoredLabs,
    recommendedBloodBanks: scoredBloodBanks
  });

  // Populate references
  const populated = await HospitalRecommendation.findById(doc._id)
    .populate({
      path: 'recommendedHospitals.hospital',
      select: 'name address location facilities specialties rating'
    })
    .populate({
      path: 'recommendedDoctors.doctor',
      populate: {
        path: 'user',
        select: 'firstName lastName avatar'
      }
    });

  // Convert to object and structure external hospitals as stub objects
  const resObj = populated.toObject();
  resObj.recommendedHospitals = resObj.recommendedHospitals.map(rh => {
    if (rh.hospital) return rh;
    return {
      ...rh,
      hospital: {
        _id: 'external',
        name: rh.name || 'Nearby Hospital',
        address: {
          street: rh.address || 'Nearby Location',
          city: rh.city || ''
        }
      }
    };
  });

  return resObj;
};
