import { useState, useEffect, useCallback } from 'react';

export function useCurrentLocation() {
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const requestLocation = useCallback(() => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      setLoading(false);
      return;
    }

    console.log('[LocationHook] Requesting position...');

    const geoOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('[LocationHook] Coordinates received:', position.coords);
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setError(null);
        setLoading(false);
      },
      (err) => {
        console.error('[LocationHook] Geolocation error:', err);
        let errorMsg = 'Unable to determine your location.';
        if (err.code === err.PERMISSION_DENIED) {
          errorMsg = 'Location access is required to find hospitals near you.';
        } else if (err.code === err.TIMEOUT) {
          errorMsg = 'Location detection timed out.';
        }
        setError(errorMsg);
        setLatitude(null);
        setLongitude(null);
        setLoading(false);
      },
      geoOptions
    );
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  return {
    latitude,
    longitude,
    loading,
    error,
    refetch: requestLocation,
  };
}
