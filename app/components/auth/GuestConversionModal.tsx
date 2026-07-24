import React from 'react';
import { Modal } from '../ui/Modal';
import { useUserStore } from '../../stores/useUserStore';
import { LogIn, Save, Zap } from 'lucide-react';

export const GuestConversionModal: React.FC = () => {
  const showModal = useUserStore(state => state.showGuestConversionModal);
  const setShowModal = useUserStore(state => state.setShowGuestConversionModal);
  
  if (!showModal) return null;

  const handleLogin = () => {
    window.location.href = '/login';
  };

  return (
    <Modal
      isOpen={showModal}
      onClose={() => setShowModal(false)}
      title="Save Your Workspace"
    >
      <div className="flex flex-col items-center p-4 text-center space-y-6">
        <div className="bg-primary/20 p-4 rounded-full">
          <Zap className="w-10 h-10 text-primary" />
        </div>
        
        <div>
          <h2 className="text-xl font-bold mb-2">You've reached the free tier limit!</h2>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto">
            You've executed code 15 times. To continue running code without limits and securely save your files to the cloud, please sign up.
          </p>
        </div>

        <div className="w-full space-y-3">
          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center space-x-2 bg-[#2ea043] hover:bg-[#2c974b] text-white py-2.5 rounded-md font-medium transition-colors"
          >
            <LogIn className="w-5 h-5" />
            <span>Log In or Sign Up</span>
          </button>
          <button
            onClick={() => setShowModal(false)}
            className="w-full flex items-center justify-center space-x-2 bg-transparent border border-border hover:bg-muted text-foreground py-2.5 rounded-md font-medium transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>I'll just browse my code</span>
          </button>
        </div>
        
        <p className="text-xs text-muted-foreground mt-4">
          By signing up, your local workspace will be automatically migrated to a permanent cloud project.
        </p>
      </div>
    </Modal>
  );
};
