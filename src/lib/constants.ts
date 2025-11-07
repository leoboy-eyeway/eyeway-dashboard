/**
 * Application Constants
 * Centralized configuration values for the Eyeway Dashboard
 */

// Map Configuration
export const MAP_CONFIG = {
  // Iligan City center coordinates
  DEFAULT_CENTER: {
    lat: Number(import.meta.env.VITE_DEFAULT_CENTER_LAT) || 8.228,
    lng: Number(import.meta.env.VITE_DEFAULT_CENTER_LNG) || 124.2452,
  },
  DEFAULT_ZOOM: Number(import.meta.env.VITE_DEFAULT_ZOOM) || 15.5,
  DEFAULT_PITCH: 60,
  DEFAULT_BEARING: -20,
  TERRAIN_EXAGGERATION: 1.5,
} as const;

// Mapbox Configuration
export const MAPBOX_CONFIG = {
  TOKEN: import.meta.env.VITE_MAPBOX_TOKEN || '',
  STYLE: 'mapbox://styles/mapbox/light-v11',
  TERRAIN_SOURCE: 'mapbox://mapbox.mapbox-terrain-dem-v1',
  TILE_SIZE: 512,
  MAX_ZOOM: 14,
} as const;

// Severity Colors
export const SEVERITY_COLORS = {
  low: '#22c55e',
  medium: '#eab308',
  high: '#f97316',
  critical: '#ef4444',
} as const;

// Road Colors - Professional cartography standards for Philippines
// Based on international mapping conventions and road hierarchy
export const ROAD_COLORS = {
  // National Roads / Trunk Roads (N-Routes, AH Routes)
  // High visibility orange for primary national infrastructure
  NATIONAL: '#f97316',        // Orange - National Roads (e.g., N1, AH26)
  NATIONAL_NAME: 'National Road',

  // Major Highways / Motorways (Limited access highways)
  // Red for critical high-speed infrastructure
  HIGHWAY: '#ef4444',         // Red - Major Highways/Expressways
  HIGHWAY_NAME: 'Highway',

  // Primary Roads (Major provincial roads connecting cities)
  // Light orange for important regional connections
  PRIMARY: '#fb923c',         // Light Orange - Primary Roads
  PRIMARY_NAME: 'Primary Road',

  // Secondary Roads (Provincial roads, urban arterials)
  // Yellow/Amber for secondary importance
  SECONDARY: '#fbbf24',       // Amber - Secondary Roads
  SECONDARY_NAME: 'Secondary Road',

  // Tertiary Roads / Local Streets
  // Gray for local access roads
  TERTIARY: '#9ca3af',        // Gray - Tertiary/Local Roads
  TERTIARY_NAME: 'Local Street',

  // Minor Roads
  MINOR: '#d1d5db',           // Light Gray - Minor roads
  MINOR_NAME: 'Minor Road',
} as const;

// Road Widths for visual hierarchy
export const ROAD_WIDTHS = {
  NATIONAL: 4.5,    // Widest - most important
  HIGHWAY: 4,       // Very wide
  PRIMARY: 3.5,     // Wide
  SECONDARY: 2.5,   // Medium
  TERTIARY: 2,      // Normal
  MINOR: 1.5,       // Narrow
} as const;

// Map Feature IDs
export const MAP_LAYER_IDS = {
  BUILDINGS_3D: 'add-3d-buildings',
  ACCURACY_CIRCLE: 'accuracy-circle',
  ACCURACY_CIRCLE_LAYER: 'accuracy-circle-layer',
  DEM_SOURCE: 'mapbox-dem',
} as const;

// Camera Configuration for 3D Capture
export const CAMERA_CONFIG = {
  FACING_MODE: 'environment',
  IDEAL_WIDTH: 1920,
  IDEAL_HEIGHT: 1080,
  VIDEO_MIME_TYPE: 'video/webm;codecs=vp9',
} as const;

// Geolocation Options
export const GEOLOCATION_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 0,
} as const;

// API Configuration
export const API_CONFIG = {
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || '',
  SUPABASE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
  MAPBOX_GEOCODING_URL: 'https://api.mapbox.com/geocoding/v5/mapbox.places',
} as const;

// Application Metadata
export const APP_CONFIG = {
  NAME: import.meta.env.VITE_APP_NAME || 'Eyeway 2.0',
  DESCRIPTION: 'Advanced Pothole Detection & Management',
} as const;
