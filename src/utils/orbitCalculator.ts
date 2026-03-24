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

const parseTLEEpoch = (epochStr: string): Date => {
  const year = parseInt(epochStr.substring(0, 2));
  const dayOfYear = parseFloat(epochStr.substring(2));
  
  const fullYear = year < 57 ? 2000 + year : 1900 + year;
  
  const date = new Date(fullYear, 0, 1);
  date.setTime(date.getTime() + (dayOfYear - 1) * 24 * 60 * 60 * 1000);
  
  return date;
};

/**
 * Calculate Kepler orbital elements from TLE mean motion
 * Mean motion (n) is in revolutions per day
 * Semi-major axis a = (GM/n^2)^(1/3) where GM = 398600.4418 km^3/s^2
 */
const calculateSemiMajorAxis = (meanMotionRevsPerDay: number): number => {
  const GMkm3s2 = 398600.4418;
  const n = meanMotionRevsPerDay * (2 * Math.PI) / 86400; // Convert to rad/s
  const a = Math.pow(GMkm3s2 / (n * n), 1/3);
  return a;
};

export const calculateSatellitePosition = async (
  tle: TLELine,
  date: Date = new Date()
): Promise<SatellitePosition | null> => {
  try {
    const line1 = tle.line1;
    const line2 = tle.line2;

    const noradIdMatch = line1.match(/1\s+(\d+)/);
    const noradId = noradIdMatch ? noradIdMatch[1] : 'unknown';

    const epochStr = line1.substring(18, 32);
    const epochDate = parseTLEEpoch(epochStr);

    // Parse orbital elements
    const inclination = parseFloat(line2.substring(8, 16));
    const raan = parseFloat(line2.substring(17, 25));
    const eccentricity = parseFloat('0.' + line2.substring(26, 33));
    const argOfPerigee = parseFloat(line2.substring(34, 42));
    const meanAnomaly = parseFloat(line2.substring(43, 51));
    const meanMotion = parseFloat(line2.substring(52, 63)); // revolutions per day

    // Calculate semi-major axis in km
    const semiMajorAxis = calculateSemiMajorAxis(meanMotion);

    // Time since epoch in minutes
    const minutesSinceEpoch = (date.getTime() - epochDate.getTime()) / (1000 * 60);

    // Current mean anomaly (revolutions per day -> degrees per minute)
    const degreesPerMinute = meanMotion * 360; // 360 degrees per revolution
    const currentMeanAnomaly = (meanAnomaly + degreesPerMinute * minutesSinceEpoch) % 360;
    const M = (currentMeanAnomaly * Math.PI) / 180;

    // Solve Kepler's equation: E = M + e*sin(E)
    let E = M;
    for (let i = 0; i < 10; i++) {
      E = M + eccentricity * Math.sin(E);
    }

    // True anomaly
    const cosE = Math.cos(E);
    const sinE = Math.sin(E);
    const nu = Math.atan2(
      Math.sqrt(1 - eccentricity * eccentricity) * sinE,
      cosE - eccentricity
    );

    // Distance from Earth center in km
    const r = (semiMajorAxis * (1 - eccentricity * eccentricity)) / 
              (1 + eccentricity * Math.cos(nu));

    // Orbital coordinates (perifocal)
    const rcos = r * Math.cos(nu);
    const rsin = r * Math.sin(nu);

    // Rotation matrices
    const raanRad = (raan * Math.PI) / 180;
    const argPeriRad = (argOfPerigee * Math.PI) / 180;
    const inclRad = (inclination * Math.PI) / 180;

    const cosRaan = Math.cos(raanRad);
    const sinRaan = Math.sin(raanRad);
    const cosArg = Math.cos(argPeriRad);
    const sinArg = Math.sin(argPeriRad);
    const cosIncl = Math.cos(inclRad);
    const sinIncl = Math.sin(inclRad);

    // Transform to ECI coordinates
    const x = rcos * (cosRaan * cosArg - sinRaan * sinArg * cosIncl) 
            - rsin * (cosRaan * sinArg + sinRaan * cosArg * cosIncl);
    const y = rcos * (sinRaan * cosArg + cosRaan * sinArg * cosIncl) 
            - rsin * (sinRaan * sinArg - cosRaan * cosArg * cosIncl);
    const z = rcos * sinArg * sinIncl + rsin * cosArg * sinIncl;

    // Convert to lat/lng/altitude
    const earthRadius = 6371; // km
    const lat = (Math.asin(z / r) * 180) / Math.PI;
    let lng = (Math.atan2(y, x) * 180) / Math.PI;

    // Account for Earth rotation (15 degrees/hour = 0.25 degrees/minute)
    const earthRotation = 0.25 * minutesSinceEpoch;
    lng = lng - earthRotation;
    lng = ((lng + 180) % 360) - 180;

    // Altitude above Earth surface
    const altitude = Math.max(r - earthRadius, 200);

    // Velocity (vis-viva equation: v = sqrt(GM * (2/r - 1/a)))
    const GM = 398600.4418;
    const velocity = Math.sqrt(GM * (2 / r - 1 / semiMajorAxis));

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
