import React from 'react';
import { useEditorStore } from '../../stores/useEditorStore';
import { Modal } from '../ui/Modal';
import { Settings2 } from 'lucide-react';

interface EditorSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const THEME_OPTIONS = [
  { value: 'system', label: 'System Default' },
  { value: 'vs-dark', label: 'VS Dark' },
  { value: 'vs-light', label: 'VS Light' },
  { value: 'dracula', label: 'Dracula' },
  { value: 'monokai', label: 'Monokai' },
  { value: 'github-dark', label: 'GitHub Dark' },
  { value: 'night-owl', label: 'Night Owl' },
];

export const EditorSettingsModal: React.FC<EditorSettingsModalProps> = ({ isOpen, onClose }) => {
  const settings = useEditorStore(state => state.settings);
  const updateSettings = useEditorStore(state => state.updateSettings);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Editor Settings"
      description="Customize your code editing experience"
    >
      <div className="space-y-6 py-4">
        {/* Theme Settings */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-foreground flex items-center">
            <Settings2 className="w-4 h-4 mr-2 text-primary" />
            Appearance
          </h3>
          
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Theme
              </label>
              <select 
                value={settings.theme}
                onChange={(e) => updateSettings({ theme: e.target.value as any })}
                className="w-full h-10 px-3 rounded-md bg-muted border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
              >
                {THEME_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <hr className="border-border" />

        {/* Behavior Settings */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-foreground">Behavior</h3>
          
          <div className="space-y-3">
            <label className="flex items-center space-x-3 cursor-pointer group">
              <div className="relative">
                <input 
                  type="checkbox"
                  className="sr-only"
                  checked={settings.syntaxValidation}
                  onChange={(e) => updateSettings({ syntaxValidation: e.target.checked })}
                />
                <div className={`w-10 h-5 rounded-full shadow-inner transition-colors ${settings.syntaxValidation ? 'bg-primary' : 'bg-muted border border-border'}`}></div>
                <div className={`absolute left-1 top-1 w-3 h-3 rounded-full bg-white transition-transform ${settings.syntaxValidation ? 'translate-x-5' : 'translate-x-0'}`}></div>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">Syntax Validation (Linting)</span>
                <span className="text-xs text-muted-foreground">Show red squiggly lines for syntax errors</span>
              </div>
            </label>
          </div>
        </div>
      </div>
    </Modal>
  );
};
