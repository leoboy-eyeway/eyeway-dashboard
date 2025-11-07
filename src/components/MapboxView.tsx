import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { Pothole } from '@/types';
import { MAPBOX_CONFIG, MAP_CONFIG, SEVERITY_COLORS, MAP_LAYER_IDS, ROAD_COLORS, ROAD_WIDTHS } from '@/lib/constants';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapboxViewProps {
  potholes: Pothole[];
  onSelectPothole: (pothole: Pothole) => void;
}

export interface MapboxViewRef {
  toggleViewMode: () => void;
  getCurrentMode: () => boolean;
  closePopup: () => void;
}

/**
 * Helper function to configure 3D terrain and buildings
 */
const configure3DMode = (map: mapboxgl.Map) => {
  // Add 3D terrain if not already present
  if (!map.getSource(MAP_LAYER_IDS.DEM_SOURCE)) {
    map.addSource(MAP_LAYER_IDS.DEM_SOURCE, {
      type: 'raster-dem',
      url: MAPBOX_CONFIG.TERRAIN_SOURCE,
      tileSize: MAPBOX_CONFIG.TILE_SIZE,
      maxzoom: MAPBOX_CONFIG.MAX_ZOOM,
    });
  }
  map.setTerrain({ source: MAP_LAYER_IDS.DEM_SOURCE, exaggeration: MAP_CONFIG.TERRAIN_EXAGGERATION });

  // Add 3D buildings if not already present
  if (!map.getLayer(MAP_LAYER_IDS.BUILDINGS_3D)) {
    const layers = map.getStyle().layers;
    const labelLayerId = layers?.find(
      (layer: any) => layer.type === 'symbol' && layer.layout && layer.layout['text-field']
    )?.id;

    map.addLayer(
      {
        id: MAP_LAYER_IDS.BUILDINGS_3D,
        source: 'composite',
        'source-layer': 'building',
        filter: ['==', 'extrude', 'true'],
        type: 'fill-extrusion',
        minzoom: 14,
        paint: {
          'fill-extrusion-color': '#aaa',
          'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ['zoom'],
            14,
            0,
            14.5,
            ['get', 'height'],
          ],
          'fill-extrusion-base': [
            'interpolate',
            ['linear'],
            ['zoom'],
            14,
            0,
            14.5,
            ['get', 'min_height'],
          ],
          'fill-extrusion-opacity': 0.6,
        },
      },
      labelLayerId
    );
  }

  // Add atmospheric fog
  map.setFog({
    range: [0.5, 10],
    color: '#ffffff',
    'horizon-blend': 0.1,
    'high-color': '#245bde',
    'space-color': '#000000',
    'star-intensity': 0.15,
  });
};

/**
 * Helper function to remove 3D features
 */
const remove3DMode = (map: mapboxgl.Map) => {
  // Remove terrain
  if (map.getTerrain()) {
    map.setTerrain(null);
  }

  // Remove 3D buildings layer
  if (map.getLayer(MAP_LAYER_IDS.BUILDINGS_3D)) {
    map.removeLayer(MAP_LAYER_IDS.BUILDINGS_3D);
  }

  // Remove fog
  map.setFog(null);
};

/**
 * Helper function to create marker element
 */
const createMarkerElement = (pothole: Pothole, onSelect: (pothole: Pothole) => void, onPopupCreate: (popup: mapboxgl.Popup) => void) => {
  const el = document.createElement('div');
  el.className = 'pothole-marker';
  el.style.cursor = 'pointer';

  const color = SEVERITY_COLORS[pothole.severity] || '#3b82f6';

  const dot = document.createElement('div');
  dot.style.cssText = `
    width: 12px;
    height: 12px;
    background-color: ${color};
    border-radius: 50%;
    border: 2px solid white;
    transition: transform 0.2s;
  `;

  el.appendChild(dot);

  el.addEventListener('mouseenter', () => {
    dot.style.transform = 'scale(1.3)';
  });

  el.addEventListener('mouseleave', () => {
    dot.style.transform = 'scale(1)';
  });

  el.addEventListener('click', (e) => {
    e.stopPropagation();
    onSelect(pothole);

    const popupContent = `
      <div class="p-4 min-w-[200px] pr-10">
        <div class="flex items-start justify-between mb-3 gap-3">
          <h3 class="font-bold text-lg text-gray-900 flex-1">Pothole #${pothole.id.slice(0, 8)}</h3>
          <div class="w-3 h-3 rounded-full flex-shrink-0 mt-1" style="background-color: ${color}; box-shadow: 0 0 8px ${color}80"></div>
        </div>
        <div>
          <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">Severity</div>
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full" style="background-color: ${color}"></div>
            <span class="font-semibold uppercase text-sm" style="color: ${color}">${pothole.severity}</span>
          </div>
        </div>
      </div>
    `;

    const popup = new mapboxgl.Popup({
      offset: 35,
      className: 'pothole-popup-enhanced',
      closeButton: true,
      closeOnClick: false,
      maxWidth: '320px',
    })
      .setLngLat([pothole.location.lng, pothole.location.lat])
      .setHTML(popupContent);

    onPopupCreate(popup);
  });

  return el;
};

