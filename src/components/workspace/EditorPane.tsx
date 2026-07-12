import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { workspaceApi } from '../../lib/api/workspace';
import { MonacoWrapper } from './MonacoWrapper';
import { AlertCircle, FileX, Loader2 } from 'lucide-react';
import { useSaveStore } from '../../store/useSaveStore';

interface EditorPaneProps {
  fileId: string;
}

export const EditorPane: React.FC<EditorPaneProps> = ({ fileId }) => {
  const { data: fileNode, isLoading, isError, error } = useQuery({
    queryKey: ['workspace', 'file', fileId],
    queryFn: () => workspaceApi.getFile(fileId),
    retry: 1, // Only retry once to avoid long hangs on deleted files
    staleTime: 5 * 60 * 1000, // 5 minutes cache to prevent constant refetching while switching tabs
  });

  const { setFileVersion } = useSaveStore();

  useEffect(() => {
    if (fileNode) {
      setFileVersion(fileNode.id, fileNode.version);
    }
  }, [fileNode, setFileVersion]);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 bg-background">
        <Loader2 className="animate-spin mb-4" size={32} />
        <p className="text-sm">Loading file content...</p>
      </div>
    );
  }

  if (isError || !fileNode) {
    const errMessage = (error as any)?.message || 'File not found or access denied';
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 bg-background p-8 text-center">
        <FileX className="mx-auto h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">Cannot Load File</h3>
        <p className="text-sm max-w-md bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded flex items-start text-left">
          <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
          <span>{errMessage}</span>
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      {/* File path breadcrumbs or header could go here if requested, but tabs cover it mostly */}
      <MonacoWrapper 
        fileId={fileNode.id} 
        filename={fileNode.name} 
        initialContent={fileNode.content || ''} 
      />
    </div>
  );
};
