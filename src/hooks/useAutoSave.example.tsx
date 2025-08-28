// Example integration of useAutoSave hook in the Records page
// This shows how to replace the existing notes implementation

'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAutoSave } from '@/hooks/useAutoSave';
import { CheckCircle, AlertCircle, Clock, Save } from 'lucide-react';

// Example API function for saving records notes
async function saveRecordsNotes(notes: string): Promise<void> {
  const response = await fetch('/api/records/notes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      notes,
      date: new Date().toISOString().split('T')[0] // Today's date
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to save notes');
  }
}

// Status indicator component
interface StatusIndicatorProps {
  status: 'idle' | 'pending' | 'saving' | 'success' | 'error';
  error: string | null;
  hasUnsavedChanges: boolean;
}

function StatusIndicator({ status, error, hasUnsavedChanges }: StatusIndicatorProps) {
  const getStatusDisplay = () => {
    switch (status) {
      case 'pending':
        return {
          icon: <Clock className="h-3 w-3 text-orange-500" />,
          text: 'Will save in 3s...',
          className: 'text-orange-600'
        };
      case 'saving':
        return {
          icon: <Save className="h-3 w-3 text-blue-500 animate-pulse" />,
          text: 'Saving...',
          className: 'text-blue-600'
        };
      case 'success':
        return {
          icon: <CheckCircle className="h-3 w-3 text-green-500" />,
          text: 'Saved',
          className: 'text-green-600'
        };
      case 'error':
        return {
          icon: <AlertCircle className="h-3 w-3 text-red-500" />,
          text: error || 'Save failed',
          className: 'text-red-600'
        };
      default:
        return hasUnsavedChanges
          ? {
              icon: <div className="h-3 w-3 bg-gray-400 rounded-full" />,
              text: 'Unsaved changes',
              className: 'text-gray-600'
            }
          : {
              icon: <CheckCircle className="h-3 w-3 text-gray-400" />,
              text: 'Up to date',
              className: 'text-gray-500'
            };
    }
  };

  const { icon, text, className } = getStatusDisplay();

  return (
    <div className={`flex items-center gap-1 text-xs ${className}`}>
      {icon}
      <span>{text}</span>
    </div>
  );
}

// Enhanced Records Notes Component
export function RecordsNotesSection() {
  // Initialize the auto-save hook
  const {
    value: notes,
    setValue: setNotes,
    status,
    isSaving,
    error,
    save,
    clearError,
    hasUnsavedChanges
  } = useAutoSave({
    initialValue: '',
    saveFunction: saveRecordsNotes,
    debounceMs: 3000, // 3 second debounce
    enabled: true
  });

  // Handle manual save (for Create Note button)
  const handleManualSave = async () => {
    try {
      await save();
    } catch (err) {
      // Error is already handled by the hook
      console.error('Manual save failed:', err);
    }
  };

  // Clear error when user focuses on textarea
  const handleFocus = () => {
    if (error) {
      clearError();
    }
  };

  return (
    <Card className="bg-surface border-default">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <CardTitle className="text-base font-medium text-primary">Notes</CardTitle>
          <StatusIndicator 
            status={status} 
            error={error} 
            hasUnsavedChanges={hasUnsavedChanges} 
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleManualSave}
            disabled={isSaving || !hasUnsavedChanges}
            className={`h-8 px-3 text-xs rounded font-medium transition-colors ${
              hasUnsavedChanges && !isSaving
                ? 'bg-positive hover:bg-positive text-white'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isSaving ? 'Saving...' : 'Save Now'}
          </button>
          <button className="h-8 px-3 text-xs border border-gray-300 rounded font-medium hover:bg-gray-50">
            Insert template
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <Textarea 
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onFocus={handleFocus}
          placeholder="Click here to start typing your notes... (Auto-saves after 3 seconds)"
          className={`min-h-[120px] resize-none transition-colors ${
            error ? 'border-red-300 focus:border-red-500' : ''
          }`}
          disabled={isSaving}
        />
        {error && (
          <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
            <button 
              onClick={clearError}
              className="ml-2 text-xs underline hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        )}
        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
          <span>Auto-save every 3 seconds after you stop typing</span>
          <div className="flex items-center gap-4">
            <span>{notes.length} characters</span>
            {hasUnsavedChanges && (
              <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                Unsaved
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Example of how to use in a more complex scenario with multiple auto-save fields
export function AdvancedRecordsExample() {
  // Multiple auto-save hooks for different fields
  const notesAutoSave = useAutoSave({
    initialValue: '',
    saveFunction: async (notes: string) => {
      await fetch('/api/records/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes })
      });
    },
    debounceMs: 3000
  });

  const tagsAutoSave = useAutoSave({
    initialValue: [] as string[],
    saveFunction: async (tags: string[]) => {
      await fetch('/api/records/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags })
      });
    },
    debounceMs: 2000 // Shorter debounce for tags
  });

  const strategiesAutoSave = useAutoSave({
    initialValue: { primary: '', secondary: '' },
    saveFunction: async (strategies: { primary: string; secondary: string }) => {
      await fetch('/api/records/strategies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategies })
      });
    },
    debounceMs: 3000
  });

  return (
    <div className="space-y-6">
      <RecordsNotesSection />
      
      {/* Additional auto-saved fields would go here */}
      <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded">
        <strong>Auto-save Status:</strong>
        <ul className="mt-1 space-y-1">
          <li>Notes: {notesAutoSave.status} ({notesAutoSave.hasUnsavedChanges ? 'Has changes' : 'Up to date'})</li>
          <li>Tags: {tagsAutoSave.status} ({tagsAutoSave.hasUnsavedChanges ? 'Has changes' : 'Up to date'})</li>
          <li>Strategies: {strategiesAutoSave.status} ({strategiesAutoSave.hasUnsavedChanges ? 'Has changes' : 'Up to date'})</li>
        </ul>
      </div>
    </div>
  );
}