import React, { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmOptions {
  title?: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};

export const ConfirmProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolver, setResolver] = useState<{ resolve: (value: boolean) => void } | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      setResolver({ resolve });
    });
  }, []);

  const handleConfirm = () => {
    if (resolver) {
      resolver.resolve(true);
      setResolver(null);
    }
    setIsOpen(false);
  };

  const handleCancel = () => {
    if (resolver) {
      resolver.resolve(false);
      setResolver(null);
    }
    setIsOpen(false);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {options && (
        <Modal
          isOpen={isOpen}
          onClose={handleCancel}
          title={options.title || 'Confirm Action'}
          description={options.description}
          footer={
            <>
              <Button variant="outline" onClick={handleCancel}>
                {options.cancelText || 'Cancel'}
              </Button>
              <Button 
                variant={options.variant || 'default'} 
                onClick={handleConfirm}
              >
                {options.confirmText || 'Confirm'}
              </Button>
            </>
          }
        >
          {null}
        </Modal>
      )}
    </ConfirmContext.Provider>
  );
};
