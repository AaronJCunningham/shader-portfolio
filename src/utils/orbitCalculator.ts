import { twoline2satrec, propagate, eciToGeodetic, gstime } from 'satellite.js';

export interface SatellitePosition {
  name: string;
  noradId: string;
  lat: number;
  lng: number;
  altitude: number; // km
  velocity: number; // km/s
}

interface TLELine {
  name: string;
  line1: string;
  line2: string;
}

/**
 * Fetch TLE data from CELESTRAK
 */
export const fetchTLEData = async (group: string = 'stations'): Promise<TLELine[]> => {
  try {
    const response = await fetch(
      `https://celestrak.org/NORAD/elements/gp.php?GROUP=${group}&FORMAT=tle`
    );
    const text = await response.text();
    return parseTLEData(text);
  } catch (error) {
    console.error('Failed to fetch TLE data:', error);
    return [];
  }
};

/**
 * Parse TLE format (3-line per satellite: name, line1, line2)
 */
const parseTLEData = (text: string): TLELine[] => {
  const lines = text.split('\n').map((line) => line.trim());
  const tles: TLELine[] = [];

  for (let i = 0; i < lines.length; i += 3) {
    if (i + 2 < lines.length && lines[i + 1] && lines[i + 2]) {
      // Check if line1 and line2 are valid TLE lines (start with 1 and 2)
      if (lines[i + 1].startsWith('1 ') && lines[i + 2].startsWith('2 ')) {
        tles.push({
          name: lines[i],
          line1: lines[i + 1],
          line2: lines[i + 2],
        });
      }
    }
  }

  return tles;
};

/**
 * Calculate satellite position at current time
 */
export const calculateSatellitePosition = (tle: TLELine, date: Date = new Date()): SatellitePosition | null => {
  try {
    const satrec = twoline2satrec(tle.line1, tle.line2);

    // Check for initialization errors
    if (satrec.error) {
      console.error(`Error parsing TLE for ${tle.name}:`, satrec.error);
      return null;
    }

    const positionAndVelocity = propagate(satrec, date);

    if (positionAndVelocity.error) {
      console.error(`Error propagating satellite ${tle.name}:`, positionAndVelocity.error);
      return null;
    }

    const { x, y, z } = positionAndVelocity.position as any;
    const { x: vx, y: vy, z: vz } = positionAndVelocity.velocity as any;

    // Check if position is valid
    if (typeof x !== 'number' || !isFinite(x)) {
      return null;
    }

    // Convert ECI to lat/lng/altitude
    const gmst = gstime(date);
    const gdPos = eciToGeodetic(positionAndVelocity.position as any, gmst);

    // Extract NORAD ID from line1 (format: 1 25544U 98067A ...)
    const noradIdMatch = tle.line1.match(/1\s+(\d+)/);
    const noradId = noradIdMatch ? noradIdMatch[1] : 'unknown';

    return {
      name: tle.name.trim(),
      noradId,
      lat: (gdPos.latitude * 180) / Math.PI,
      lng: (gdPos.longitude * 180) / Math.PI,
      altitude: gdPos.height, // Already in km
      velocity: Math.sqrt(vx * vx + vy * vy + vz * vz),
    };
  } catch (error) {
    console.error(`Error calculating position for ${tle.name}:`, error);
    return null;
  }
};

/**
 * Calculate positions for multiple satellites
 */
export const calculateMultipleSatellitePositions = (
  tles: TLELine[],
  date: Date = new Date()
): SatellitePosition[] => {
  return tles
    .map((tle) => calculateSatellitePosition(tle, date))
    .filter((pos): pos is SatellitePosition => pos !== null);
};
