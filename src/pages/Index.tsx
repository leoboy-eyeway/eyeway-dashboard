
import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import PotholeFilters from '@/components/PotholeFilters';
import MapView from '@/components/MapView';
import PotholeDetails from '@/components/PotholeDetails';
import DataVisualization from '@/components/DataVisualization';
import DocumentManagement from '@/components/DocumentManagement';
import { Pothole, Status, Severity, GaussianSplattingData } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { X } from "lucide-react";
import { useIsMobile } from '@/hooks/use-mobile';

const Index = () => {
  const [potholes, setPotholes] = useState<Pothole[]>([]);
  const [filteredPotholes, setFilteredPotholes] = useState<Pothole[]>([]);
  const [selectedPothole, setSelectedPothole] = useState<Pothole | null>(null);
  const [severityFilter, setSeverityFilter] = useState<Severity | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [activePanel, setActivePanel] = useState<'filters' | 'data' | 'documents' | null>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Fetch potholes from Supabase
  useEffect(() => {
    const fetchPotholes = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('potholes')
          .select('*');

        if (error) {
          throw error;
        }

        if (data) {
          // Transform Supabase data to match our Pothole type
          const transformedData: Pothole[] = data.map(item => {
            // Parse lidarData as our LidarData type
            let parsedLidarData: GaussianSplattingData | undefined = undefined;
            
            if (item.lidar_data) {
              const lidarJson = item.lidar_data as any;
              
              parsedLidarData = {
                pointCloud: lidarJson.pointCloud ? {
                  density: Number(lidarJson.pointCloud.density),
                  points: Number(lidarJson.pointCloud.points),
                  accuracy: Number(lidarJson.pointCloud.accuracy)
                } : undefined,
                surface: lidarJson.surface ? {
                  depth: Number(lidarJson.surface.depth),
                  width: Number(lidarJson.surface.width),
                  area: Number(lidarJson.surface.area)
                } : undefined,
                classification: lidarJson.classification ? {
                  confidence: Number(lidarJson.classification.confidence),
                  model: String(lidarJson.classification.model),
                  scan_date: String(lidarJson.classification.scan_date)
                } : undefined
              };
            }
            
            return {
              id: item.id,
              location: {
                lat: Number(item.latitude),
                lng: Number(item.longitude),
                address: `Road ID: ${item.road_id}`
              },
              severity: item.severity as Severity,
              status: item.status as Status,
              detectionAccuracy: item.detection_accuracy / 100,
              reportDate: item.report_date,
              scheduledRepairDate: item.scheduled_repair_date || undefined,
              completionDate: item.completion_date || undefined,
              images: item.image_url ? [item.image_url] : [],
              description: item.description || undefined,
              reportedBy: item.reported_by || undefined,
              lidarData: parsedLidarData
            };
          });

          setPotholes(transformedData);
          console.log("Fetched potholes:", transformedData);
        }
      } catch (error) {
        console.error('Error fetching potholes:', error);
        toast({
          variant: "destructive",
          title: "Error fetching potholes",
          description: "Could not load potholes data. Please try again later."
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchPotholes();
  }, [toast]);

  useEffect(() => {
    // Apply filters
    let filtered = [...potholes];
    
    if (severityFilter !== 'all') {
      filtered = filtered.filter((p) => p.severity === severityFilter);
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter((p) => p.status === statusFilter);
    }
    
    setFilteredPotholes(filtered);
  }, [potholes, severityFilter, statusFilter]);

  const handleSelectPothole = (pothole: Pothole) => {
    setSelectedPothole(pothole);
  };

  const handleUpdatePotholeStatus = async (id: string, newStatus: Status) => {
    try {
      // Update in Supabase
      const updateData: any = { 
        status: newStatus 
      };
      
      // Add dates based on status
      if (newStatus === 'scheduled') {
        updateData.scheduled_repair_date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      } else if (newStatus === 'completed') {
        updateData.completion_date = new Date().toISOString();
      }

      const { error } = await supabase
        .from('potholes')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      // Update local state
      setPotholes(prev => 
        prev.map(p => 
          p.id === id 
            ? {
                ...p,
                status: newStatus,
                scheduledRepairDate: newStatus === 'scheduled' 
                  ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
                  : p.scheduledRepairDate,
                completionDate: newStatus === 'completed'
                  ? new Date().toISOString()
                  : p.completionDate
              }
            : p
        )
      );
      
      toast({
        title: "Status updated",
        description: `Pothole #${id} is now ${newStatus.replace('-', ' ')}.`,
      });
      
      // Update selected pothole if it's the one being modified
      setSelectedPothole(prev => 
        prev && prev.id === id 
          ? {
              ...prev,
              status: newStatus,
              scheduledRepairDate: newStatus === 'scheduled' 
                ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
                : prev.scheduledRepairDate,
              completionDate: newStatus === 'completed'
                ? new Date().toISOString()
                : prev.completionDate
            }
          : prev
      );
    } catch (error) {
      console.error('Error updating pothole status:', error);
      toast({
        variant: "destructive",
        title: "Update failed",
        description: "Could not update the pothole status. Please try again.",
      });
    }
  };

  const handleClearFilters = () => {
    setSeverityFilter('all');
    setStatusFilter('all');
  };

  const togglePanel = (panel: 'filters' | 'data' | 'documents') => {
    setActivePanel(activePanel === panel ? null : panel);
  };

  return (
    <div className="min-h-screen relative">
      {/* Fullscreen Map */}
      {isLoading ? (
        <div className="fixed inset-0 flex items-center justify-center bg-white z-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pothole-500"></div>
        </div>
      ) : (
        <MapView 
          potholes={filteredPotholes} 
          onSelectPothole={handleSelectPothole} 
        />
      )}
      
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-20 bg-white bg-opacity-95 shadow-md">
        <Header />
        
        {/* Control Buttons */}
        <div className="container mx-auto px-4 py-2 flex flex-wrap gap-2">
          <button 
            onClick={() => togglePanel('filters')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${activePanel === 'filters' ? 'bg-pothole-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
          >
            Filters
          </button>
          <button 
            onClick={() => togglePanel('data')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${activePanel === 'data' ? 'bg-pothole-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
          >
            Data Analysis
          </button>
          <button 
            onClick={() => togglePanel('documents')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${activePanel === 'documents' ? 'bg-pothole-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
          >
            Documents
          </button>
        </div>
      </div>
      
      {/* Floating Pothole Details Panel */}
      {selectedPothole && (
        <div className={`fixed ${isMobile ? 'bottom-16 left-4 right-4 top-auto z-30' : 'top-32 right-4 z-20 w-80'} max-h-[calc(100vh-140px)] overflow-auto`}>
          <PotholeDetails 
            pothole={selectedPothole} 
            onClose={() => setSelectedPothole(null)}
            onUpdateStatus={handleUpdatePotholeStatus}
          />
        </div>
      )}
      
      {/* Floating Panels */}
      {activePanel === 'filters' && (
        <div className={`fixed ${isMobile ? 'top-28 left-4 right-4' : 'top-32 left-4 w-80'} z-20 bg-white rounded-lg shadow-lg border border-gray-200`}>
          <div className="relative p-4">
            <button 
              onClick={() => setActivePanel(null)}
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-200"
              aria-label="Close panel"
            >
              <X size={18} />
            </button>
            <PotholeFilters 
              severity={severityFilter}
              status={statusFilter}
              onSeverityChange={setSeverityFilter}
              onStatusChange={setStatusFilter}
              onClearFilters={handleClearFilters}
              totalPotholes={potholes.length}
              filteredCount={filteredPotholes.length}
            />
          </div>
        </div>
      )}
      
      {activePanel === 'data' && (
        <div className={`fixed ${isMobile ? 'top-28 left-4 right-4' : 'top-32 left-4 w-[calc(100%-2rem)] max-w-3xl'} z-20 max-h-[calc(100vh-140px)] overflow-auto bg-white rounded-lg shadow-lg border border-gray-200`}>
          <div className="relative p-4">
            <button 
              onClick={() => setActivePanel(null)}
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-200"
              aria-label="Close panel"
            >
              <X size={18} />
            </button>
            <DataVisualization potholes={potholes} />
          </div>
        </div>
      )}
      
      {activePanel === 'documents' && (
        <div className={`fixed ${isMobile ? 'top-28 left-4 right-4' : 'top-32 left-4 w-[calc(100%-2rem)] max-w-3xl'} z-20 max-h-[calc(100vh-140px)] overflow-auto bg-white rounded-lg shadow-lg border border-gray-200`}>
          <div className="relative p-4">
            <button 
              onClick={() => setActivePanel(null)}
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-200"
              aria-label="Close panel"
            >
              <X size={18} />
            </button>
            <DocumentManagement />
          </div>
        </div>
      )}
      
      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white bg-opacity-95 border-t border-gray-200 py-2 z-20">
        <div className="container mx-auto px-4 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} Eyeway 2.0. All rights reserved.
        </div>
      </div>
    </div>
  );
};

export default Index;
