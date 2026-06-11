import { useState, useCallback } from 'react';

const GEO_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 0,
};

export const LOCATION_ERROR = {
  DENIED: 'PERMISSION_DENIED',
  TIMEOUT: 'TIMEOUT',
  UNAVAILABLE: 'UNAVAILABLE',
  UNSUPPORTED: 'UNSUPPORTED',
};

function mapGeolocationError(err) {
  if (!err) return { code: LOCATION_ERROR.UNAVAILABLE, message: 'Location services are unavailable.' };
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return {
        code: LOCATION_ERROR.DENIED,
        message: 'Location access is required to find hospitals near you.',
      };
    case err.TIMEOUT:
      return {
        code: LOCATION_ERROR.TIMEOUT,
        message: 'Unable to determine your location.',
      };
    case err.POSITION_UNAVAILABLE:
      return {
        code: LOCATION_ERROR.UNAVAILABLE,
        message: 'Location services are unavailable.',
      };
    default:
      return {
        code: LOCATION_ERROR.UNAVAILABLE,
        message: err.message || 'Unable to get your location.',
      };
  }
}

export function useLocation({ requestOnMount = false } = {}) {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [errorCode, setErrorCode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState(null);

  const requestLocation = useCallback(() => {
    setLoading(true);
    setError(null);
    setErrorCode(null);

    if (!navigator.geolocation) {
      const mapped = {
        code: LOCATION_ERROR.UNSUPPORTED,
        message: 'Geolocation is not supported by your browser.',
      };
      setError(mapped.message);
      setErrorCode(mapped.code);
      setLoading(false);
      console.warn('[Location] Geolocation not supported');
      return;
    }

    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((result) => {
          setPermissionStatus(result.state);
          console.log('[Location] Permission status:', result.state);
        })
        .catch(() => {});
    }

    console.log('[Location] Requesting position...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        console.log('[Location] Current coordinates:', coords);
        setLocation(coords);
        setError(null);
        setErrorCode(null);
        setPermissionStatus('granted');
        setLoading(false);
      },
      (err) => {
        const mapped = mapGeolocationError(err);
        console.error('[Location] Error:', mapped.code, err.message);
        setError(mapped.message);
        setErrorCode(mapped.code);
        setLocation(null);
        setLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setPermissionStatus('denied');
        }
      },
      GEO_OPTIONS
    );
  }, []);

  return {
    location,
    error,
    errorCode,
    loading,
    permissionStatus,
    requestLocation,
    hasLocation: !!location?.latitude && !!location?.longitude,
  };
}
