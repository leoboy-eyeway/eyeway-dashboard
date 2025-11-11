
import React, { useState, useEffect, useRef } from 'react';
import Header from '@/components/Header';
import PotholeFilters from '@/components/PotholeFilters';
import MapboxView, { MapboxViewRef } from '@/components/MapboxView';
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
  const mapRef = useRef<MapboxViewRef>(null);
  const [isMap3DMode, setIsMap3DMode] = useState(true); // Default to 3D mode

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
            // Parse lidarData as our GaussianSplattingData type
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

  const handleClosePothole = () => {
    setSelectedPothole(null);
    mapRef.current?.closePopup();
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

  const handleToggleViewMode = () => {
    mapRef.current?.toggleViewMode();
    // Update local state to reflect the new mode
    setIsMap3DMode(!isMap3DMode);
  };

  const togglePanel = (panel: 'filters' | 'data' | 'documents') => {
    setActivePanel(activePanel === panel ? null : panel);
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Fullscreen Map */}
      {isLoading ? (
        <div className="fixed inset-0 flex items-center justify-center bg-white z-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pothole-500"></div>
        </div>
      ) : (
        <MapboxView
          ref={mapRef}
          potholes={filteredPotholes}
          onSelectPothole={handleSelectPothole}
        />
      )}

      {/* Floating Header with Integrated Controls */}
      <Header
        activePanel={activePanel}
        togglePanel={togglePanel}
        isPotholeDetailsOpen={!!selectedPothole}
      />

      {/* Mobile Control Panel - Bottom */}
      <div className="fixed bottom-4 left-4 z-30 md:hidden flex flex-col gap-2">
        {/* 3D Mode Button */}
        <button
          onClick={handleToggleViewMode}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-full font-semibold text-sm shadow-lg transition-all active:scale-95"
        >
          {isMap3DMode ? '3D Mode' : '2D Mode'}
        </button>

        {/* Control Buttons */}
        <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl p-2 flex flex-col gap-1.5">
          <button
            onClick={() => togglePanel('filters')}
            className={`px-5 py-2.5 text-sm font-medium rounded-xl transition-all ${
              activePanel === 'filters'
                ? 'bg-pothole-500 text-white shadow-md'
                : 'bg-white hover:bg-gray-50'
            }`}
          >
            Filters
          </button>
          <button
            onClick={() => togglePanel('data')}
            className={`px-5 py-2.5 text-sm font-medium rounded-xl transition-all ${
              activePanel === 'data'
                ? 'bg-pothole-500 text-white shadow-md'
                : 'bg-white hover:bg-gray-50'
            }`}
          >
            Data
          </button>
          <button
            onClick={() => togglePanel('documents')}
            className={`px-5 py-2.5 text-sm font-medium rounded-xl transition-all ${
              activePanel === 'documents'
                ? 'bg-pothole-500 text-white shadow-md'
                : 'bg-white hover:bg-gray-50'
            }`}
          >
            Docs
          </button>
        </div>
      </div>

      {/* Side Slide Pothole Details Panel */}
      {selectedPothole && (
        <div className={`fixed ${
          isMobile
            ? 'inset-x-0 top-0 bottom-0 z-40'
            : 'top-0 right-0 bottom-0 z-30 w-96'
        } floating-panel overflow-hidden`}>
          <div className="relative h-full flex flex-col">
            <button
              onClick={handleClosePothole}
              className="absolute top-3 right-6 p-2.5 rounded-full hover:bg-gray-100/80 transition-all duration-200 hover:scale-110 hover:rotate-90 z-50 bg-white/90 backdrop-blur-sm shadow-lg border border-gray-200/50"
              aria-label="Close panel"
            >
              <X size={20} className="text-gray-600" />
            </button>
            <div className="flex-1 overflow-y-auto min-h-0" style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}>
              <PotholeDetails
                pothole={selectedPothole}
                onClose={handleClosePothole}
                onUpdateStatus={handleUpdatePotholeStatus}
              />
            </div>
          </div>
        </div>
      )}

      {/* Floating Panels */}
      {activePanel === 'filters' && (
        <div className={`fixed ${
          isMobile
            ? 'inset-x-4 top-20 bottom-4 z-35'
            : 'top-24 left-4 w-96 max-h-[calc(100vh-8rem)]'
        } floating-panel animate-fade-in overflow-hidden`}>
          <div className="relative h-full flex flex-col">
            <button
              onClick={() => setActivePanel(null)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors z-20 bg-white shadow-md"
              aria-label="Close panel"
            >
              <X size={18} />
            </button>
            <div className="flex-1 overflow-y-auto p-4">
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
        </div>
      )}

      {activePanel === 'data' && (
        <div className={`fixed ${
          isMobile
            ? 'inset-x-4 top-20 bottom-4 z-35'
            : 'top-24 left-4 right-4 max-w-6xl max-h-[calc(100vh-8rem)]'
        } floating-panel animate-fade-in overflow-hidden`}>
          <div className="relative h-full flex flex-col">
            <button
              onClick={() => setActivePanel(null)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors z-20 bg-white shadow-md"
              aria-label="Close panel"
            >
              <X size={18} />
            </button>
            <div className="flex-1 overflow-y-auto p-4">
              <DataVisualization potholes={potholes} />
            </div>
          </div>
        </div>
      )}

      {activePanel === 'documents' && (
        <div className={`fixed ${
          isMobile
            ? 'inset-x-4 top-20 bottom-4 z-35'
            : 'top-24 left-4 right-4 max-w-6xl max-h-[calc(100vh-8rem)]'
        } floating-panel animate-fade-in overflow-hidden`}>
          <div className="relative h-full flex flex-col">
            <button
              onClick={() => setActivePanel(null)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors z-20 bg-white shadow-md"
              aria-label="Close panel"
            >
              <X size={18} />
            </button>
            <div className="flex-1 overflow-y-auto">
              <DocumentManagement />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
