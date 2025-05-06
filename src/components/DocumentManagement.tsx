
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckIcon, ClockIcon } from "lucide-react";

// Types for document section
interface DocumentSection {
  id: string;
  title: string;
  type: 'Cover page' | 'Table of contents' | 'Narrative';
  status: 'Done' | 'In Process';
  target: number;
  limit: number;
}

interface DocumentManagementProps {
  className?: string;
}

const documentSections: DocumentSection[] = [
  { id: '1', title: 'Cover page', type: 'Cover page', status: 'In Process', target: 18, limit: 5 },
  { id: '2', title: 'Table of contents', type: 'Table of contents', status: 'Done', target: 29, limit: 24 },
  { id: '3', title: 'Executive summary', type: 'Narrative', status: 'Done', target: 10, limit: 13 },
  { id: '4', title: 'Technical approach', type: 'Narrative', status: 'Done', target: 27, limit: 23 },
  { id: '5', title: 'Design', type: 'Narrative', status: 'In Process', target: 2, limit: 16 },
  { id: '6', title: 'Capabilities', type: 'Narrative', status: 'In Process', target: 20, limit: 8 },
  { id: '7', title: 'Integration with existing systems', type: 'Narrative', status: 'In Process', target: 19, limit: 21 },
  { id: '8', title: 'Innovation and Advantages', type: 'Narrative', status: 'Done', target: 25, limit: 26 },
];

export const DocumentManagement: React.FC<DocumentManagementProps> = ({ className = "" }) => {
  return (
    <Card className={`border border-gray-200 shadow-sm ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold">Document Management</CardTitle>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">
                  <span className="sr-only">Selection</span>
                </TableHead>
                <TableHead>Header</TableHead>
                <TableHead>Section Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Target</TableHead>
                <TableHead className="text-right">Limit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documentSections.map((section) => (
                <TableRow key={section.id} className="hover:bg-muted/30">
                  <TableCell className="p-2">
                    <div className="flex items-center justify-center">
                      <div className="h-4 w-4 rounded border border-gray-300"></div>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{section.title}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-800">
                      {section.type}
                    </span>
                  </TableCell>
                  <TableCell>
                    {section.status === 'Done' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
                        <CheckIcon className="h-3 w-3" />
                        Done
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                        <ClockIcon className="h-3 w-3" />
                        In Process
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{section.target}</TableCell>
                  <TableCell className="text-right">{section.limit}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default DocumentManagement;
