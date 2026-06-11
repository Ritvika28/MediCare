export const reverseGeocode = async (latitude, longitude) => {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'MediCare-Hospital-App/1.0' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data.address || {};
    return {
      city: addr.city || addr.town || addr.village || addr.county || addr.state_district || '',
      state: addr.state || '',
      country: addr.country || '',
      displayName: data.display_name || '',
    };
  } catch (err) {
    console.error('[Geocode] Reverse geocode failed:', err.message);
    return null;
  }
};
