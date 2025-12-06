import { createContext, useContext } from "react";

export type ToastType = "success" | "info" | "error";

export interface ToastContextValue {
  addToast: (message: string, type?: ToastType) => void;
}

export const ToastContext = createContext<ToastContextValue>({
  addToast: () => {}
});

export const useToast = () => useContext(ToastContext);
