import { useState, useCallback } from 'react';
import { ToastContext, type ToastType } from './ToastContext';
import { ToastContainer } from './ToastContainer';

let idCounter = 0;

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [ toasts, setToasts ] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = "info") => {
    const id = idCounter++;

    setToasts((prev) => [ ... prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      { children }
      <ToastContainer toasts={toasts} />
    </ToastContext.Provider>
  );
}
