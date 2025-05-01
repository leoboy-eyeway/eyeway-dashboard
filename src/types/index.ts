
export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type Status = 'reported' | 'inspected' | 'scheduled' | 'in-progress' | 'completed';

export interface Pothole {
  id: string;
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  severity: Severity;
  status: Status;
  detectionAccuracy: number;
  reportDate: string;
  scheduledRepairDate?: string;
  completionDate?: string;
  images: string[];
  description?: string;
  reportedBy?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'maintenance' | 'inspector' | 'reporter';
  avatar?: string;
}

export interface MapViewState {
  latitude: number;
  longitude: number;
  zoom: number;
}
