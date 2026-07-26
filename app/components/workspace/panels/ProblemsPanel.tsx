import React from 'react';
import { useProblemsStore } from '../../../stores/useProblemsStore';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '../../../lib/utils';

export const ProblemsPanel: React.FC = () => {
  const { problems } = useProblemsStore();

  const getIcon = (severity: string) => {
    switch (severity) {
      case 'Error': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'Warning': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'Info': return <Info className="w-4 h-4 text-blue-500" />;
      default: return null;
    }
  };

  if (problems.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
        No problems have been detected in the workspace.
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-background">
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead className="sticky top-0 bg-muted text-gray-600 dark:text-[#cccccc] shadow-sm z-10">
          <tr>
            <th className="px-4 py-2 font-medium w-8"></th>
            <th className="px-4 py-2 font-medium w-1/2">Message</th>
            <th className="px-4 py-2 font-medium w-1/4">File</th>
            <th className="px-4 py-2 font-medium w-24">Line</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-[#2d2d2d]">
          {problems.map((prob) => (
            <tr key={prob.id} className="hover:bg-gray-50 dark:hover:bg-[#2a2d2e] cursor-pointer group">
              <td className="px-4 py-1.5">{getIcon(prob.severity)}</td>
              <td className={cn(
                "px-4 py-1.5 truncate max-w-md",
                prob.severity === 'Error' ? "text-gray-900 dark:text-gray-200" : "text-gray-700 dark:text-gray-300"
              )}>
                {prob.message}
              </td>
              <td className="px-4 py-1.5 text-gray-500 dark:text-gray-400">
                {prob.fileName}
              </td>
              <td className="px-4 py-1.5 text-gray-500 dark:text-gray-400">
                {prob.line}:{prob.column}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
