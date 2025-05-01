
import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import PotholeFilters from '@/components/PotholeFilters';
import MapView from '@/components/MapView';
import PotholeDetails from '@/components/PotholeDetails';
import DataVisualization from '@/components/DataVisualization';
import { potholes as initialPotholes } from '@/data/potholes';
import { Pothole, Status, Severity } from '@/types';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const [potholes, setPotholes] = useState<Pothole[]>(initialPotholes);
  const [filteredPotholes, setFilteredPotholes] = useState<Pothole[]>(initialPotholes);
  const [selectedPothole, setSelectedPothole] = useState<Pothole | null>(null);
  const [severityFilter, setSeverityFilter] = useState<Severity | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all');
  const { toast } = useToast();

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

  const handleUpdatePotholeStatus = (id: string, newStatus: Status) => {
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
  };

  const handleClearFilters = () => {
    setSeverityFilter('all');
    setStatusFilter('all');
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-6 space-y-6 max-w-7xl">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Pothole Tracking Dashboard</h1>
        
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
            <MapView 
              potholes={filteredPotholes} 
              onSelectPothole={handleSelectPothole} 
            />
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
            
            <DataVisualization potholes={potholes} />
          </div>
        </div>
      </main>
      
      <footer className="bg-white border-t border-gray-200 py-4">
        <div className="container mx-auto px-4 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} Pothole Pulse. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Index;
