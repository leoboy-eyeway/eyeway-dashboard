import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckIcon, ClockIcon, AlertTriangle, Filter, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/integrations/supabase/types';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Types for management documents
interface PotholeDocument {
  id: string;
  title: string;
  type: 'Inspection' | 'Repair Plan' | 'Budget Allocation' | 'Crew Assignment' | 'Material Requisition' | 'Completion Report';
  status: 'Pending' | 'In Progress' | 'Completed';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  due_date: string;
  assigned_to: string;
  pothole_id?: string;
  pothole_number?: number; // Added to link to potholes
}

interface DocumentManagementProps {
  className?: string;
}

// Draggable row component
function DraggableRow({ id, children, ...props }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    ...(isDragging ? { zIndex: 10, background: 'var(--muted)' } : {})
  };
  return (
    <tr ref={setNodeRef} style={style} {...props} {...attributes}>
      {children(listeners)}
    </tr>
  );
}

export const DocumentManagement: React.FC<DocumentManagementProps> = ({ className = "" }) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [documents, setDocuments] = useState<PotholeDocument[]>([]);
  const { toast } = useToast();

  const sensors = useSensors(useSensor(PointerSensor));

  // Fetch documents from Supabase
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('pothole_documents')
          .select(`
            *,
            potholes (pothole_number)
          `);

        if (error) throw error;

        if (data) {
          const transformedData: PotholeDocument[] = data.map(item => ({
            id: item.id,
            title: item.title,
            type: item.type as PotholeDocument['type'],
            status: item.status as PotholeDocument['status'],
            priority: item.priority as PotholeDocument['priority'],
            due_date: item.due_date,
            assigned_to: item.assigned_to,
            pothole_id: item.pothole_id,
            pothole_number: item.potholes?.pothole_number
          }));
          
          setDocuments(transformedData);
          console.log("Fetched pothole documents:", transformedData);
        }
      } catch (error) {
        console.error('Error fetching pothole documents:', error);
        toast({
          variant: "destructive",
          title: "Error fetching documents",
          description: "Could not load pothole management documents. Please try again later."
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocuments();
  }, [toast]);

  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
      const matchesType = typeFilter === 'all' || doc.type === typeFilter;
      const matchesPriority = priorityFilter === 'all' || doc.priority === priorityFilter;
      return matchesStatus && matchesType && matchesPriority;
    });
  }, [statusFilter, typeFilter, priorityFilter, documents]);

  const getPriorityBadge = (priority: PotholeDocument['priority']) => {
    switch (priority) {
      case 'Low':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100">Low</Badge>;
      case 'Medium':
        return <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100">Medium</Badge>;
      case 'High':
        return <Badge variant="outline" className="bg-pothole-50 text-pothole-700 border-pothole-200 hover:bg-pothole-100">High</Badge>;
      case 'Critical':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100">Critical</Badge>;
      default:
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Unknown</Badge>;
    }
  };

  const getStatusBadge = (status: PotholeDocument['status']) => {
    switch (status) {
      case 'Pending':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors">
            <AlertTriangle className="h-3 w-3" />
            Pending
          </span>
        );
      case 'In Progress':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 border border-sky-200 hover:bg-sky-100 transition-colors">
            <ClockIcon className="h-3 w-3" />
            In Progress
          </span>
        );
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors">
            <CheckIcon className="h-3 w-3" />
            Completed
          </span>
        );
      default:
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Unknown</Badge>;
    }
  };

  return (
    <Card className={`flex flex-col h-full border border-gray-200/50 shadow-sm ${className}`}>
      <CardHeader className="flex-shrink-0 pb-4 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <CardTitle className="text-xl font-bold text-gray-900">
            Pothole Management Documents
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1 border-pothole-200 text-pothole-700 hover:bg-pothole-50 hover:border-pothole-300"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
            <span className="hidden sm:inline text-xs text-pothole-600 bg-pothole-50 px-2 py-1 rounded-full">
              Updated: {new Date().toLocaleDateString()}
            </span>
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            <div>
              <label className="text-sm font-medium mb-1 block text-pothole-700">Status</label>
              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block text-pothole-700">Document Type</label>
              <Select
                value={typeFilter}
                onValueChange={setTypeFilter}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Inspection">Inspection</SelectItem>
                  <SelectItem value="Repair Plan">Repair Plan</SelectItem>
                  <SelectItem value="Crew Assignment">Crew Assignment</SelectItem>
                  <SelectItem value="Material Requisition">Material Requisition</SelectItem>
                  <SelectItem value="Completion Report">Completion Report</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block text-pothole-700">Priority</label>
              <Select
                value={priorityFilter}
                onValueChange={setPriorityFilter}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filter by priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 p-0">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pothole-500"></div>
          </div>
        ) : (
          <div className="h-full">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={event => {
                const { active, over } = event;
                if (active.id !== over.id) {
                  const oldIndex = documents.findIndex(doc => doc.id === active.id);
                  const newIndex = documents.findIndex(doc => doc.id === over.id);
                  setDocuments(arrayMove(documents, oldIndex, newIndex));
                }
              }}
            >
              <SortableContext items={filteredDocuments.map(doc => doc.id)} strategy={verticalListSortingStrategy}>
                <Table>
                  <TableHeader className="sticky top-0 bg-white z-10">
                    <TableRow>
                      <TableHead className="w-8">
                        <span className="sr-only">Drag</span>
                      </TableHead>
                      <TableHead>Document Title</TableHead>
                      <TableHead className="hidden md:table-cell">Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden md:table-cell">Priority</TableHead>
                      <TableHead className="hidden lg:table-cell">Due Date</TableHead>
                      <TableHead className="hidden lg:table-cell">Assigned To</TableHead>
                      <TableHead>Pothole ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocuments.length > 0 ? (
                      filteredDocuments.map((doc) => (
                        <DraggableRow key={doc.id} id={doc.id}>
                          {(listeners: any) => <>
                            <TableCell className="p-2 align-middle">
                              <button
                                {...listeners}
                                tabIndex={-1}
                                className="cursor-grab"
                                style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', padding: 0 }}
                                aria-label="Drag row"
                              >
                                <GripVertical className="w-4 h-4 text-muted-foreground" />
                              </button>
                            </TableCell>
                            <TableCell className="font-medium">
                              <div className="flex flex-col">
                                <span>{doc.title}</span>
                                <span className="text-xs text-muted-foreground md:hidden">{doc.type}</span>
                                {!doc.pothole_number && <span className="text-xs text-muted-foreground md:hidden">No Pothole</span>}
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <span className="inline-flex items-center rounded-full border border-pothole-200 bg-pothole-50 px-3 py-0.5 text-xs font-semibold text-pothole-700 hover:bg-pothole-100 transition-colors">
                                {doc.type}
                              </span>
                            </TableCell>
                            <TableCell>{getStatusBadge(doc.status)}</TableCell>
                            <TableCell className="hidden md:table-cell">{getPriorityBadge(doc.priority)}</TableCell>
                            <TableCell className="hidden lg:table-cell">{new Date(doc.due_date).toLocaleDateString()}</TableCell>
                            <TableCell className="hidden lg:table-cell">{doc.assigned_to}</TableCell>
                            <TableCell>
                              {doc.pothole_number ? (
                                <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 font-mono">
                                  #{doc.pothole_number}
                                </Badge>
                              ) : (
                                <span className="text-sm text-muted-foreground">N/A</span>
                              )}
                            </TableCell>
                          </>}
                        </DraggableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-12 h-12 rounded-full bg-pothole-50 flex items-center justify-center">
                              <Filter className="h-6 w-6 text-pothole-400" />
                            </div>
                            <p className="text-pothole-600 font-medium">No documents match your filters</p>
                            <p className="text-sm text-gray-500">Try adjusting your search criteria or clear filters to see all documents.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </SortableContext>
            </DndContext>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DocumentManagement;
