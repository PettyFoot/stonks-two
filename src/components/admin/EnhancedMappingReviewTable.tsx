'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus,
  Trash2,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  Info,
  Minus,
  CornerDownRight
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ORDER_FIELDS_BY_CATEGORY } from '@/lib/constants/orderFields';
import { toast } from 'sonner';

interface MappingField {
  orderField: string;
  confidence?: number;
  isNew?: boolean;
  isModified?: boolean;
}

interface MappingPair {
  csvHeader: string;
  fields: MappingField[];
  isRemoved?: boolean;
}

interface MappingReviewData {
  review: {
    id: string;
    adminReviewStatus: string;
    aiConfidence: number;
    user: {
      email: string;
      name: string | null;
    };
    brokerCsvFormat: {
      formatName: string;
      description: string | null;
      confidence: number;
    };
    csvUploadLog: {
      filename: string;
      rowCount: number;
    };
  };
  mappings: { csvHeader: string; orderField: string; confidence?: number; isNew?: boolean; isModified?: boolean; }[];
  unmappedHeaders: string[];
  sampleData: Record<string, unknown>[];
  csvFileContent: string | null;
}

interface EnhancedMappingReviewTableProps {
  reviewId: string;
  onMappingsUpdated: () => void;
  onClose: () => void;
}

