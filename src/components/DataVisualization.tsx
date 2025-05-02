
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area, ScatterChart, Scatter, ZAxis } from 'recharts';
import { Pothole, Severity, Status } from '@/types';

interface DataVisualizationProps {
  potholes: Pothole[];
}

export const DataVisualization = ({ potholes }: DataVisualizationProps) => {
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
  
  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-bold">Pothole Analytics</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="severity">By Severity</TabsTrigger>
            <TabsTrigger value="status">By Status</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Summary cards */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Potholes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{potholes.length}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {lidarDataAvailable} with LiDAR data ({((lidarDataAvailable / potholes.length) * 100).toFixed(1)}%)
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Average Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm">
                    <div>Depth: <span className="font-bold">{averageDepth.toFixed(1)}cm</span></div>
                    <div>Width: <span className="font-bold">{averageWidth.toFixed(1)}cm</span></div>
                    <div>Critical cases: <span className="font-bold">{severityCounts.critical}</span></div>
                  </div>
                </CardContent>
              </Card>
            
              {/* Monthly trend chart */}
              <div className="col-span-1 md:col-span-2 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={monthlyReportData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [`${value} potholes`, 'Count']}
                      contentStyle={{ background: 'white', border: '1px solid #ccc' }}
                    />
                    <Area type="monotone" dataKey="count" stroke="#8b5cf6" fill="#c4b5fd" name="Reported" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="severity" className="space-y-4">
            <div className="flex flex-col space-y-4">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={severityData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {severityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip 
                      formatter={(value) => [`${value} potholes`, 'Count']}
                      contentStyle={{ background: 'white', border: '1px solid #ccc' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={severityData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [`${value} potholes`, 'Count']}
                      contentStyle={{ background: 'white', border: '1px solid #ccc' }}
                    />
                    <Bar dataKey="value" fill="#8b5cf6" name="Count">
                      {severityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="status" className="space-y-4">
            <div className="flex flex-col space-y-4">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip 
                      formatter={(value) => [`${value} potholes`, 'Count']}
                      contentStyle={{ background: 'white', border: '1px solid #ccc' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={statusData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [`${value} potholes`, 'Count']}
                      contentStyle={{ background: 'white', border: '1px solid #ccc' }}
                    />
                    <Bar dataKey="value" name="Count">
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="advanced" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Detection accuracy chart */}
              <div className="h-64">
                <p className="text-sm font-medium mb-2">Detection Accuracy by Severity</p>
                <ResponsiveContainer width="100%" height="90%">
                  <LineChart
                    data={accuracyBySeverity}
                    margin={{ top: 5, right: 30, left: 5, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} unit="%" />
                    <Tooltip
                      formatter={(value) => [`${value.toFixed(1)}%`, 'Accuracy']}
                      contentStyle={{ background: 'white', border: '1px solid #ccc' }}
                    />
                    <Line type="monotone" dataKey="accuracy" stroke="#8b5cf6" name="Accuracy" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              {/* Depth vs Width Scatter Plot */}
              <div className="h-64">
                <p className="text-sm font-medium mb-2">Pothole Depth vs Width</p>
                <ResponsiveContainer width="100%" height="90%">
                  <ScatterChart
                    margin={{ top: 5, right: 30, left: 5, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      type="number" 
                      dataKey="depth" 
                      name="Depth" 
                      unit="cm" 
                    />
                    <YAxis 
                      type="number" 
                      dataKey="width" 
                      name="Width" 
                      unit="cm" 
                    />
                    <ZAxis 
                      type="category" 
                      dataKey="severity" 
                      name="Severity" 
                      range={[50, 200]} 
                    />
                    <Tooltip 
                      formatter={(value, name) => [
                        `${value}${name === 'Depth' || name === 'Width' ? 'cm' : ''}`, 
                        name
                      ]}
                      contentStyle={{ background: 'white', border: '1px solid #ccc' }}
                      cursor={{ strokeDasharray: '3 3' }}
                    />
                    <Scatter 
                      name="Potholes" 
                      data={scatterData} 
                      fill="#8b5cf6"
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default DataVisualization;
