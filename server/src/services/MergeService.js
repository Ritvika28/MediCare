import { haversineDistance } from './locationService.js';

export class MergeService {
  /**
   * Intelligently merges MongoDB dataset items with Overpass live items.
   * 
   * @param {Array} datasetItems - Healthcare facilities from MongoDB
   * @param {Array} overpassItems - Healthcare facilities from Overpass API
   * @param {number} userLat - User latitude
   * @param {number} userLng - User longitude
   * @returns {Array} Unified list of merged items
   */
  static mergeResults(datasetItems, overpassItems, userLat, userLng) {
    const merged = [];
    const matchedOverpassIds = new Set();

    const getCanonicalName = (name) => {
      return (name || '')
        .toLowerCase()
        .trim()
        .replace(/hospital|clinic|center|healthcare|diagnostic|lab|laboratory|blood bank|pharmacy|centre|dr|doctor/gi, '')
        .replace(/[^a-z0-9]/gi, '')
        .trim();
    };

    const fuzzyAddressMatch = (addr1, addr2) => {
      const city1 = (addr1?.city || '').toLowerCase().trim();
      const city2 = (addr2?.city || '').toLowerCase().trim();
      
      // If cities are specified and completely different, it's not a match
      if (city1 && city2 && city1 !== city2 && !city1.includes(city2) && !city2.includes(city1)) {
        return false;
      }

      const street1 = (addr1?.street || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2);
      const street2 = (addr2?.street || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2);

      if (street1.length === 0 || street2.length === 0) return true; // Keep true if address fields are blank

      const intersection = street1.filter(w => street2.includes(w));
      const overlapScore = intersection.length / Math.min(street1.length, street2.length);
      return overlapScore >= 0.35; // 35% word overlap threshold
    };

    // 1. Process dataset items and check for matches in Overpass items
    datasetItems.forEach(dbItem => {
      const dbObj = dbItem.toObject ? dbItem.toObject() : { ...dbItem };
      const dbCanonical = getCanonicalName(dbObj.name);

      const dbLat = dbObj.latitude || dbObj.location?.coordinates?.[1];
      const dbLng = dbObj.longitude || dbObj.location?.coordinates?.[0];

      // Find if there is a matching Overpass item
      let matchedOsmIndex = overpassItems.findIndex(osmItem => {
        if (matchedOverpassIds.has(osmItem._id)) return false;

        const osmLat = osmItem.latitude;
        const osmLng = osmItem.longitude;

        if (dbLat && dbLng && osmLat && osmLng) {
          const distM = haversineDistance(dbLat, dbLng, osmLat, osmLng) * 1000;
          
          // Tight spatial boundary check (20-30 meters)
          if (distM <= 30) {
            const osmCanonical = getCanonicalName(osmItem.name);
            const nameSim = dbCanonical === osmCanonical || 
                            dbCanonical.includes(osmCanonical) || 
                            osmCanonical.includes(dbCanonical);

            if (nameSim && fuzzyAddressMatch(dbObj.address, osmItem.address)) {
              return true;
            }
          }
        }
        return false;
      });

      if (matchedOsmIndex !== -1) {
        const osmItem = overpassItems[matchedOsmIndex];
        matchedOverpassIds.add(osmItem._id);

        // Merge record: Prioritize MongoDB data, enrich with Overpass metadata
        const mergedItem = {
          ...dbObj,
          _id: dbObj._id || osmItem._id,
          placeId: dbObj.placeId || osmItem.placeId,
          name: dbObj.name,
          type: dbObj.type || osmItem.type,
          source: 'both',
          isVerified: true,
          latitude: dbLat,
          longitude: dbLng,
          
          // Prioritized details from Dataset
          rating: dbObj.rating || osmItem.rating || 4.0,
          reviewCount: dbObj.reviewCount || osmItem.reviewCount || 0,
          specialties: dbObj.specialties || osmItem.specialties || [],
          doctors: dbObj.doctors || [],
          phone: dbObj.phone && dbObj.phone !== 'N/A' ? dbObj.phone : (osmItem.phone || ''),
          email: dbObj.email || osmItem.email || '',

          // Enriched details from Overpass Live
          openingHours: osmItem.openingHours || dbObj.openingHours || '',
          wheelchair: osmItem.wheelchair || dbObj.wheelchair || 'no',
          emergency: osmItem.emergency !== undefined ? osmItem.emergency : (dbObj.emergencyServices || dbObj.emergencyAvailable || false),
          operator: osmItem.operator || '',
          osmTags: osmItem.osmTags || {},
          website: dbObj.website || osmItem.website || ''
        };

        merged.push(mergedItem);
      } else {
        // No match: Add as pure dataset item
        merged.push({
          ...dbObj,
          source: 'dataset',
          isVerified: true,
          latitude: dbLat,
          longitude: dbLng
        });
      }
    });

    // 2. Add remaining unmatched Overpass items
    overpassItems.forEach(osmItem => {
      if (!matchedOverpassIds.has(osmItem._id)) {
        merged.push({
          ...osmItem,
          source: 'overpass',
          isVerified: false
        });
      }
    });

    return merged;
  }
}
