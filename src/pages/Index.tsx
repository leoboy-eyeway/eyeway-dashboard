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

const Index = () => {
  const [potholes, setPotholes] = useState<Pothole[]>([]);
  const [filteredPotholes, setFilteredPotholes] = useState<Pothole[]>([]);
  const [selectedPothole, setSelectedPothole] = useState<Pothole | null>(null);
  const [severityFilter, setSeverityFilter] = useState<Severity | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

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
              // Cast the item.lidar_data to a more specific type to work with it
              const lidarJson = item.lidar_data as Record<string, any>;
              
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

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-6 space-y-6 max-w-7xl">
        {/* Removed redundant title here */}
        
        <PotholeFilters 
          severity={severityFilter}
          status={statusFilter}
          onSeverityChange={setSeverityFilter}
          onStatusChange={setStatusFilter}
          onClearFilters={handleClearFilters}
          totalPotholes={potholes.length}
          filteredCount={filteredPotholes.length}
        />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {isLoading ? (
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 flex items-center justify-center h-[600px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pothole-500"></div>
              </div>
            ) : (
              <MapView 
                potholes={filteredPotholes} 
                onSelectPothole={handleSelectPothole} 
              />
            )}
          </div>
          
          <div className="space-y-6">
            {selectedPothole ? (
              <PotholeDetails 
                pothole={selectedPothole} 
                onClose={() => setSelectedPothole(null)}
                onUpdateStatus={handleUpdatePotholeStatus}
              />
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 flex items-center justify-center h-[200px]">
                <p className="text-gray-500">Select a pothole on the map to view details</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="mt-8 w-full">
          <DataVisualization potholes={potholes} />
        </div>

        <div className="mt-8 w-full">
          <DocumentManagement />
        </div>
      </main>
      
      <footer className="bg-white border-t border-gray-200 py-4">
        <div className="container mx-auto px-4 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} Eyeway 2.0. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Index;
