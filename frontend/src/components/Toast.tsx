import { useEffect, useState } from "react";
import "./Toast.css";

type ToastType = "success" | "error" | "warning" | "info";

interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

// Module-level ref so toast() can be called from anywhere without hooks
let _add: ((msg: string, type: ToastType) => void) | null = null;

export function toast(message: string, type: ToastType = "info") {
  _add?.(message, type);
}
export const toastSuccess = (msg: string) => toast(msg, "success");
export const toastError   = (msg: string) => toast(msg, "error");
export const toastWarning = (msg: string) => toast(msg, "warning");

const ICONS: Record<ToastType, string> = {
  success: "✓",
  error:   "✕",
  warning: "⚠",
  info:    "ℹ",
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    _add = (message, type) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3500);
    };
    return () => { _add = null; };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span className="toast-icon">{ICONS[t.type]}</span>
          <span className="toast-message">{t.message}</span>
        </div>
      ))}
    </div>
  );
}
