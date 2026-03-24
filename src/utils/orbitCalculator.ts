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

export const calculateSatellitePosition = async (
  tle: TLELine,
  date: Date = new Date()
): Promise<SatellitePosition | null> => {
  try {
    const line1 = tle.line1;
    const line2 = tle.line2;

    const noradIdMatch = line1.match(/1\s+(\d+)/);
    const noradId = noradIdMatch ? noradIdMatch[1] : 'unknown';

    const inclination = parseFloat(line2.substring(8, 16));
    const raan = parseFloat(line2.substring(17, 25));
    const meanAnomaly = parseFloat(line2.substring(43, 51));
    const meanMotion = parseFloat(line2.substring(52, 63));

    const epochStr = line1.substring(18, 20);
    const epochYear = parseInt(epochStr) + (parseInt(epochStr) < 70 ? 2000 : 1900);
    const epochDayOfYear = parseFloat(line1.substring(20, 32));
    
    const epochDate = new Date(epochYear, 0, 1);
    epochDate.setDate(epochDate.getDate() + epochDayOfYear);

    const daysSinceEpoch = (date.getTime() - epochDate.getTime()) / (24 * 60 * 60 * 1000);
    const orbitAngle = (meanAnomaly + meanMotion * daysSinceEpoch * 360) % 360;

    const lat = Math.sin((inclination * Math.PI) / 180) * Math.sin((orbitAngle * Math.PI) / 180) * 90;
    const lng = (orbitAngle + raan) % 360 - 180;

    const altitude = 400 + Math.random() * 200;
    const velocity = 7.7;

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
