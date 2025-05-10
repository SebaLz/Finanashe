"use client";

import { useState, createContext, useContext, ReactNode } from "react";

type ToastProps = {
  title?: string;
  description?: string;
  variant?: "default" | "success" | "destructive" | "warning";
  duration?: number;
};

type ToastContextType = {
  toast: (props: ToastProps) => void;
  toasts: ToastProps[];
  dismissToast: (index: number) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const toast = (props: ToastProps) => {
    const newToast = {
      ...props,
      duration: props.duration || 5000,
      variant: props.variant || "default",
    };
    
    setToasts((prev) => [...prev, newToast]);
    
    // Auto-dismiss after duration
    setTimeout(() => {
      setToasts((prev) => prev.slice(1));
    }, newToast.duration);
  };

  const dismissToast = (index: number) => {
    setToasts((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <ToastContext.Provider value={{ toast, toasts, dismissToast }}>
      {children}
      
      {/* Toast container */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
          {toasts.map((t, i) => (
            <div 
              key={i} 
              className={`p-4 rounded-md shadow-md max-w-sm animate-in slide-in-from-right-5 
                ${t.variant === 'success' ? 'bg-green-600 text-white' : 
                  t.variant === 'destructive' ? 'bg-red-600 text-white' : 
                  t.variant === 'warning' ? 'bg-amber-600 text-white' : 
                  'bg-white dark:bg-gray-800 border'}`}
            >
              {t.title && <h3 className="font-semibold">{t.title}</h3>}
              {t.description && <p className="text-sm mt-1">{t.description}</p>}
              <button 
                onClick={() => dismissToast(i)}
                className="absolute top-2 right-2 opacity-70 hover:opacity-100"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  
  return context;
} 