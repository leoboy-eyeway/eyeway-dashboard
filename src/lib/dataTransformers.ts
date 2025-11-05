/**
 * Data Transformation Utilities
 * Centralized functions for transforming data between different formats
 */

import { Pothole, GaussianSplattingData, Severity, Status } from '@/types';

/**
 * Parse LiDAR data from Supabase JSON format
 */
export const parseLidarData = (lidarJson: any): GaussianSplattingData | undefined => {
  if (!lidarJson) return undefined;

  try {
    const parsed: GaussianSplattingData = {
      pointCloud: lidarJson.pointCloud ? {
        density: Number(lidarJson.pointCloud.density) || 0,
        points: Number(lidarJson.pointCloud.points) || 0,
        accuracy: Number(lidarJson.pointCloud.accuracy) || 0,
      } : undefined,
      surface: lidarJson.surface ? {
        depth: Number(lidarJson.surface.depth) || 0,
        width: Number(lidarJson.surface.width) || 0,
        area: Number(lidarJson.surface.area) || 0,
      } : undefined,
      classification: lidarJson.classification ? {
        confidence: Number(lidarJson.classification.confidence) || 0,
        model: String(lidarJson.classification.model) || '',
        scan_date: String(lidarJson.classification.scan_date) || '',
      } : undefined,
      gaussianData: lidarJson.gaussianData ? {
        url: String(lidarJson.gaussianData.url) || '',
        pointSize: Number(lidarJson.gaussianData.pointSize) || 1,
      } : undefined,
    };

    return parsed;
  } catch (error) {
    console.error('Error parsing LiDAR data:', error);
    return undefined;
  }
};

/**
 * Transform Supabase pothole data to application Pothole type
 */
export const transformSupabasePothole = (item: any): Pothole => {
  const parsedLidarData = parseLidarData(item.lidar_data);

  return {
    id: item.id,
    location: {
      lat: Number(item.latitude),
      lng: Number(item.longitude),
      address: item.address || `Road ID: ${item.road_id}`,
    },
    severity: item.severity as Severity,
    status: item.status as Status,
    detectionAccuracy: Number(item.detection_accuracy) / 100,
    reportDate: item.report_date,
    scheduledRepairDate: item.scheduled_repair_date || undefined,
    completionDate: item.completion_date || undefined,
    images: item.image_url ? [item.image_url] : [],
    description: item.description || undefined,
    reportedBy: item.reported_by || undefined,
    lidarData: parsedLidarData,
  };
};

/**
 * Transform application Pothole data to Supabase format
 */
export const transformPotholeToSupabase = (pothole: Pothole) => {
  return {
    id: pothole.id,
    latitude: pothole.location.lat,
    longitude: pothole.location.lng,
    address: pothole.location.address,
    severity: pothole.severity,
    status: pothole.status,
    detection_accuracy: Math.round(pothole.detectionAccuracy * 100),
    report_date: pothole.reportDate,
    scheduled_repair_date: pothole.scheduledRepairDate || null,
    completion_date: pothole.completionDate || null,
    image_url: pothole.images.length > 0 ? pothole.images[0] : null,
    description: pothole.description || null,
    reported_by: pothole.reportedBy || null,
    lidar_data: pothole.lidarData || null,
  };
};

/**
 * Validate pothole data
 */
export const validatePothole = (data: any): boolean => {
  if (!data) return false;

  const hasRequiredFields =
    data.id &&
    data.location &&
    typeof data.location.lat === 'number' &&
    typeof data.location.lng === 'number' &&
    data.severity &&
    data.status &&
    typeof data.detectionAccuracy === 'number' &&
    data.reportDate;

  const hasValidSeverity = ['low', 'medium', 'high', 'critical'].includes(data.severity);
  const hasValidStatus = ['reported', 'inspected', 'scheduled', 'in-progress', 'completed'].includes(data.status);

  return hasRequiredFields && hasValidSeverity && hasValidStatus;
};

/**
 * Filter potholes by severity and status
 */
export const filterPotholes = (
  potholes: Pothole[],
  severityFilter: Severity | 'all',
  statusFilter: Status | 'all'
): Pothole[] => {
  return potholes.filter(pothole => {
    const matchesSeverity = severityFilter === 'all' || pothole.severity === severityFilter;
    const matchesStatus = statusFilter === 'all' || pothole.status === statusFilter;
    return matchesSeverity && matchesStatus;
  });
};

/**
 * Calculate status update data based on new status
 */
export const calculateStatusUpdateData = (newStatus: Status): Partial<any> => {
  const updateData: any = {
    status: newStatus,
  };

  if (newStatus === 'scheduled') {
    // Schedule repair for 7 days from now
    updateData.scheduled_repair_date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  } else if (newStatus === 'completed') {
    updateData.completion_date = new Date().toISOString();
  }

  return updateData;
};

/**
 * Update pothole status in local state
 */
export const updatePotholeStatus = (
  potholes: Pothole[],
  id: string,
  newStatus: Status
): Pothole[] => {
  return potholes.map(pothole => {
    if (pothole.id !== id) return pothole;

    return {
      ...pothole,
      status: newStatus,
      scheduledRepairDate: newStatus === 'scheduled'
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        : pothole.scheduledRepairDate,
      completionDate: newStatus === 'completed'
        ? new Date().toISOString()
        : pothole.completionDate,
    };
  });
};
