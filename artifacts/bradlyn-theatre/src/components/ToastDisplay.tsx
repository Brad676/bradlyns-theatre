import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { useToast } from "@/context/ToastContext";

const icons = {
  success: <CheckCircle size={16} className="text-green-400" />,
  error: <AlertCircle size={16} className="text-red-400" />,
  info: <Info size={16} style={{ color: "var(--neon-cyan)" }} />,
  warning: <AlertTriangle size={16} className="text-yellow-400" />,
};

const borders = {
  success: "border-green-500/40",
  error: "border-red-500/40",
  info: "border-cyan-500/40",
  warning: "border-yellow-500/40",
};

export function ToastDisplay() {
  const { toasts, removeToast } = useToast();
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`animate-slide-right glass rounded-lg px-4 py-3 flex items-center gap-3 min-w-[250px] max-w-[350px] border ${borders[t.type]}`}>
          {icons[t.type]}
          <span className="text-sm text-white flex-1">{t.message}</span>
          <button onClick={() => removeToast(t.id)} className="text-gray-400 hover:text-white ml-2">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
