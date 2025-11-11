
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area, ScatterChart, Scatter, ZAxis } from 'recharts';
import { Pothole, Severity, Status } from '@/types';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { InfoIcon } from "lucide-react";

interface DataVisualizationProps {
  potholes: Pothole[];
}

export const DataVisualization = ({ potholes }: DataVisualizationProps) => {
  const isMobile = useIsMobile();
  
  // Basic severity and status counts
  const severityCounts = {
    low: potholes.filter(p => p.severity === 'low').length,
    medium: potholes.filter(p => p.severity === 'medium').length,
    high: potholes.filter(p => p.severity === 'high').length,
    critical: potholes.filter(p => p.severity === 'critical').length,
  };
  
  const statusCounts = {
    reported: potholes.filter(p => p.status === 'reported').length,
    inspected: potholes.filter(p => p.status === 'inspected').length,
    scheduled: potholes.filter(p => p.status === 'scheduled').length,
    'in-progress': potholes.filter(p => p.status === 'in-progress').length,
    completed: potholes.filter(p => p.status === 'completed').length,
  };
  
  // Data for charts
  const severityData = [
    { name: 'Low', value: severityCounts.low, color: '#10b981' },
    { name: 'Medium', value: severityCounts.medium, color: '#f59e0b' },
    { name: 'High', value: severityCounts.high, color: '#f97316' },
    { name: 'Critical', value: severityCounts.critical, color: '#ef4444' },
  ];
  
  const statusData = [
    { name: 'Reported', value: statusCounts.reported, color: '#3b82f6' },
    { name: 'Inspected', value: statusCounts.inspected, color: '#8b5cf6' },
    { name: 'Scheduled', value: statusCounts.scheduled, color: '#f59e0b' },
    { name: 'In Progress', value: statusCounts['in-progress'], color: '#f97316' },
    { name: 'Completed', value: statusCounts.completed, color: '#10b981' },
  ];

  // Advanced analytics: Detection accuracy by severity
  const accuracyBySeverity = [
    { 
      name: 'Low', 
      accuracy: potholes.filter(p => p.severity === 'low').reduce((acc, p) => acc + p.detectionAccuracy, 0) / 
                (potholes.filter(p => p.severity === 'low').length || 1) * 100
    },
    { 
      name: 'Medium', 
      accuracy: potholes.filter(p => p.severity === 'medium').reduce((acc, p) => acc + p.detectionAccuracy, 0) / 
                (potholes.filter(p => p.severity === 'medium').length || 1) * 100
    },
    { 
      name: 'High', 
      accuracy: potholes.filter(p => p.severity === 'high').reduce((acc, p) => acc + p.detectionAccuracy, 0) / 
                (potholes.filter(p => p.severity === 'high').length || 1) * 100
    },
    { 
      name: 'Critical', 
      accuracy: potholes.filter(p => p.severity === 'critical').reduce((acc, p) => acc + p.detectionAccuracy, 0) / 
                (potholes.filter(p => p.severity === 'critical').length || 1) * 100
    }
  ];

  // Time-based analytics: Reports by month
  const getMonthlyData = () => {
    const months = Array.from({ length: 12 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      return {
        name: date.toLocaleString('default', { month: 'short', year: 'numeric' }),
        month: date.getMonth(),
        year: date.getFullYear(),
        count: 0
      };
    }).reverse();

    potholes.forEach(pothole => {
      const reportDate = new Date(pothole.reportDate);
      const monthIndex = months.findIndex(m => 
        m.month === reportDate.getMonth() && m.year === reportDate.getFullYear()
      );
      if (monthIndex >= 0) {
        months[monthIndex].count++;
      }
    });

    return months;
  };

  const monthlyReportData = getMonthlyData();

  // LiDAR data analytics
  const lidarDataAvailable = potholes.filter(p => p.lidarData).length;
  const averageDepth = potholes
    .filter(p => p.lidarData?.surface?.depth)
    .reduce((acc, p) => acc + (p.lidarData?.surface?.depth || 0), 0) / 
    (potholes.filter(p => p.lidarData?.surface?.depth).length || 1);

  const averageWidth = potholes
    .filter(p => p.lidarData?.surface?.width)
    .reduce((acc, p) => acc + (p.lidarData?.surface?.width || 0), 0) / 
    (potholes.filter(p => p.lidarData?.surface?.width).length || 1);

  // Scatter plot data: depth vs width
  const scatterData = potholes
    .filter(p => p.lidarData?.surface?.depth && p.lidarData?.surface?.width)
    .map(p => ({
      depth: p.lidarData?.surface?.depth || 0,
      width: p.lidarData?.surface?.width || 0,
      severity: p.severity,
      id: p.id
    }));
  
  // Calculate chart heights based on device
  const chartHeight = isMobile ? 220 : 240;
  
  return (
    <Card className="flex flex-col h-full border border-gray-200/50 shadow-sm">
      <CardHeader className="flex-shrink-0 pb-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg sm:text-xl font-bold text-gray-900">Pothole Analytics</CardTitle>
          <HoverCard>
            <HoverCardTrigger asChild>
              <button className="rounded-full p-1.5 hover:bg-gray-100 transition-colors">
                <InfoIcon className="h-4 w-4 text-gray-500" />
              </button>
            </HoverCardTrigger>
            <HoverCardContent className="w-72 sm:w-80">
              <div className="space-y-1">
                <h4 className="text-sm font-medium">About this data</h4>
                <p className="text-xs text-muted-foreground">
                  This analytics dashboard shows pothole data collected from LiDAR and computer vision
                  systems deployed across the city. Data is updated every 24 hours.
                </p>
              </div>
            </HoverCardContent>
          </HoverCard>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden pt-0">
        <Tabs defaultValue="overview" className="w-full h-full flex flex-col">
          <TabsList className={`grid w-full ${isMobile ? 'grid-cols-2' : 'grid-cols-4'} mb-3 sm:mb-4 bg-gray-100`}>
            <TabsTrigger value="overview" className="text-xs sm:text-sm data-[state=active]:bg-pothole-500 data-[state=active]:text-white">Overview</TabsTrigger>
            <TabsTrigger value="severity" className="text-xs sm:text-sm data-[state=active]:bg-pothole-500 data-[state=active]:text-white">Severity</TabsTrigger>
            {!isMobile && <TabsTrigger value="status" className="text-sm data-[state=active]:bg-pothole-500 data-[state=active]:text-white">Status</TabsTrigger>}
            {!isMobile && <TabsTrigger value="advanced" className="text-sm data-[state=active]:bg-pothole-500 data-[state=active]:text-white">Advanced</TabsTrigger>}
            {isMobile && (
              <TabsTrigger value="more" className="col-span-2 mt-2 text-xs sm:text-sm data-[state=active]:bg-pothole-500 data-[state=active]:text-white">
                More Analytics
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="overview" className="flex-1">
            <div className="space-y-3 sm:space-y-4 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {/* Summary cards */}
                <Card className="border border-gray-200/50 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs sm:text-sm font-medium text-gray-700">Total Potholes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl sm:text-3xl font-bold text-pothole-600">{potholes.length}</div>
                    <div className="text-xs text-gray-600 mt-1">
                      {lidarDataAvailable} with LiDAR data ({((lidarDataAvailable / potholes.length) * 100).toFixed(1)}%)
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-gray-200/50 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs sm:text-sm font-medium text-gray-700">Average Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xs sm:text-sm space-y-1">
                      <div>Depth: <span className="font-bold text-blue-600">{averageDepth.toFixed(1)}cm</span></div>
                      <div>Width: <span className="font-bold text-blue-600">{averageWidth.toFixed(1)}cm</span></div>
                      <div>Critical cases: <span className="font-bold text-red-500">{severityCounts.critical}</span></div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Monthly trend chart */}
              <Card className="border border-gray-200/50 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium text-gray-700">Monthly Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48 sm:h-56 md:h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={monthlyReportData}
                        margin={isMobile ? { top: 10, right: 10, left: -20, bottom: 20 } : { top: 10, right: 30, left: 0, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" tick={isMobile ? { fontSize: 10 } : { fontSize: 12 }} stroke="#6b7280" />
                        <YAxis tick={isMobile ? { fontSize: 10 } : { fontSize: 12 }} stroke="#6b7280" />
                        <Tooltip
                          formatter={(value: any) => {
                            if (typeof value === 'number') {
                              return [`${value} potholes`, 'Count'];
                            }
                            return [`${value}`, 'Count'];
                          }}
                          contentStyle={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                        />
                        <Area type="monotone" dataKey="count" stroke="#ea580c" fill="#fed7aa" name="Reported" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>


          <TabsContent value="severity" className="flex-1">
            <div className="space-y-3 sm:space-y-4 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <Card className="border border-gray-200/50 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs sm:text-sm font-medium text-gray-700">Severity Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-56 sm:h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={severityData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={isMobile ? 60 : 75}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {severityData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Legend layout={isMobile ? "horizontal" : "vertical"} align={isMobile ? "center" : "right"} verticalAlign={isMobile ? "bottom" : "middle"} wrapperStyle={{ fontSize: isMobile ? '11px' : '12px' }} />
                          <Tooltip
                            formatter={(value: any) => {
                              if (typeof value === 'number') {
                                return [`${value} potholes`, 'Count'];
                              }
                              return [`${value}`, 'Count'];
                            }}
                            contentStyle={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-gray-200/50 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs sm:text-sm font-medium text-gray-700">Severity Comparison</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-56 sm:h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={severityData}
                          margin={isMobile ? { top: 10, right: 10, left: -20, bottom: 20 } : { top: 10, right: 30, left: 0, bottom: 20 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="name" tick={isMobile ? { fontSize: 10 } : { fontSize: 12 }} stroke="#6b7280" />
                          <YAxis tick={isMobile ? { fontSize: 10 } : { fontSize: 12 }} stroke="#6b7280" />
                          <Tooltip
                            formatter={(value: any) => {
                              if (typeof value === 'number') {
                                return [`${value} potholes`, 'Count'];
                              }
                              return [`${value}`, 'Count'];
                            }}
                            contentStyle={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                          />
                          <Bar dataKey="value" fill="#ea580c" name="Count" radius={[8, 8, 0, 0]}>
                            {severityData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>


          <TabsContent value="status" className="flex-1">
            <div className="space-y-3 sm:space-y-4 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <Card className="border border-gray-200/50 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs sm:text-sm font-medium text-gray-700">Status Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-56 sm:h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={isMobile ? 60 : 75}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {statusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Legend layout={isMobile ? "horizontal" : "vertical"} align={isMobile ? "center" : "right"} verticalAlign={isMobile ? "bottom" : "middle"} wrapperStyle={{ fontSize: isMobile ? '11px' : '12px' }} />
                          <Tooltip
                            formatter={(value: any) => {
                              if (typeof value === 'number') {
                                return [`${value} potholes`, 'Count'];
                              }
                              return [`${value}`, 'Count'];
                            }}
                            contentStyle={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-gray-200/50 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs sm:text-sm font-medium text-gray-700">Status Comparison</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-56 sm:h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={statusData}
                          margin={isMobile ? { top: 10, right: 10, left: -20, bottom: 20 } : { top: 10, right: 30, left: 0, bottom: 20 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="name" tick={isMobile ? { fontSize: 10 } : { fontSize: 12 }} stroke="#6b7280" />
                          <YAxis tick={isMobile ? { fontSize: 10 } : { fontSize: 12 }} stroke="#6b7280" />
                          <Tooltip
                            formatter={(value: any) => {
                              if (typeof value === 'number') {
                                return [`${value} potholes`, 'Count'];
                              }
                              return [`${value}`, 'Count'];
                            }}
                            contentStyle={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                          />
                          <Bar dataKey="value" name="Count" radius={[8, 8, 0, 0]}>
                            {statusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>


          <TabsContent value="advanced" className="flex-1">
            <div className="space-y-3 sm:space-y-4 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {/* Detection accuracy chart */}
                <Card className="border border-gray-200/50 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs sm:text-sm font-medium text-gray-700">Detection Accuracy by Severity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-56 sm:h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={accuracyBySeverity}
                          margin={isMobile ? { top: 10, right: 10, left: -20, bottom: 5 } : { top: 10, right: 30, left: 0, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="name" tick={isMobile ? { fontSize: 10 } : { fontSize: 12 }} stroke="#6b7280" />
                          <YAxis domain={[0, 100]} unit="%" tick={isMobile ? { fontSize: 10 } : { fontSize: 12 }} stroke="#6b7280" />
                          <Tooltip
                            formatter={(value: any) => {
                              if (typeof value === 'number') {
                                return [`${value.toFixed(1)}%`, 'Accuracy'];
                              }
                              return [`${value}%`, 'Accuracy'];
                            }}
                            contentStyle={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                          />
                          <Line type="monotone" dataKey="accuracy" stroke="#ea580c" strokeWidth={2} name="Accuracy" dot={{ fill: '#ea580c', r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Depth vs Width Scatter Plot */}
                <Card className="border border-gray-200/50 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs sm:text-sm font-medium text-gray-700">Pothole Depth vs Width</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-56 sm:h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart
                          margin={isMobile ? { top: 10, right: 10, left: -20, bottom: 5 } : { top: 10, right: 30, left: 0, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis
                            type="number"
                            dataKey="depth"
                            name="Depth"
                            unit="cm"
                            tick={isMobile ? { fontSize: 10 } : { fontSize: 12 }}
                            stroke="#6b7280"
                          />
                          <YAxis
                            type="number"
                            dataKey="width"
                            name="Width"
                            unit="cm"
                            tick={isMobile ? { fontSize: 10 } : { fontSize: 12 }}
                            stroke="#6b7280"
                          />
                          <ZAxis
                            type="category"
                            dataKey="severity"
                            name="Severity"
                            range={[50, 200]}
                          />
                          <Tooltip
                            formatter={(value: any, name: any) => {
                              if (typeof value === 'number' && (name === 'Depth' || name === 'Width')) {
                                return [`${value}cm`, name];
                              }
                              return [value, name];
                            }}
                            contentStyle={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                            cursor={{ strokeDasharray: '3 3' }}
                          />
                          <Scatter
                            name="Potholes"
                            data={scatterData}
                            fill="#ea580c"
                          />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>


          {/* New tab for mobile that combines Status and Advanced */}
          {isMobile && (
            <TabsContent value="more" className="flex-1">
              <div className="space-y-3 sm:space-y-4 pb-4">
                <Card className="border border-gray-200/50 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs sm:text-sm font-medium text-gray-700">Status Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-56 sm:h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={60}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {statusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Legend layout="horizontal" align="center" verticalAlign="bottom" wrapperStyle={{ fontSize: '11px' }} />
                          <Tooltip
                            formatter={(value: any) => {
                              if (typeof value === 'number') {
                                return [`${value} potholes`, 'Count'];
                              }
                              return [`${value}`, 'Count'];
                            }}
                            contentStyle={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-gray-200/50 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs sm:text-sm font-medium text-gray-700">Detection Accuracy</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-56 sm:h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={accuracyBySeverity}
                          margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#6b7280" />
                          <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 10 }} stroke="#6b7280" />
                          <Tooltip
                            formatter={(value: any) => {
                              if (typeof value === 'number') {
                                return [`${value.toFixed(1)}%`, 'Accuracy'];
                              }
                              return [`${value}%`, 'Accuracy'];
                            }}
                            contentStyle={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                          />
                          <Line type="monotone" dataKey="accuracy" stroke="#ea580c" strokeWidth={2} name="Accuracy" dot={{ fill: '#ea580c', r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default DataVisualization;