export const MapboxView = forwardRef<MapboxViewRef, MapboxViewProps>(({ potholes, onSelectPothole }, ref) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isLegendExpanded, setIsLegendExpanded] = useState(false);
  const [is3DMode, setIs3DMode] = useState(true);

  // Memoized callback to handle popup creation
  const handlePopupCreate = useCallback((popup: mapboxgl.Popup) => {
    // Remove existing popup
    if (popupRef.current) {
      popupRef.current.remove();
    }
    popup.addTo(mapRef.current!);
    popupRef.current = popup;
  }, []);

  // Memoized toggle view mode function
  const toggleViewMode = useCallback(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;
    const newMode = !is3DMode;
    setIs3DMode(newMode);

    if (newMode) {
      // Switch to 3D mode
      map.setPitch(MAP_CONFIG.DEFAULT_PITCH);
      map.setBearing(0);
      configure3DMode(map);
    } else {
      // Switch to 2D mode
      map.setPitch(0);
      map.setBearing(0);
      remove3DMode(map);
    }
  }, [is3DMode]);

  useImperativeHandle(ref, () => ({
    toggleViewMode,
    getCurrentMode: () => is3DMode,
    closePopup: () => {
      if (popupRef.current) {
        popupRef.current.remove();
        popupRef.current = null;
      }
    },
  }), [toggleViewMode, is3DMode]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    mapboxgl.accessToken = MAPBOX_CONFIG.TOKEN;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: MAPBOX_CONFIG.STYLE,
      center: [MAP_CONFIG.DEFAULT_CENTER.lng, MAP_CONFIG.DEFAULT_CENTER.lat],
      zoom: MAP_CONFIG.DEFAULT_ZOOM,
      pitch: is3DMode ? MAP_CONFIG.DEFAULT_PITCH : 0,
      bearing: MAP_CONFIG.DEFAULT_BEARING,
      projection: is3DMode ? ({ name: 'globe' } as any) : undefined,
      attributionControl: true, // Keep attribution for legal compliance
    });

    mapRef.current = map;

    // Add scale control
    map.addControl(new mapboxgl.ScaleControl(), 'bottom-left');

    // Handle map load
    map.on('load', () => {
      setIsMapLoaded(true);

      // Configure map styling with professional road hierarchy
      const layers = map.getStyle().layers;
      layers.forEach((layer: any) => {
        // Hide business/commercial POI labels and water labels, but KEEP ROAD LABELS
        if (
          layer.id.includes('poi-label') ||
          layer.id.includes('place_label_business') ||
          layer.id.includes('place_label_commercial') ||
          layer.id.includes('water-label') ||
          layer.id.includes('waterway-label')
        ) {
          map.setLayoutProperty(layer.id, 'visibility', 'none');
        }

        // SHOW ROAD LABELS for National Roads and Major Roads
        if (
          layer.id.includes('road-label') ||
          (layer.id.includes('road') && layer.id.includes('label'))
        ) {
          // Show labels for major roads only (trunk, primary, secondary)
          if (
            layer.id.includes('trunk') ||
            layer.id.includes('primary') ||
            layer.id.includes('motorway')
          ) {
            map.setLayoutProperty(layer.id, 'visibility', 'visible');
            // Style road labels
            if (map.getLayoutProperty(layer.id, 'text-field')) {
              map.setPaintProperty(layer.id, 'text-color', '#1f2937'); // Dark gray
              map.setPaintProperty(layer.id, 'text-halo-color', '#ffffff'); // White halo
              map.setPaintProperty(layer.id, 'text-halo-width', 2);
            }
          } else {
            // Hide labels for minor roads to reduce clutter
            map.setLayoutProperty(layer.id, 'visibility', 'none');
          }
        }

        // NATIONAL ROADS / TRUNK ROADS (N-Routes, AH Routes)
        // These are the most important roads in the Philippines
        if (layer.id.includes('trunk') || layer.id.includes('road-trunk')) {
          if (layer.type === 'line') {
            map.setPaintProperty(layer.id, 'line-color', ROAD_COLORS.NATIONAL);
            map.setPaintProperty(layer.id, 'line-width', ROAD_WIDTHS.NATIONAL);
          }
        }

        // HIGHWAYS / MOTORWAYS (Expressways, SLEX, NLEX, etc.)
        if (layer.id.includes('motorway') || layer.id.includes('road-motorway')) {
          if (layer.type === 'line') {
            map.setPaintProperty(layer.id, 'line-color', ROAD_COLORS.HIGHWAY);
            map.setPaintProperty(layer.id, 'line-width', ROAD_WIDTHS.HIGHWAY);
          }
        }

        // PRIMARY ROADS (Major connecting roads)
        if (layer.id.includes('road-primary') || layer.id.includes('primary')) {
          if (layer.type === 'line') {
            map.setPaintProperty(layer.id, 'line-color', ROAD_COLORS.PRIMARY);
            map.setPaintProperty(layer.id, 'line-width', ROAD_WIDTHS.PRIMARY);
          }
        }

        // SECONDARY ROADS (Urban arterials, provincial roads)
        if (layer.id.includes('road-secondary') || layer.id.includes('secondary')) {
          if (layer.type === 'line') {
            map.setPaintProperty(layer.id, 'line-color', ROAD_COLORS.SECONDARY);
            map.setPaintProperty(layer.id, 'line-width', ROAD_WIDTHS.SECONDARY);
          }
        }

        // TERTIARY ROADS (Local collector roads)
        if (layer.id.includes('road-tertiary') || layer.id.includes('tertiary')) {
          if (layer.type === 'line') {
            map.setPaintProperty(layer.id, 'line-color', ROAD_COLORS.TERTIARY);
            map.setPaintProperty(layer.id, 'line-width', ROAD_WIDTHS.TERTIARY);
          }
        }

        // MINOR ROADS / STREETS (Local streets, residential)
        if (
          layer.id.includes('road-street') ||
          layer.id.includes('road-minor') ||
          layer.id.includes('road-local') ||
          (layer.id.includes('road') &&
           !layer.id.includes('trunk') &&
           !layer.id.includes('motorway') &&
           !layer.id.includes('primary') &&
           !layer.id.includes('secondary') &&
           !layer.id.includes('tertiary'))
        ) {
          if (layer.type === 'line') {
            map.setPaintProperty(layer.id, 'line-color', ROAD_COLORS.MINOR);
            map.setPaintProperty(layer.id, 'line-width', ROAD_WIDTHS.MINOR);
          }
        }

        // Water styling - light blue for blueprint effect
        if (layer.id.includes('water') && layer.type === 'fill') {
          map.setPaintProperty(layer.id, 'fill-color', '#dbeafe');
        }

        // Background - light blue-gray
        if (layer.id.includes('background')) {
          map.setPaintProperty(layer.id, 'background-color', '#f8fafc');
        }
      });

      // Add 3D features if in 3D mode
      if (is3DMode) {
        configure3DMode(map);
      }
    });

    return () => {
      map.remove();
    };
  }, [is3DMode]);

  // Optimized marker updates - only update changed markers
  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return;

    const currentPotholeIds = new Set(potholes.map(p => p.id));
    const existingMarkerIds = new Set(Object.keys(markersRef.current));

    // Remove markers for potholes that no longer exist
    existingMarkerIds.forEach(id => {
      if (!currentPotholeIds.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

    // Add or update markers
    potholes.forEach(pothole => {
      const existingMarker = markersRef.current[pothole.id];

      if (existingMarker) {
        // Update existing marker position if changed
        const currentLngLat = existingMarker.getLngLat();
        if (
          currentLngLat.lat !== pothole.location.lat ||
          currentLngLat.lng !== pothole.location.lng
        ) {
          existingMarker.setLngLat([pothole.location.lng, pothole.location.lat]);
        }
      } else {
        // Create new marker
        const el = createMarkerElement(pothole, onSelectPothole, handlePopupCreate);

        const marker = new mapboxgl.Marker({
          element: el,
          anchor: 'center',
          pitchAlignment: 'map',
          rotationAlignment: 'map',
        })
          .setLngLat([pothole.location.lng, pothole.location.lat])
          .addTo(mapRef.current!);

        markersRef.current[pothole.id] = marker;
      }
    });
  }, [potholes, isMapLoaded, onSelectPothole, handlePopupCreate]);

  return (
    <div className="fixed inset-0 z-0">
      <div ref={mapContainerRef} className="absolute inset-0" />

      {/* Pothole Severity Legend */}
      <div
        className="absolute bottom-8 right-4 bg-white/20 backdrop-blur-xl shadow-2xl border border-white/30 rounded-2xl z-[400] cursor-pointer transition-all duration-300 ease-in-out overflow-hidden"
        onMouseEnter={() => setIsLegendExpanded(true)}
        onMouseLeave={() => setIsLegendExpanded(false)}
      >
        {!isLegendExpanded ? (
          <div className="flex space-x-2 px-3 py-2">
            <div className="w-3 h-3 rounded-full border border-white shadow-sm" style={{ backgroundColor: SEVERITY_COLORS.low }} title="Low"></div>
            <div className="w-3 h-3 rounded-full border border-white shadow-sm" style={{ backgroundColor: SEVERITY_COLORS.medium }} title="Medium"></div>
            <div className="w-3 h-3 rounded-full border border-white shadow-sm" style={{ backgroundColor: SEVERITY_COLORS.high }} title="High"></div>
            <div className="w-3 h-3 rounded-full border border-white shadow-sm" style={{ backgroundColor: SEVERITY_COLORS.critical }} title="Critical"></div>
          </div>
        ) : (
          <div className="px-4 py-3">
            <div className="text-xs font-semibold mb-3">Pothole Severity</div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full border border-white" style={{ backgroundColor: SEVERITY_COLORS.low }}></div>
                <span className="text-xs">Low</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full border border-white" style={{ backgroundColor: SEVERITY_COLORS.medium }}></div>
                <span className="text-xs">Medium</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full border border-white" style={{ backgroundColor: SEVERITY_COLORS.high }}></div>
                <span className="text-xs">High</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full border border-white" style={{ backgroundColor: SEVERITY_COLORS.critical }}></div>
                <span className="text-xs">Critical</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Road Hierarchy Legend */}
      <div className="absolute bottom-8 left-4 bg-white/90 backdrop-blur-xl shadow-2xl border border-white/50 rounded-2xl z-[400] px-4 py-3 max-w-xs">
        <div className="text-xs font-bold mb-2 text-gray-900">Road Classification</div>
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2">
            <div className="h-1 w-8 rounded-full" style={{ backgroundColor: ROAD_COLORS.NATIONAL, height: '4.5px' }}></div>
            <span className="text-xs font-medium text-gray-700">{ROAD_COLORS.NATIONAL_NAME}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="h-1 w-8 rounded-full" style={{ backgroundColor: ROAD_COLORS.HIGHWAY, height: '4px' }}></div>
            <span className="text-xs text-gray-600">{ROAD_COLORS.HIGHWAY_NAME}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="h-1 w-8 rounded-full" style={{ backgroundColor: ROAD_COLORS.PRIMARY, height: '3.5px' }}></div>
            <span className="text-xs text-gray-600">{ROAD_COLORS.PRIMARY_NAME}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="h-1 w-8 rounded-full" style={{ backgroundColor: ROAD_COLORS.SECONDARY, height: '2.5px' }}></div>
            <span className="text-xs text-gray-600">{ROAD_COLORS.SECONDARY_NAME}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="h-1 w-8 rounded-full" style={{ backgroundColor: ROAD_COLORS.TERTIARY, height: '2px' }}></div>
            <span className="text-xs text-gray-500">{ROAD_COLORS.TERTIARY_NAME}</span>
          </div>
        </div>
      </div>

      {/* View Mode Toggle - Desktop */}
      <div className="absolute top-24 left-1/2 transform -translate-x-1/2 w-[calc(100%-2rem)] max-w-7xl z-[400] hidden md:block pointer-events-none">
        <div
          className="bg-blue-600 text-white px-5 py-2.5 rounded-full shadow-lg font-semibold text-sm cursor-pointer hover:bg-blue-700 transition-all active:scale-95 w-fit pointer-events-auto"
          onClick={toggleViewMode}
          title={`Click to switch to ${is3DMode ? '2D' : '3D'} mode`}
        >
          {is3DMode ? '3D Mode' : '2D Mode'}
        </div>
      </div>
    </div>
  );
});

MapboxView.displayName = 'MapboxView';

export default MapboxView;