export default function EnhancedMappingReviewTable({
  reviewId,
  onMappingsUpdated,
  onClose
}: EnhancedMappingReviewTableProps) {
  const [data, setData] = useState<MappingReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentMappings, setCurrentMappings] = useState<MappingPair[]>([]);
  const [originalMappings, setOriginalMappings] = useState<MappingPair[]>([]);
  const [removedHeaders, setRemovedHeaders] = useState<string[]>([]);
  const [adminNotes, setAdminNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [swapDialog, setSwapDialog] = useState<{
    isOpen: boolean;
    newField: string;
    currentMapping: { csvHeader: string; fieldIndex: number };
    conflictMapping: { csvHeader: string; fieldIndex: number };
  }>({
    isOpen: false,
    newField: '',
    currentMapping: { csvHeader: '', fieldIndex: -1 },
    conflictMapping: { csvHeader: '', fieldIndex: -1 }
  });

  // Convert legacy mappings to new format
  const convertLegacyMappings = (legacyMappings: any[]): MappingPair[] => {
    const groupedMappings: Record<string, MappingField[]> = {};

    legacyMappings.forEach(mapping => {
      if (!groupedMappings[mapping.csvHeader]) {
        groupedMappings[mapping.csvHeader] = [];
      }
      groupedMappings[mapping.csvHeader].push({
        orderField: mapping.orderField,
        confidence: mapping.confidence,
        isNew: mapping.isNew,
        isModified: mapping.isModified
      });
    });

    return Object.entries(groupedMappings).map(([csvHeader, fields]) => ({
      csvHeader,
      fields,
      isRemoved: false
    }));
  };

  // Fetch review data
  useEffect(() => {
    const fetchReviewData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/admin/ai-reviews/${reviewId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch review data');
        }

        const reviewData = await response.json();
        setData(reviewData);

        const convertedMappings = convertLegacyMappings(reviewData.mappings || []);
        setCurrentMappings([...convertedMappings]);
        setOriginalMappings([...convertedMappings]);
      } catch (error) {
        console.error('Error fetching review data:', error);
        toast.error('Failed to load review data');
      } finally {
        setLoading(false);
      }
    };

    fetchReviewData();
  }, [reviewId]);

  // Get all currently used order fields with their locations
  const getUsedOrderFields = (): Set<string> => {
    const used = new Set<string>();
    currentMappings.forEach(mapping => {
      if (!mapping.isRemoved) {
        mapping.fields.forEach(field => {
          if (field.orderField) {
            used.add(field.orderField);
          }
        });
      }
    });
    return used;
  };

  // Find where a specific order field is used
  const findFieldUsage = (orderField: string): { csvHeader: string; fieldIndex: number } | null => {
    for (let mappingIndex = 0; mappingIndex < currentMappings.length; mappingIndex++) {
      const mapping = currentMappings[mappingIndex];
      if (!mapping.isRemoved) {
        for (let fieldIndex = 0; fieldIndex < mapping.fields.length; fieldIndex++) {
          const field = mapping.fields[fieldIndex];
          if (field.orderField === orderField) {
            return { csvHeader: mapping.csvHeader, fieldIndex };
          }
        }
      }
    }
    return null;
  };

  // Get available order fields for selection
  const getAvailableOrderFields = (): string[] => {
    const usedFields = getUsedOrderFields();
    const allFields = Object.values(ORDER_FIELDS_BY_CATEGORY).flat().map(field => field.value);
    // brokerMetadata can be used multiple times, so don't filter it out
    return allFields.filter(field => !usedFields.has(field) || field === 'brokerMetadata');
  };

  // Handle adding a new field to a mapping
  const addFieldToMapping = (csvHeader: string) => {
    const availableFields = getAvailableOrderFields();
    if (availableFields.length === 0) {
      toast.warning('No more order fields available');
      return;
    }

    const newMappings = [...currentMappings];
    const mappingIndex = newMappings.findIndex(m => m.csvHeader === csvHeader);

    if (mappingIndex >= 0) {
      newMappings[mappingIndex].fields.push({
        orderField: '',
        confidence: 1.0,
        isNew: true,
        isModified: false
      });
    }

    setCurrentMappings(newMappings);
  };

  // Handle removing a field from a mapping
  const removeFieldFromMapping = (csvHeader: string, fieldIndex: number) => {
    const newMappings = [...currentMappings];
    const mappingIndex = newMappings.findIndex(m => m.csvHeader === csvHeader);

    if (mappingIndex >= 0) {
      const mapping = newMappings[mappingIndex];

      // Don't allow removing if it's the last field
      if (mapping.fields.length <= 1) {
        // Instead of removing the field, mark the entire mapping as removed
        mapping.isRemoved = true;
        setRemovedHeaders([...removedHeaders, csvHeader]);
      } else {
        mapping.fields.splice(fieldIndex, 1);
      }
    }

    setCurrentMappings(newMappings);
  };

  // Handle field value change with swap detection
  const handleFieldChange = (csvHeader: string, fieldIndex: number, newOrderField: string) => {
    const existingUsage = findFieldUsage(newOrderField);

    // If field is already used elsewhere and it's not the same field, show swap dialog
    // Exception: brokerMetadata can be mapped to multiple headers since it becomes an object
    if (existingUsage &&
        !(existingUsage.csvHeader === csvHeader && existingUsage.fieldIndex === fieldIndex) &&
        newOrderField !== 'brokerMetadata') {
      setSwapDialog({
        isOpen: true,
        newField: newOrderField,
        currentMapping: { csvHeader, fieldIndex },
        conflictMapping: existingUsage
      });
      return;
    }

    // No conflict, apply the change directly
    applyFieldChange(csvHeader, fieldIndex, newOrderField);
  };

  // Apply field change without conflict checking
  const applyFieldChange = (csvHeader: string, fieldIndex: number, newOrderField: string) => {
    const newMappings = [...currentMappings];
    const mappingIndex = newMappings.findIndex(m => m.csvHeader === csvHeader);

    if (mappingIndex >= 0) {
      const field = newMappings[mappingIndex].fields[fieldIndex];
      const originalField = originalMappings[mappingIndex]?.fields[fieldIndex];

      field.orderField = newOrderField;
      field.isModified = originalField ? newOrderField !== originalField.orderField : false;
      field.confidence = 1.0; // Admin changes have full confidence
    }

    setCurrentMappings(newMappings);
  };

  // Handle field swap confirmation
  const handleSwapConfirm = () => {
    const { newField, currentMapping, conflictMapping } = swapDialog;

    // Clear the field from the conflicting mapping
    const newMappings = [...currentMappings];
    const conflictMappingIndex = newMappings.findIndex(m => m.csvHeader === conflictMapping.csvHeader);

    if (conflictMappingIndex >= 0) {
      const conflictField = newMappings[conflictMappingIndex].fields[conflictMapping.fieldIndex];
      conflictField.orderField = ''; // Clear the field, user will need to reassign
      conflictField.isModified = true;
      conflictField.confidence = 1.0;
    }

    setCurrentMappings(newMappings);

    // Apply the new field to the current mapping
    applyFieldChange(currentMapping.csvHeader, currentMapping.fieldIndex, newField);

    // Close dialog
    setSwapDialog({ isOpen: false, newField: '', currentMapping: { csvHeader: '', fieldIndex: -1 }, conflictMapping: { csvHeader: '', fieldIndex: -1 } });

    toast.success(`Field moved from "${conflictMapping.csvHeader}" to "${currentMapping.csvHeader}". Please reassign a field to "${conflictMapping.csvHeader}".`);
  };

  // Handle field swap cancellation
  const handleSwapCancel = () => {
    setSwapDialog({ isOpen: false, newField: '', currentMapping: { csvHeader: '', fieldIndex: -1 }, conflictMapping: { csvHeader: '', fieldIndex: -1 } });
  };

  // Add new mapping from unmapped headers
  const addNewMapping = () => {
    if (!data) return;

    const availableHeaders = [
      ...data.unmappedHeaders,
      ...removedHeaders
    ].filter(header =>
      !currentMappings.some(m => m.csvHeader === header && !m.isRemoved)
    );

    if (availableHeaders.length === 0) {
      toast.warning('No unmapped headers available');
      return;
    }

    const newMapping: MappingPair = {
      csvHeader: availableHeaders[0],
      fields: [{
        orderField: '',
        confidence: 1.0,
        isNew: true,
        isModified: false
      }],
      isRemoved: false
    };

    setCurrentMappings([...currentMappings, newMapping]);

    // Remove from removed headers if it was there
    setRemovedHeaders(removedHeaders.filter(h => h !== availableHeaders[0]));
  };

  // Remove entire mapping
  const removeMapping = (csvHeader: string) => {
    const newMappings = [...currentMappings];
    const mappingIndex = newMappings.findIndex(m => m.csvHeader === csvHeader);

    if (mappingIndex >= 0) {
      const mapping = newMappings[mappingIndex];

      // If it's a new mapping, remove it completely
      if (mapping.fields.every(f => f.isNew)) {
        newMappings.splice(mappingIndex, 1);
      } else {
        // Otherwise, mark as removed
        mapping.isRemoved = true;
        setRemovedHeaders([...removedHeaders, csvHeader]);
      }
    }

    setCurrentMappings(newMappings);
  };

  // Reset to original mappings
  const resetMappings = () => {
    setCurrentMappings([...originalMappings]);
    setRemovedHeaders([]);
    setAdminNotes('');
    toast.success('Mappings reset to original');
  };

  // Convert current mappings to API format
  const convertMappingsForAPI = (): any[] => {
    const apiMappings: any[] = [];

    currentMappings.forEach(mapping => {
      if (!mapping.isRemoved) {
        mapping.fields.forEach(field => {
          if (field.orderField) { // Only include fields with selected order field
            apiMappings.push({
              csvHeader: mapping.csvHeader,
              orderField: field.orderField,
              confidence: field.confidence || 1.0,
              isNew: field.isNew || false,
              isModified: field.isModified || false
            });
          }
        });
      }
    });

    return apiMappings;
  };

  // Submit mappings
  const submitMappings = async () => {
    if (!data) return;

    const apiMappings = convertMappingsForAPI();

    // Validate that all mappings have order fields selected
    const hasEmptyFields = currentMappings.some(mapping =>
      !mapping.isRemoved && mapping.fields.some(field => !field.orderField)
    );

    if (hasEmptyFields) {
      toast.error('All mapping fields must have an order field selected');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/admin/ai-reviews/${reviewId}/mappings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mappings: apiMappings,
          adminNotes
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update mappings');
      }

      const result = await response.json();
      toast.success(result.message);
      onMappingsUpdated();
    } catch (error) {
      console.error('Error updating mappings:', error);
      toast.error('Failed to update mappings');
    } finally {
      setSubmitting(false);
    }
  };

  // Get changes summary
  const getChangesSummary = () => {
    let modified = 0;
    let added = 0;
    const removed = removedHeaders.length;

    currentMappings.forEach(mapping => {
      if (!mapping.isRemoved) {
        mapping.fields.forEach(field => {
          if (field.isNew) added++;
          if (field.isModified) modified++;
        });
      }
    });

    return { modified, added, removed };
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading mapping details...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            Failed to load review data
          </div>
        </CardContent>
      </Card>
    );
  }

  const changes = getChangesSummary();
  const hasChanges = changes.modified > 0 || changes.added > 0 || changes.removed > 0;

  return (
    <div className="space-y-6">
      {/* Review Info Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>Review Mapping: {data.review.csvUploadLog.filename}</span>
              <Badge variant="outline">
                {Math.round(data.review.aiConfidence * 100)}% AI Confidence
              </Badge>
            </div>
            <Button variant="outline" onClick={onClose}>
              Close Review
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium">User:</span> {data.review.user.name || data.review.user.email}
            </div>
            <div>
              <span className="font-medium">Format:</span> {data.review.brokerCsvFormat.formatName}
            </div>
            <div>
              <span className="font-medium">Rows:</span> {data.review.csvUploadLog.rowCount}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Changes Summary */}
      {hasChanges && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">Changes Summary:</span>
              {changes.modified > 0 && <span>{changes.modified} modified</span>}
              {changes.added > 0 && <span>{changes.added} added</span>}
              {changes.removed > 0 && <span>{changes.removed} removed</span>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mappings Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>CSV Header to Order Field Mappings</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={addNewMapping}
                disabled={!data.unmappedHeaders.length && !removedHeaders.length}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Mapping
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={resetMappings}
                disabled={!hasChanges}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {currentMappings.map((mapping, mappingIndex) => (
              !mapping.isRemoved && (
                <div key={mapping.csvHeader} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-lg">{mapping.csvHeader}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => addFieldToMapping(mapping.csvHeader)}
                        disabled={getAvailableOrderFields().length === 0}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMapping(mapping.csvHeader)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {mapping.fields.map((field, fieldIndex) => (
                      <div key={`${mapping.csvHeader}-${fieldIndex}-${field.orderField || 'empty'}`} className="flex items-center gap-2 ml-4">
                        <CornerDownRight className="h-4 w-4 text-gray-400" />
                        <Select
                          value={field.orderField || ""}
                          onValueChange={(value) => handleFieldChange(mapping.csvHeader, fieldIndex, value)}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select order field..." />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(ORDER_FIELDS_BY_CATEGORY).map(([category, fields]) => (
                              <div key={category}>
                                <div className="px-2 py-1 text-xs font-medium text-gray-500 bg-gray-50 bg-opacity-100">
                                  {category}
                                </div>
                                {fields.map(orderField => {
                                  const isUsed = getUsedOrderFields().has(orderField.value);
                                  const isCurrentField = field.orderField === orderField.value;

                                  return (
                                    <SelectItem
                                      key={orderField.value}
                                      value={orderField.value}
                                      className=""
                                    >
                                      <div className="flex flex-col">
                                        <span className={isUsed && !isCurrentField && orderField.value !== 'brokerMetadata' ? 'text-orange-600' : ''}>
                                          {orderField.label} {isUsed && !isCurrentField && orderField.value !== 'brokerMetadata' ? '(will move from other field)' : ''}
                                        </span>
                                        {orderField.description && (
                                          <span className="text-xs text-gray-500">{orderField.description}</span>
                                        )}
                                      </div>
                                    </SelectItem>
                                  );
                                })}
                              </div>
                            ))}
                          </SelectContent>
                        </Select>

                        <div className="flex items-center gap-2">
                          <Badge variant={field.confidence && field.confidence >= 0.8 ? 'default' : 'secondary'}>
                            {Math.round((field.confidence || 0) * 100)}%
                          </Badge>

                          {field.isNew && <Badge variant="outline">New</Badge>}
                          {field.isModified && <Badge variant="secondary">Modified</Badge>}

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFieldFromMapping(mapping.csvHeader, fieldIndex)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Removed Mappings */}
      {removedHeaders.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">Removed Mappings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {removedHeaders.map(header => (
                <Badge key={header} variant="destructive">
                  {header}
                </Badge>
              ))}
            </div>
            <p className="text-sm text-red-700 mt-2">
              These headers will be moved to metadata. You can re-add them using "Add Mapping".
            </p>
          </CardContent>
        </Card>
      )}

      {/* Sample Data Preview */}
      {data.sampleData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              Sample Data Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {Object.keys(data.sampleData[0]).map(header => (
                      <TableHead key={header}>{header}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.sampleData.map((row, index) => (
                    <TableRow key={index}>
                      {Object.values(row).map((value, cellIndex) => (
                        <TableCell key={cellIndex}>
                          {String(value)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admin Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Admin Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Add any notes about this review..."
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            rows={3}
          />
        </CardContent>
      </Card>

      {/* CSV File Contents */}
      {data.csvFileContent && (
        <Card>
          <CardHeader>
            <CardTitle>Raw CSV File Contents</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={data.csvFileContent}
              readOnly
              className="font-mono text-xs resize-none h-96 overflow-y-auto"
              placeholder="CSV file contents not available"
            />
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <Button
          onClick={() => submitMappings()}
          disabled={submitting}
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          {submitting ? 'Approving...' : hasChanges ? 'Approve Corrections' : 'Approve Mappings'}
        </Button>
      </div>

      {/* Field Swap Confirmation Dialog */}
      <AlertDialog open={swapDialog.isOpen} onOpenChange={handleSwapCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move Field Mapping?</AlertDialogTitle>
            <AlertDialogDescription>
              The field "{swapDialog.newField}" is already mapped to "{swapDialog.conflictMapping.csvHeader}".
              <br /><br />
              Do you want to move this field mapping from "{swapDialog.conflictMapping.csvHeader}" to "{swapDialog.currentMapping.csvHeader}"?
              <br /><br />
              <strong>Note:</strong> This will clear the field from "{swapDialog.conflictMapping.csvHeader}" and you'll need to select a new field for that header.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleSwapCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSwapConfirm}>
              Yes, Move Field
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}