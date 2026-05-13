import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';

export interface RunStats {
  distanceMeters: number;
  durationMs: number;
  paceSecPerKm: number;
}

export function useLocation(active: boolean) {
  const [stats, setStats] = useState<RunStats>({ distanceMeters: 0, durationMs: 0, paceSecPerKm: 0 });
  const startTimeRef = useRef<number | null>(null);
  const lastPosRef = useRef<{ lat: number; lon: number } | null>(null);
  const distanceRef = useRef(0);
  const subRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    if (!active) {
      subRef.current?.remove();
      return;
    }

    startTimeRef.current = Date.now();
    distanceRef.current = 0;
    lastPosRef.current = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      subRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 5 },
        loc => {
          const { latitude, longitude } = loc.coords;
          if (lastPosRef.current) {
            distanceRef.current += haversine(lastPosRef.current.lat, lastPosRef.current.lon, latitude, longitude);
          }
          lastPosRef.current = { lat: latitude, lon: longitude };

          const durationMs = Date.now() - (startTimeRef.current ?? Date.now());
          const km = distanceRef.current / 1000;
          const paceSecPerKm = km > 0.01 ? durationMs / 1000 / km : 0;

          setStats({ distanceMeters: distanceRef.current, durationMs, paceSecPerKm });
        },
      );
    })();

    return () => { subRef.current?.remove(); };
  }, [active]);

  return stats;
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function deg2rad(d: number) { return d * Math.PI / 180; }
