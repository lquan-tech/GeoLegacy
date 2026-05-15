import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, XCircle } from "lucide-react";
import { useEffect } from "react";
import { useChronoStore } from "../store/useStore";

const iconByVariant = {
  default: Info,
  success: CheckCircle2,
  error: XCircle,
};

const colorByVariant = {
  default: "border-slate-200 text-slate-600",
  success: "border-teal-200 text-teal-700",
  error: "border-red-200 text-red-700",
};

export default function Toast() {
  const toast = useChronoStore((state) => state.toast);
  const dismissToast = useChronoStore((state) => state.dismissToast);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      dismissToast();
    }, 2800);

    return () => window.clearTimeout(timer);
  }, [dismissToast, toast]);

  const Icon = iconByVariant[toast?.variant] ?? Info;
  const colorClass = colorByVariant[toast?.variant] ?? colorByVariant.default;

  return (
    <AnimatePresence>
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex justify-center px-4 md:inset-x-auto md:bottom-6 md:right-6 md:block md:px-0">
          <motion.div
            key={toast.id}
            initial={{ y: 18, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 12, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className={`pointer-events-auto flex w-[min(360px,calc(100vw-32px))] items-start gap-3 rounded-xl border bg-white/95 px-4 py-3 shadow-panel backdrop-blur-xl ${colorClass}`}
            role="status"
          >
            <Icon size={18} className="mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-950">{toast.title}</p>
              {toast.description && (
                <p className="mt-0.5 text-sm leading-5 text-slate-500">{toast.description}</p>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
