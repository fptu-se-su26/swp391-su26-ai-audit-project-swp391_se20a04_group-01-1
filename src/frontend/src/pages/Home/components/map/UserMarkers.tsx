import React from 'react';
import { Marker } from 'react-map-gl/mapbox';

interface UserMarkersProps {
  userLocation: { lat: number; lng: number } | null;
  origin: { lat: number; lng: number } | null;
  destination: { lat: number; lng: number } | null;
  pendingDestination: { lat: number; lng: number } | null;
}

export const UserMarkers: React.FC<UserMarkersProps> = ({ userLocation, origin, destination, pendingDestination }) => {
  return (
    <>
      {userLocation && (
        <Marker longitude={userLocation.lng} latitude={userLocation.lat} anchor="center">
          <div className="w-4 h-4 bg-blue-600 border-2 border-white rounded-full shadow-lg animate-pulse" />
        </Marker>
      )}

      {origin && userLocation && (origin.lng !== userLocation.lng || origin.lat !== userLocation.lat) && (
        <Marker longitude={origin.lng} latitude={origin.lat} anchor="center">
          <div className="w-4.5 h-4.5 bg-emerald-600 border-2 border-white rounded-full shadow-lg" />
        </Marker>
      )}

      {destination && (
        <Marker longitude={destination.lng} latitude={destination.lat} anchor="bottom">
          <div className="relative w-[36px] h-[42px] flex flex-col items-center justify-end cursor-pointer group">
            <svg width="36" height="42" viewBox="0 0 36 42" fill="none" xmlns="http://www.w3.org/2000/svg" className="filter drop-shadow-md transition-transform duration-200 group-hover:scale-110">
              <ellipse cx="18" cy="38" rx="8" ry="2.5" fill="#64748b" opacity="0.4" />
              <path d="M18 0C8.06 0 0 8.06 0 18C0 27.5 18 40 18 40C18 40 36 27.5 36 18C36 8.06 27.94 0 18 0Z" fill="#EF4444" />
              <circle cx="18" cy="16" r="5" fill="#991B1B" />
            </svg>
          </div>
        </Marker>
      )}

      {pendingDestination && (
        <Marker longitude={pendingDestination.lng} latitude={pendingDestination.lat} anchor="bottom">
          <div className="relative w-[36px] h-[42px] flex flex-col items-center justify-end cursor-pointer animate-bounce">
            <svg width="36" height="42" viewBox="0 0 36 42" fill="none" xmlns="http://www.w3.org/2000/svg" className="filter drop-shadow-md">
              <ellipse cx="18" cy="38" rx="8" ry="2.5" fill="#64748b" opacity="0.4" />
              <path d="M18 0C8.059 0 0 8.059 0 18c0 13.5 18 24 18 24s18-10.5 18-24C36 8.059 27.941 0 18 0z" fill="#ef4444" />
              <circle cx="18" cy="18" r="8" fill="white" />
            </svg>
          </div>
        </Marker>
      )}
    </>
  );
};