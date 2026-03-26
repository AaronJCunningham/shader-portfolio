import React from 'react';
import { SatellitePosition } from '@/utils/orbitCalculator';

interface SatelliteInfoPanelProps {
  satellite: SatellitePosition | null;
  visible: boolean;
  x: number;
  y: number;
}

const SatelliteInfoPanel: React.FC<SatelliteInfoPanelProps> = ({ satellite, visible, x, y }) => {
  if (!visible || !satellite) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: `${x + 10}px`,
        top: `${y + 10}px`,
        background: 'rgba(0, 20, 60, 0.95)',
        border: '1px solid #00d4ff',
        borderRadius: '8px',
        padding: '12px 16px',
        color: '#00d4ff',
        fontFamily: 'monospace',
        fontSize: '12px',
        zIndex: 1000,
        pointerEvents: 'none',
        boxShadow: '0 0 20px rgba(0, 212, 255, 0.3)',
      }}
    >
      <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>
        {satellite.name}
      </div>
      <div>NORAD ID: {satellite.noradId}</div>
      <div>Latitude: {satellite.lat.toFixed(2)}°</div>
      <div>Longitude: {satellite.lng.toFixed(2)}°</div>
      <div>Altitude: {satellite.altitude.toFixed(0)} km</div>
      <div>Velocity: {satellite.velocity.toFixed(2)} km/s</div>
    </div>
  );
};

export default SatelliteInfoPanel;
