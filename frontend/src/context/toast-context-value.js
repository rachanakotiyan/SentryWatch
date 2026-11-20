import { createContext } from "react";

export const ToastContext = createContext({
  toasts: [],
  showToast: () => {},
  removeToast: () => {},
});
