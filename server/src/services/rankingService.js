import { haversineDistance } from './locationService.js';

/**
 * Calculates a unified ranking score for a healthcare provider.
 * Formula weighting:
 * 1. Distance Score: max 100 points, decays by distance (linear: 100 - 2 * distanceKm)
 * 2. Rating Score: max 50 points, (rating * 10)
 * 3. Emergency Score: 50 points if emergency support is active
 * 4. Open Now Score: 30 points if the facility is currently open
 * 5. Specialty Match Score: 50 points if provider matches specialty query
 * 6. MongoDB Verified Partner Bonus: 40 points
 * 7. Review Count Score: max 20 points, log-scaled based on review count
 */
export const calculateRankingScore = (item, userLat = null, userLng = null, options = {}) => {
  let score = 0;

  // 1. Distance Score
  const lat = item.latitude || (item.location?.coordinates?.[1]);
  const lng = item.longitude || (item.location?.coordinates?.[0]);
  let distanceKm = item.distanceKm ?? (item.distance ? item.distance / 1000 : null);

  if (distanceKm === null && lat && lng && userLat && userLng) {
    distanceKm = haversineDistance(userLat, userLng, lat, lng);
  }

  if (distanceKm !== null) {
    // Linear decay: 100 points, -2 points per km. Minimum 0.
    score += Math.max(0, 100 - (distanceKm * 2));
  } else {
    // Default medium distance score if coordinates are missing
    score += 50;
  }

  // 2. Rating Score
  const rating = parseFloat(item.rating || item.ratingAverage || 0);
  score += rating * 10;

  // 3. Emergency Score
  const isEmergency = item.hasEmergency || 
                      item.emergencyServices || 
                      item.isEmergencyApproved || 
                      item.tags?.includes('emergency') ||
                      options.emergency === true;
  if (isEmergency) {
    score += 50;
  }

  // 4. Open Now Score
  const isOpen = item.isOpenNow || 
                 item.status === 'open' || 
                 item.opening_hours?.includes('24/7') ||
                 item.tags?.opening_hours === '24/7';
  if (isOpen) {
    score += 30;
  }

  // 5. Specialty Match Score
  let isSpecialtyMatch = false;
  if (options.specialty) {
    const specLower = options.specialty.toLowerCase();
    const docSpec = (item.specialization || '').toLowerCase();
    const hospDeps = (item.departments || []).map(d => (d.name || '').toLowerCase());
    
    isSpecialtyMatch = docSpec.includes(specLower) || 
                       hospDeps.some(dep => dep.includes(specLower)) ||
                       (item.tags?.speciality || '').toLowerCase().includes(specLower);
  }
  if (isSpecialtyMatch) {
    score += 50;
  }

  // 6. MongoDB / Verified Partner Bonus
  // Non-OSM entries are our direct network partners in MongoDB, so they get the verified bonus
  const isVerifiedPartner = item.isVerified || 
                            item.verified || 
                            (!String(item._id).startsWith('overpass_') && !String(item._id).startsWith('google_'));
  if (isVerifiedPartner) {
    score += 40;
  }

  // 7. Review Count Score
  const reviews = parseInt(item.reviewCount || 0, 10);
  if (reviews > 0) {
    score += Math.min(20, Math.log10(reviews) * 10);
  }

  return {
    score: Math.round(score * 100) / 100, // round to 2 decimal places
    distanceKm: distanceKm !== null ? Math.round(distanceKm * 100) / 100 : null
  };
};

/**
 * Rank search results using the calculateRankingScore weight system.
 */
export const rankResults = (items, userLat = null, userLng = null, options = {}) => {
  return items.map(item => {
    const { score, distanceKm } = calculateRankingScore(item, userLat, userLng, options);
    return {
      ...item,
      rankingScore: score,
      distanceKm: distanceKm
    };
  }).sort((a, b) => b.rankingScore - a.rankingScore);
};
