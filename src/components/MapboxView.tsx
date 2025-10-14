import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import mapboxgl from 'mapbox-gl';
import { Pothole } from '@/types';
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

export const MapboxView = forwardRef<MapboxViewRef, MapboxViewProps>(({ potholes, onSelectPothole }, ref) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isLegendExpanded, setIsLegendExpanded] = useState(false);
  const [is3DMode, setIs3DMode] = useState(true);

  useImperativeHandle(ref, () => ({
    toggleViewMode: () => {
      if (!mapRef.current) return;

      const map = mapRef.current;
      const newMode = !is3DMode;
      setIs3DMode(newMode);

      if (newMode) {
        // Switch to 3D mode
        map.setPitch(60);
        map.setBearing(0);

        // Add 3D terrain if not already present
        if (!map.getSource('mapbox-dem')) {
          map.addSource('mapbox-dem', {
            type: 'raster-dem',
            url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
            tileSize: 512,
            maxzoom: 14
          });
        }
        map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });

        // Add 3D buildings if not already present
        if (!map.getLayer('add-3d-buildings')) {
          const layers = map.getStyle().layers;
          const labelLayerId = layers?.find(
            (layer: any) => layer.type === 'symbol' && layer.layout && layer.layout['text-field']
          )?.id;

          map.addLayer(
            {
              id: 'add-3d-buildings',
              source: 'composite',
              'source-layer': 'building',
              filter: ['==', 'extrude', 'true'],
              type: 'fill-extrusion',
              minzoom: 15,
              paint: {
                'fill-extrusion-color': '#aaa',
                'fill-extrusion-height': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  15,
                  0,
                  15.05,
                  ['get', 'height']
                ],
                'fill-extrusion-base': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  15,
                  0,
                  15.05,
                  ['get', 'min_height']
                ],
                'fill-extrusion-opacity': 0.6
              }
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
          'star-intensity': 0.15
        });
      } else {
        // Switch to 2D mode
        map.setPitch(0);
        map.setBearing(0);

        // Remove terrain
        if (map.getTerrain()) {
          map.setTerrain(null);
        }

        // Remove 3D buildings layer
        if (map.getLayer('add-3d-buildings')) {
          map.removeLayer('add-3d-buildings');
        }

        // Remove fog
        map.setFog(null);
      }
    },
    getCurrentMode: () => is3DMode,
    closePopup: () => {
      if (popupRef.current) {
        popupRef.current.remove();
        popupRef.current = null;
      }
    }
  }));

  // Iligan City center coordinates
  const iliganCity = {
    lat: 8.228,
    lng: 124.2452
  };

  // Toggle between 2D and 3D modes
  const toggleViewMode = () => {
    if (!mapRef.current) return;

    const map = mapRef.current;
    const newMode = !is3DMode;
    setIs3DMode(newMode);

    if (newMode) {
      // Switch to 3D mode
      map.setPitch(60);
      map.setBearing(0);

      // Add 3D terrain if not already present
      if (!map.getSource('mapbox-dem')) {
        map.addSource('mapbox-dem', {
          type: 'raster-dem',
          url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
          tileSize: 512,
          maxzoom: 14
        });
      }
      map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });

      // Add 3D buildings if not already present
      if (!map.getLayer('add-3d-buildings')) {
        const layers = map.getStyle().layers;
        const labelLayerId = layers?.find(
          (layer: any) => layer.type === 'symbol' && layer.layout && layer.layout['text-field']
        )?.id;

        map.addLayer(
          {
            id: 'add-3d-buildings',
            source: 'composite',
            'source-layer': 'building',
            filter: ['==', 'extrude', 'true'],
            type: 'fill-extrusion',
            minzoom: 15,
            paint: {
              'fill-extrusion-color': '#aaa',
              'fill-extrusion-height': [
                'interpolate',
                ['linear'],
                ['zoom'],
                15,
                0,
                15.05,
                ['get', 'height']
              ],
              'fill-extrusion-base': [
                'interpolate',
                ['linear'],
                ['zoom'],
                15,
                0,
                15.05,
                ['get', 'min_height']
              ],
              'fill-extrusion-opacity': 0.6
            }
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
        'star-intensity': 0.15
      });
    } else {
      // Switch to 2D mode
      map.setPitch(0);
      map.setBearing(0);

      // Remove terrain
      if (map.getTerrain()) {
        map.setTerrain(null);
      }

      // Remove 3D buildings layer
      if (map.getLayer('add-3d-buildings')) {
        map.removeLayer('add-3d-buildings');
      }

      // Remove fog
      map.setFog(null);
    }
  };

  const MAPBOX_TOKEN = 'pk.eyJ1IjoibGVvYm95MTQiLCJhIjoiY21nb3d5M2VoMjRtbzJscTI3MnQ2Mnh4aiJ9.sqwaGRi4rx40uestYAB_Xg';

  const severityColors = {
    'low': '#22c55e',
    'medium': '#eab308',
    'high': '#f97316',
    'critical': '#ef4444'
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    // Initialize map with blueprint style
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [iliganCity.lng, iliganCity.lat],
      zoom: 15.5,
      pitch: is3DMode ? 60 : 0,
      bearing: -20,
      projection: is3DMode ? ({ name: 'globe' } as any) : undefined,
      attributionControl: false
    });

    mapRef.current = map;

    // Add scale control
    map.addControl(new mapboxgl.ScaleControl(), 'bottom-left');

    // Handle map load
    map.on('load', () => {
      setIsMapLoaded(true);

      // Hide business/commercial POI labels, road names, and water body names
      const layers = map.getStyle().layers;
      layers.forEach((layer: any) => {
        // Hide business/commercial place labels, road names, and water body names
        if (layer.id.includes('poi-label') ||
            layer.id.includes('place_label_business') ||
            layer.id.includes('place_label_commercial') ||
            layer.id.includes('place_label_commerce') ||
            layer.id.includes('business') ||
            layer.id.includes('commercial') ||
            layer.id.includes('road-label') ||
            (layer.id.includes('road') && layer.id.includes('label')) ||
            layer.id.includes('water-label') ||
            layer.id.includes('waterway-label') ||
            (layer.id.includes('water') && layer.id.includes('label'))) {
          map.setLayoutProperty(layer.id, 'visibility', 'none');
        }

        // Blueprint styling - make roads darker for better visibility
        if (layer.id.includes('road-highway') ||
            layer.id.includes('highway') ||
            layer.id.includes('motorway')) {
          if (layer.type === 'line') {
            map.setPaintProperty(layer.id, 'line-color', '#d1d5db'); // Darker gray for highways
            map.setPaintProperty(layer.id, 'line-width', 3); // Thicker highways
          }
        }

        // Make other roads darker gray
        if ((layer.id.includes('road') && !layer.id.includes('highway') && !layer.id.includes('motorway')) ||
            layer.id.includes('street') ||
            layer.id.includes('primary') ||
            layer.id.includes('secondary') ||
            layer.id.includes('tertiary')) {
          if (layer.type === 'line') {
            map.setPaintProperty(layer.id, 'line-color', '#9ca3af'); // Darker gray for roads
          }
        }

        // Make water bodies light blue for blueprint effect
        if (layer.id.includes('water') && layer.type === 'fill') {
          map.setPaintProperty(layer.id, 'fill-color', '#dbeafe'); // Light blue
        }

        // Make background more blueprint-like (light blue-gray)
        if (layer.id.includes('background')) {
          map.setPaintProperty(layer.id, 'background-color', '#f8fafc'); // Very light blue-gray
        }
      });

      // Add 3D features only if in 3D mode
      if (is3DMode) {
        // Add 3D terrain
        map.addSource('mapbox-dem', {
          type: 'raster-dem',
          url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
          tileSize: 512,
          maxzoom: 14
        });

        map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });

        // Add 3D buildings layer
        const layers = map.getStyle().layers;
        const labelLayerId = layers?.find(
          (layer: any) => layer.type === 'symbol' && layer.layout && layer.layout['text-field']
        )?.id;

        map.addLayer(
          {
            id: 'add-3d-buildings',
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
                ['get', 'height']
              ],
              'fill-extrusion-base': [
                'interpolate',
                ['linear'],
                ['zoom'],
                14,
                0,
                14.5,
                ['get', 'min_height']
              ],
              'fill-extrusion-opacity': 0.6
            }
          },
          labelLayerId
        );

        // Add atmospheric styling for better 3D effect
        map.setFog({
          range: [0.5, 10],
          color: '#ffffff',
          'horizon-blend': 0.1,
          'high-color': '#245bde',
          'space-color': '#000000',
          'star-intensity': 0.15
        });
      }
    });

    return () => {
      map.remove();
    };
  }, []);

  // Update markers when potholes change
  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return;

    // Clear existing markers
    Object.values(markersRef.current).forEach(marker => marker.remove());
    markersRef.current = {};

    // Add markers for potholes with road-embedded style
    potholes.forEach(pothole => {
      // Create the marker container
      const el = document.createElement('div');
      el.className = 'pothole-marker';
      el.style.cursor = 'pointer';

      // Create simple dot
      const color = severityColors[pothole.severity] || '#3b82f6';

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
        onSelectPothole(pothole);

        // Remove existing popup
        if (popupRef.current) {
          popupRef.current.remove();
        }

        // Create popup content with simple styling
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

        // Create and show popup with improved styling
        const popup = new mapboxgl.Popup({
          offset: 35,
          className: 'pothole-popup-enhanced',
          closeButton: true,
          closeOnClick: false,
          maxWidth: '320px'
        })
          .setLngLat([pothole.location.lng, pothole.location.lat])
          .setHTML(popupContent)
          .addTo(mapRef.current!);

        popupRef.current = popup;
      });

      // Create marker with custom element, centered on road surface
      const marker = new mapboxgl.Marker({
        element: el,
        anchor: 'center',  // Center anchor so it sits flat on the road
        pitchAlignment: 'map',  // Align with map to follow terrain
        rotationAlignment: 'map'  // Rotate with map to align with surface
      })
        .setLngLat([pothole.location.lng, pothole.location.lat])
        .addTo(mapRef.current!);

      markersRef.current[pothole.id] = marker;
    });
  }, [potholes, isMapLoaded, onSelectPothole]);

  return (
    <div className="fixed inset-0 z-0">
      <div ref={mapContainerRef} className="absolute inset-0" />

      {/* Map Legend */}
      <div
        className="absolute bottom-8 right-4 bg-white/20 backdrop-blur-xl shadow-2xl border border-white/30 rounded-2xl z-[400] cursor-pointer transition-all duration-300 ease-in-out overflow-hidden"
        onMouseEnter={() => setIsLegendExpanded(true)}
        onMouseLeave={() => setIsLegendExpanded(false)}
      >
        {!isLegendExpanded ? (
          <div className="flex space-x-2 px-3 py-2">
            <div className="w-3 h-3 rounded-full border border-white shadow-sm" style={{ backgroundColor: severityColors.low }} title="Low"></div>
            <div className="w-3 h-3 rounded-full border border-white shadow-sm" style={{ backgroundColor: severityColors.medium }} title="Medium"></div>
            <div className="w-3 h-3 rounded-full border border-white shadow-sm" style={{ backgroundColor: severityColors.high }} title="High"></div>
            <div className="w-3 h-3 rounded-full border border-white shadow-sm" style={{ backgroundColor: severityColors.critical }} title="Critical"></div>
          </div>
        ) : (
          <div className="px-4 py-3">
            <div className="text-xs font-semibold mb-3">Severity Legend</div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full border border-white" style={{ backgroundColor: severityColors.low }}></div>
                <span className="text-xs">Low</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full border border-white" style={{ backgroundColor: severityColors.medium }}></div>
                <span className="text-xs">Medium</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full border border-white" style={{ backgroundColor: severityColors.high }}></div>
                <span className="text-xs">High</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full border border-white" style={{ backgroundColor: severityColors.critical }}></div>
                <span className="text-xs">Critical</span>
              </div>
            </div>
          </div>
        )}
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
