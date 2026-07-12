import React from 'react';
import { GPSButton } from './GPSButton';

interface FloatingButtonsProps {
  routeController: any;
}

export const FloatingButtons: React.FC<FloatingButtonsProps> = ({
  routeController,
}) => {
  return (
    <GPSButton
      onGetCurrentLocation={() => routeController.handleGetCurrentLocation(true)}
    />
  );
};