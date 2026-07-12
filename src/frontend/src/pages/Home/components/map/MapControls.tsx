import React from 'react';
import { NavigationControl } from 'react-map-gl/mapbox';

export const MapControls: React.FC = () => {
  return <NavigationControl position="bottom-right" showCompass={true} />;
};