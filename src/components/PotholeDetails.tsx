
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Pothole } from '@/types';
import { format } from 'date-fns';
import AdaptiveGSplatViewer from './AdaptiveGSplatViewer';

interface PotholeDetailsProps {
  pothole: Pothole | null;
  onClose: () => void;
  onUpdateStatus?: (id: string, status: Pothole['status']) => void;
}

export const PotholeDetails = ({
  pothole,
  onClose,
  onUpdateStatus
}: PotholeDetailsProps) => {
  if (!pothole) return null;
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not scheduled';
    return format(new Date(dateString), 'MMM d, yyyy • h:mm a');
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
  
  const getStatusBadge = (status: Pothole['status']) => {
    switch (status) {
      case 'reported':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Reported</Badge>;
      case 'inspected':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Inspected</Badge>;
      case 'scheduled':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Scheduled</Badge>;
      case 'in-progress':
        return <Badge variant="outline" className="bg-pothole-50 text-pothole-700 border-pothole-200">In Progress</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completed</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <Card className="flex flex-col h-full border border-gray-200/50 shadow-sm animate-fade-in">
      <CardHeader className="flex-shrink-0 pb-4 border-b border-gray-100 pt-14 pr-16">
        <div className="flex justify-between items-start gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-xl font-bold text-gray-900">Pothole #{pothole.id.slice(0, 8)}</CardTitle>
            <p className="text-xs text-gray-500 mt-1">{pothole.location.address}</p>
          </div>
          <div className="flex-shrink-0">
            {getStatusBadge(pothole.status)}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 pt-4">
        <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl overflow-hidden flex items-center justify-center border border-gray-200">
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <div className="text-sm text-gray-500 font-medium">Image Placeholder</div>
            <div className="text-xs text-gray-400 mt-1">Capture pending</div>
          </div>
        </div>

        {/* Detection Accuracy and Severity - Side by side */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-4 border border-blue-200/50">
            <div className="text-xs uppercase tracking-wide text-blue-600 font-semibold mb-2">Detection Accuracy</div>
            <div className="text-3xl font-bold text-blue-900 mb-1">
              {Math.round(pothole.detectionAccuracy * 100)}%
            </div>
            <Progress value={pothole.detectionAccuracy * 100} className="h-1.5" />
          </div>

          <div className={`bg-gradient-to-br ${
            pothole.severity === 'critical' ? 'from-red-50 to-red-100/50 border-red-200/50' :
            pothole.severity === 'high' ? 'from-orange-50 to-orange-100/50 border-orange-200/50' :
            pothole.severity === 'medium' ? 'from-yellow-50 to-yellow-100/50 border-yellow-200/50' :
            'from-green-50 to-green-100/50 border-green-200/50'
          } rounded-xl p-4 border`}>
            <div className="text-xs uppercase tracking-wide text-gray-600 font-semibold mb-2">Severity</div>
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded-full ${getSeverityColor(pothole.severity)} shadow-md`}></div>
              <span className="capitalize font-bold text-xl text-gray-900">{pothole.severity}</span>
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <div className="text-xs uppercase tracking-wide text-gray-600 font-semibold mb-2">Location</div>
          <p className="text-sm font-medium text-gray-900">{pothole.location.address}</p>
          <p className="text-xs text-gray-500 mt-1 font-mono">
            {pothole.location.lat.toFixed(6)}, {pothole.location.lng.toFixed(6)}
          </p>
        </div>
        
        {/* Gaussian Splatting 3D Visualization */}
        {pothole.lidarData && (
          <>
            <Separator className="my-4" />
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide">3D Point Cloud</h4>
              </div>
              {pothole.model_url || pothole.lidarData.gaussianData?.url ? (
                <AdaptiveGSplatViewer
                  url={pothole.model_url || pothole.lidarData.gaussianData!.url}
                  className="h-60 w-full rounded-md overflow-hidden border border-gray-200"
                />
              ) : (
                <div className="h-60 w-full rounded-md border border-gray-200 bg-gray-50 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-200 flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-gray-600">3D Model Available</p>
                    <p className="text-xs text-gray-400 mt-1">No model URL provided in data</p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 p-4 rounded-xl border border-gray-200 space-y-4 select-text">
              {pothole.lidarData.pointCloud && (
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <h5 className="text-xs font-bold text-gray-800 uppercase tracking-wide mb-2">Gaussian Splat Data</h5>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <div className="text-xs text-gray-500 mb-1">Density</div>
                      <div className="text-base font-bold text-gray-900">{pothole.lidarData.pointCloud.density}</div>
                      <div className="text-xs text-gray-400">splats/m²</div>
                    </div>
                    <div className="text-center border-x border-gray-200">
                      <div className="text-xs text-gray-500 mb-1">Splats</div>
                      <div className="text-base font-bold text-gray-900">{pothole.lidarData.pointCloud.points.toLocaleString()}</div>
                      <div className="text-xs text-gray-400">total</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500 mb-1">Quality</div>
                      <div className="text-base font-bold text-gray-900">{(pothole.lidarData.pointCloud.accuracy * 100).toFixed(1)}%</div>
                      <div className="text-xs text-gray-400">reconstruction</div>
                    </div>
                  </div>
                </div>
              )}

              {pothole.lidarData.surface && (
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <h5 className="text-xs font-bold text-gray-800 uppercase tracking-wide mb-2">Surface Analysis</h5>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <div className="text-xs text-gray-500 mb-1">Depth</div>
                      <div className="text-xl font-bold text-red-600">{pothole.lidarData.surface.depth}</div>
                      <div className="text-xs text-gray-400">cm</div>
                    </div>
                    <div className="text-center border-x border-gray-200">
                      <div className="text-xs text-gray-500 mb-1">Width</div>
                      <div className="text-xl font-bold text-orange-600">{pothole.lidarData.surface.width}</div>
                      <div className="text-xs text-gray-400">cm</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500 mb-1">Area</div>
                      <div className="text-xl font-bold text-blue-600">{pothole.lidarData.surface.area}</div>
                      <div className="text-xs text-gray-400">m²</div>
                    </div>
                  </div>
                </div>
              )}

              {pothole.lidarData.classification && (
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <h5 className="text-xs font-bold text-gray-800 uppercase tracking-wide mb-2">Classification</h5>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">Confidence</span>
                      <span className="text-sm font-bold text-gray-900">{pothole.lidarData.classification.confidence}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">Model</span>
                      <span className="text-sm font-mono font-medium text-gray-900">{pothole.lidarData.classification.model}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                      <span className="text-xs text-gray-500">Scan Date</span>
                      <span className="text-xs font-medium text-gray-900">
                        {formatDate(pothole.lidarData.classification.scan_date)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
        
        <Separator className="my-4" />

        {/* Timeline */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-6 bg-gradient-to-b from-green-500 to-blue-500 rounded-full"></div>
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Timeline</h4>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Reported</div>
              <p className="text-sm font-semibold text-gray-900">{formatDate(pothole.reportDate)}</p>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Scheduled Repair</div>
              <p className="text-sm font-semibold text-gray-900">{formatDate(pothole.scheduledRepairDate)}</p>
            </div>
          </div>
        </div>

        {pothole.description && (
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wide mb-2">Description</h4>
            <p className="text-sm text-gray-700 leading-relaxed">{pothole.description}</p>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between gap-3 pt-4 border-t border-gray-100">
        <Button
          variant="outline"
          className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold"
          onClick={onClose}
        >
          Close
        </Button>
        {onUpdateStatus && pothole.status !== 'completed' && (
          <Button
            className="flex-1 bg-gradient-to-r from-pothole-500 to-pothole-600 hover:from-pothole-600 hover:to-pothole-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
            onClick={() => {
              const nextStatus = (): Pothole['status'] => {
                switch (pothole.status) {
                  case 'reported': return 'inspected';
                  case 'inspected': return 'scheduled';
                  case 'scheduled': return 'in-progress';
                  case 'in-progress': return 'completed';
                  default: return 'reported';
                }
              };
              
              onUpdateStatus(pothole.id, nextStatus());
            }}
          >
            {pothole.status === 'reported' && 'Mark as Inspected'}
            {pothole.status === 'inspected' && 'Schedule Repair'}
            {pothole.status === 'scheduled' && 'Start Repair'}
            {pothole.status === 'in-progress' && 'Mark as Completed'}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default PotholeDetails;
