import { haversineDistance } from './locationService.js';

export class RankingEngineService {
  /**
   * Evaluates and ranks healthcare results based on distance, verified status, rating, open status, and keyword relevance.
   * 
   * @param {Array} items - Unified merged list of items
   * @param {number} userLat - User latitude
   * @param {number} userLng - User longitude
   * @param {object} preferences - Search preferences/options (specialty, emergency)
   * @returns {Array} Ranked list of items
   */
  static rankResults(items, userLat = null, userLng = null, preferences = {}) {
    return items.map(item => {
      const { score, distanceKm } = this.calculateRankingScore(item, userLat, userLng, preferences);
      
      const distance = distanceKm !== null ? distanceKm * 1000 : null; // in meters
      const distanceText = distance !== null ? 
        (distance < 1000 ? `${Math.round(distance)} m` : `${distanceKm.toFixed(1)} km`) : '';

      return {
        ...item,
        distance,
        distanceKm,
        distanceText,
        rankingScore: score
      };
    }).sort((a, b) => b.rankingScore - a.rankingScore);
  }

  static calculateRankingScore(item, userLat = null, userLng = null, preferences = {}) {
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
      score += 50;
    }

    // 2. Rating Score
    const rating = parseFloat(item.rating || item.ratingAverage || 0);
    score += rating * 10;

    // 3. Emergency Score
    const isEmergency = item.emergency === true || 
                        item.emergencyServices === true || 
                        item.emergencyAvailable === true ||
                        (item.osmTags && item.osmTags.emergency === 'yes') ||
                        preferences.emergency === true;
    if (isEmergency) {
      score += 50;
    }

    // 4. Open Now Score
    const isOpen = item.isOpenNow === true || 
                   item.status === 'open' || 
                   item.timings?.includes('24x7') ||
                   (item.openingHours && item.openingHours.includes('24/7')) ||
                   (item.osmTags && item.osmTags.opening_hours === '24/7');
    if (isOpen) {
      score += 30;
    }

    // 5. Specialty / Relevance Match Score
    let isSpecialtyMatch = false;
    if (preferences.specialty) {
      const specLower = preferences.specialty.toLowerCase();
      const docSpec = (item.specialization || item.specialty || '').toLowerCase();
      const hospDeps = (item.departments || []).map(d => (d.name || '').toLowerCase());
      
      isSpecialtyMatch = docSpec.includes(specLower) || 
                         hospDeps.some(dep => dep.includes(specLower)) ||
                         (item.osmTags && (item.osmTags.speciality || '').toLowerCase().includes(specLower));
    }
    if (isSpecialtyMatch) {
      score += 50;
    }

    // 6. MongoDB / Verified Partner Bonus (40 points)
    const isVerifiedPartner = item.isVerified === true || 
                              item.verified === true || 
                              (!String(item._id).startsWith('overpass_') && !String(item._id).startsWith('google_'));
    if (isVerifiedPartner) {
      score += 40;
    }

    // 7. Review Count Score (log-scaled)
    const reviews = parseInt(item.reviewCount || 0, 10);
    if (reviews > 0) {
      score += Math.min(20, Math.log10(reviews) * 10);
    }

    return {
      score: Math.round(score * 100) / 100, // round to 2 decimal places
      distanceKm: distanceKm !== null ? Math.round(distanceKm * 100) / 100 : null
    };
  }
}
