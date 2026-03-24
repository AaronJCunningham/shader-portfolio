export interface SatellitePosition {
  name: string;
  noradId: string;
  lat: number;
  lng: number;
  altitude: number;
  velocity: number;
}

interface TLELine {
  name: string;
  line1: string;
  line2: string;
}

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

const parseTLEData = (text: string): TLELine[] => {
  const lines = text.split('\n').map((line) => line.trim());
  const tles: TLELine[] = [];

  for (let i = 0; i < lines.length; i += 3) {
    if (i + 2 < lines.length && lines[i + 1] && lines[i + 2]) {
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
 * Parse TLE epoch to JavaScript Date
 */
const parseTLEEpoch = (epochStr: string): Date => {
  const year = parseInt(epochStr.substring(0, 2));
  const dayOfYear = parseFloat(epochStr.substring(2));
  
  // Determine full year (00-56 = 2000-2056, 57-99 = 1957-1999)
  const fullYear = year < 57 ? 2000 + year : 1900 + year;
  
  const date = new Date(fullYear, 0, 1);
  date.setTime(date.getTime() + (dayOfYear - 1) * 24 * 60 * 60 * 1000);
  
  return date;
};

/**
 * Calculate mean anomaly at given time using Kepler's equation (simplified)
 */
const getMeanAnomaly = (M0: number, n: number, minutesSinceEpoch: number): number => {
  // M = M0 + n * t (where t is in minutes, n is mean motion in revolutions per day)
  const M = M0 + (n * minutesSinceEpoch / 1440); // Convert to days
  return (M % 360 + 360) % 360;
};

/**
 * Simplified position calculation based on TLE orbital elements
 */
export const calculateSatellitePosition = async (
  tle: TLELine,
  date: Date = new Date()
): Promise<SatellitePosition | null> => {
  try {
    const line1 = tle.line1;
    const line2 = tle.line2;

    // Extract NORAD ID
    const noradIdMatch = line1.match(/1\s+(\d+)/);
    const noradId = noradIdMatch ? noradIdMatch[1] : 'unknown';

    // Parse Line 1: epoch
    const epochStr = line1.substring(18, 32);
    const epochDate = parseTLEEpoch(epochStr);

    // Parse Line 2: orbital elements
    const inclination = parseFloat(line2.substring(8, 16));
    const raan = parseFloat(line2.substring(17, 25)); // Right ascension of ascending node
    const eccentricity = parseFloat('0.' + line2.substring(26, 33));
    const argOfPerigee = parseFloat(line2.substring(34, 42)); // Argument of perigee
    const meanAnomaly = parseFloat(line2.substring(43, 51)); // Mean anomaly at epoch
    const meanMotion = parseFloat(line2.substring(52, 63)); // Revolutions per day

    // Calculate time since epoch in minutes
    const minutesSinceEpoch = (date.getTime() - epochDate.getTime()) / (1000 * 60);

    // Calculate current mean anomaly
    const currentMeanAnomaly = getMeanAnomaly(meanAnomaly, meanMotion, minutesSinceEpoch);

    // Convert mean anomaly to radians
    const M = (currentMeanAnomaly * Math.PI) / 180;

    // Solve Kepler's equation using Newton-Raphson (simplified)
    // E = M + e * sin(E) -> iterate to find eccentric anomaly E
    let E = M;
    for (let i = 0; i < 5; i++) {
      E = M + eccentricity * Math.sin(E);
    }

    // Calculate true anomaly from eccentric anomaly
    const cosE = Math.cos(E);
    const sinE = Math.sin(E);
    const k = Math.sqrt(1 - eccentricity * eccentricity);
    const nu = Math.atan2(k * sinE, cosE - eccentricity);

    // Calculate distance from Earth center (in Earth radii, where a = semi-major axis)
    // For simplicity, assume a = 1 + altitude/6371
    const r = (1 * (1 - eccentricity * eccentricity)) / (1 + eccentricity * Math.cos(nu));

    // Orbital coordinates
    const orbitX = r * Math.cos(nu);
    const orbitY = r * Math.sin(nu);

    // Convert to Earth-fixed coordinates using RAAN and argument of perigee
    const raanRad = (raan * Math.PI) / 180;
    const argPeriRad = (argOfPerigee * Math.PI) / 180;
    const inclRad = (inclination * Math.PI) / 180;

    const cosRaan = Math.cos(raanRad);
    const sinRaan = Math.sin(raanRad);
    const cosArg = Math.cos(argPeriRad);
    const sinArg = Math.sin(argPeriRad);
    const cosIncl = Math.cos(inclRad);
    const sinIncl = Math.sin(inclRad);

    // Perifocal to orbital plane
    const x = orbitX * (cosRaan * cosArg - sinRaan * sinArg * cosIncl) - orbitY * (cosRaan * sinArg + sinRaan * cosArg * cosIncl);
    const y = orbitX * (sinRaan * cosArg + cosRaan * sinArg * cosIncl) - orbitY * (sinRaan * sinArg - cosRaan * cosArg * cosIncl);
    const z = orbitX * sinArg * sinIncl + orbitY * cosArg * sinIncl;

    // Convert to lat/lng
    const lat = (Math.atan2(z, Math.sqrt(x * x + y * y)) * 180) / Math.PI;
    let lng = (Math.atan2(y, x) * 180) / Math.PI;

    // Account for Earth rotation (simplified)
    const earthRotationRate = 360 / (24 * 60); // degrees per minute
    lng -= earthRotationRate * minutesSinceEpoch;
    lng = ((lng + 180) % 360) - 180;

    // Altitude calculation (semi-major axis assumption for LEO ~6.6 Earth radii)
    const altitude = Math.max((r - 1) * 6371, 300);

    // Velocity approximation
    const velocity = Math.sqrt(398600 / (r * 6371)); // vis-viva equation, simplified

    return {
      name: tle.name.trim(),
      noradId,
      lat,
      lng,
      altitude,
      velocity,
    };
  } catch (error) {
    console.error(`Error calculating position for ${tle.name}:`, error);
    return null;
  }
};

export const calculateMultipleSatellitePositions = async (
  tles: TLELine[],
  date: Date = new Date()
): Promise<SatellitePosition[]> => {
  const positions = await Promise.all(
    tles.map((tle) => calculateSatellitePosition(tle, date))
  );
  return positions.filter((pos): pos is SatellitePosition => pos !== null);
};
