
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Pothole, Severity, Status } from '@/types';

interface DataVisualizationProps {
  potholes: Pothole[];
}

export const DataVisualization = ({ potholes }: DataVisualizationProps) => {
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
  
  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-bold">Pothole Analytics</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="severity" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="severity">By Severity</TabsTrigger>
            <TabsTrigger value="status">By Status</TabsTrigger>
          </TabsList>
          
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
                    <Bar dataKey="value" fill="#F97316" name="Count" />
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
                    <Bar dataKey="value" fill="#F97316" name="Count" />
                  </BarChart>
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
