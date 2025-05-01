
import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pothole } from '@/types';
import { useToast } from '@/hooks/use-toast';

// This is a mock component since we can't use actual mapbox in this environment
// In a real application, you would use mapbox-gl or similar library
interface MapViewProps {
  potholes: Pothole[];
  onSelectPothole: (pothole: Pothole) => void;
}

export const MapView = ({ potholes, onSelectPothole }: MapViewProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapToken, setMapToken] = useState<string>('');
  const [showTokenInput, setShowTokenInput] = useState(true);
  const { toast } = useToast();

  // This would initialize the map in a real application
  useEffect(() => {
    if (!mapToken) return;
    
    console.log('Initializing map with token:', mapToken);
    // In a real app, we would initialize Mapbox here
    
    toast({
      title: "Map initialized",
      description: "The map is now ready to use.",
    });
    
    setShowTokenInput(false);
  }, [mapToken, toast]);

  const handleTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const input = (e.target as HTMLFormElement).token.value;
    if (!input) {
      toast({
        variant: "destructive",
        title: "Token required",
        description: "Please enter a Mapbox token to initialize the map.",
      });
      return;
    }
    setMapToken(input);
  };

  const getSeverityColor = (severity: Pothole['severity']) => {
    switch (severity) {
      case 'low': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'high': return 'bg-orange-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardContent className="p-0">
        {showTokenInput ? (
          <div className="flex flex-col items-center justify-center p-8 space-y-4 min-h-[400px]">
            <h3 className="text-lg font-semibold">Map Initialization Required</h3>
            <p className="text-sm text-gray-600 max-w-md text-center">
              To display the interactive map, please enter your Mapbox public token.
              You can get one by signing up at mapbox.com.
            </p>
            <form onSubmit={handleTokenSubmit} className="w-full max-w-md space-y-3">
              <input 
                type="text"
                name="token"
                placeholder="Enter your Mapbox public token"
                className="w-full p-2 border border-gray-300 rounded-md"
              />
              <Button 
                type="submit" 
                className="w-full bg-pothole-500 hover:bg-pothole-600 text-white"
              >
                Initialize Map
              </Button>
            </form>
          </div>
        ) : (
          <div className="relative w-full h-[600px] bg-gray-100 rounded-b-lg">
            {/* This would be the actual map in a real application */}
            <div ref={mapContainerRef} className="absolute inset-0 bg-gray-200">
              {/* Mock map UI */}
              <div className="w-full h-full bg-[url('/placeholder.svg')] bg-cover bg-center opacity-70">
                {/* Simulated pothole markers */}
                <div className="absolute inset-0 p-4">
                  <div className="relative w-full h-full">
                    {potholes.map((pothole, index) => {
                      // Create pseudo-random positions for demonstration
                      const left = `${(pothole.location.lat * 10) % 90}%`;
                      const top = `${(pothole.location.lng * 10) % 90}%`;
                      
                      return (
                        <button
                          key={pothole.id}
                          className={`absolute w-4 h-4 rounded-full ${getSeverityColor(pothole.severity)} border-2 border-white shadow-md transform -translate-x-1/2 -translate-y-1/2 hover:scale-150 transition-transform z-10`}
                          style={{ left, top }}
                          onClick={() => onSelectPothole(pothole)}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
              
              {/* Map Controls */}
              <div className="absolute top-4 right-4 flex flex-col space-y-2">
                <Button size="icon" variant="secondary" className="w-8 h-8 rounded-full">+</Button>
                <Button size="icon" variant="secondary" className="w-8 h-8 rounded-full">-</Button>
              </div>
              
              {/* Map Legend */}
              <div className="absolute bottom-4 right-4 bg-white p-3 rounded-md shadow-md">
                <div className="text-xs font-medium mb-2">Severity</div>
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-xs">Low</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span className="text-xs">Medium</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                    <span className="text-xs">High</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-xs">Critical</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MapView;
