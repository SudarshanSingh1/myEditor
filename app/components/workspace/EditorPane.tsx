/* eslint-disable react-hooks/exhaustive-deps */
/* oxlint-disable react-hooks/exhaustive-deps */
import React, { useEffect, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { workspaceApi } from '../../lib/api/workspace';
const MonacoWrapper = React.lazy(() => import('./MonacoWrapper').then(m => ({ default: m.MonacoWrapper })));
import { AlertCircle, FileX } from 'lucide-react';
import { SudarshanaMandala } from '../ui/SplashLoader';
import { useSaveStore } from '../../stores/useSaveStore';
import { useEditorStore } from '../../stores/useEditorStore';

interface EditorPaneProps {
  fileId: string;
}

export const EditorPane: React.FC<EditorPaneProps> = React.memo(({ fileId }) => {
  const projectId = useEditorStore(state => state.projectId);
  const tabName = useEditorStore(state => state.tabs.find(t => t.id === fileId)?.name);
  const localContent = useEditorStore(state => state.localContents[fileId]);
  
  const isVirtual = !projectId || fileId.startsWith('guest-') || fileId.length < 20;

  const { data: serverFileNode, isLoading: isQueryLoading, isError, error } = useQuery({
    queryKey: ['workspace', 'file', fileId],
    queryFn: () => workspaceApi.getFile(fileId),
    retry: 1, 
    staleTime: 5 * 60 * 1000, 
    enabled: !isVirtual,
  });

  const { setFileVersion } = useSaveStore();

  const fileNode = isVirtual 
    ? { 
        id: fileId, 
        name: tabName || fileId, 
        content: localContent || '',
        version: 1 
      } 
    : serverFileNode;

  useEffect(() => {
    if (fileNode && !isVirtual) {
      setFileVersion(fileNode.id, fileNode.version);
    }
  }, [fileNode, setFileVersion, isVirtual]);

  const isLoading = !isVirtual && isQueryLoading;

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 bg-background">
          <SudarshanaMandala className="w-12 h-12 mb-4" color="purple" />
        <p className="text-sm">Loading file content...</p>
      </div>
    );
  }

  if (!isVirtual && (isError || !fileNode)) {
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
      <Suspense fallback={
        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 bg-background">
            <SudarshanaMandala className="w-12 h-12 mb-4" color="purple" />
          <p className="text-sm">Loading editor...</p>
        </div>
      }>
        <MonacoWrapper 
          fileId={fileNode!.id} 
          filename={fileNode!.name} 
          initialContent={fileNode!.content || ''} 
        />
      </Suspense>
    </div>
  );
});
