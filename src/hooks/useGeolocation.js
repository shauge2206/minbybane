import { useState, useEffect, useRef } from 'react';

const MIN_DISTANCE_METRES = 50;

function distanceMetres(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

export function useGeolocation() {
  const [location, setLocation] = useState(null);
  const [error, setError]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const lastPos = useRef(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      setLoading(false);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        const prev = lastPos.current;

        if (prev && distanceMetres(prev.lat, prev.lon, lat, lon) < MIN_DISTANCE_METRES) {
          setLoading(false);
          return; // not far enough — skip re-fetch
        }

        lastPos.current = { lat, lon };
        setLocation({ lat, lon });
        setLoading(false);
      },
      (err) => {
        setError(err.code === 1 ? 'PERMISSION_DENIED' : 'Could not get your location: ' + err.message);
        setLoading(false);
      },
      { enableHighAccuracy: true, maximumAge: 15000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return { location, error, loading };
}
