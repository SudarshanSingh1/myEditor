import React from 'react';
import { 
  File, FileText, FileCode, FileJson, 
  Settings, Image as ImageIcon,
  Database, Terminal, 
  Coffee, Package
} from 'lucide-react';

interface FileIconProps {
  name: string;
  className?: string;
  size?: number;
}

export const FileIcon: React.FC<FileIconProps> = ({ name, className = "", size = 16 }) => {
  const getIconInfo = (filename: string) => {
    const lowerName = filename.toLowerCase();
    
    // Exact matches
    if (lowerName === 'dockerfile' || lowerName === 'docker-compose.yml') {
      return { Icon: FileCode, color: 'text-blue-400' };
    }
    if (lowerName === 'package.json' || lowerName === 'package-lock.json') {
      return { Icon: Package, color: 'text-green-500' };
    }
    if (lowerName.startsWith('.env')) {
      return { Icon: Settings, color: 'text-gray-400' };
    }

    // Extensions
    const ext = filename.split('.').pop()?.toLowerCase();
    
    switch (ext) {
      case 'ts':
      case 'tsx':
        return { Icon: FileCode, color: 'text-blue-500' };
      case 'js':
      case 'jsx':
        return { Icon: FileCode, color: 'text-yellow-400' };
      case 'py':
        return { Icon: FileCode, color: 'text-blue-400' };
      case 'cpp':
      case 'c':
      case 'h':
      case 'hpp':
        return { Icon: FileCode, color: 'text-blue-600' };
      case 'html':
        return { Icon: FileCode, color: 'text-orange-500' };
      case 'css':
      case 'scss':
        return { Icon: FileCode, color: 'text-blue-400' };
      case 'json':
        return { Icon: FileJson, color: 'text-yellow-500' };
      case 'md':
        return { Icon: FileText, color: 'text-blue-300' };
      case 'sh':
      case 'bash':
        return { Icon: Terminal, color: 'text-green-400' };
      case 'sql':
        return { Icon: Database, color: 'text-blue-300' };
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'svg':
      case 'gif':
        return { Icon: ImageIcon, color: 'text-purple-400' };
      case 'java':
        return { Icon: Coffee, color: 'text-red-500' };
      default:
        return { Icon: File, color: 'text-gray-400' };
    }
  };

  const { Icon, color } = getIconInfo(name);

  return <Icon size={size} className={`${color} ${className}`} />;
};
