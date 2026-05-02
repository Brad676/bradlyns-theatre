import { useEffect, useState } from "react";
import { Download, X, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "bt_install_dismissed";

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [iosVisible, setIosVisible] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(DISMISSED_KEY)) return;

    const ua = navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua);
    const standalone = ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone) ||
      window.matchMedia("(display-mode: standalone)").matches;

    if (standalone) return;

    if (ios) {
      setIsIos(true);
      const timer = setTimeout(() => setIosVisible(true), 2000);
      return () => clearTimeout(timer);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      const timer = setTimeout(() => setVisible(true), 2000);
      return () => clearTimeout(timer);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    setVisible(false);
    setIosVisible(false);
    sessionStorage.setItem(DISMISSED_KEY, "1");
  };

  const install = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    await deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    setInstalling(false);
    if (result.outcome === "accepted") {
      setVisible(false);
    }
    setDeferredPrompt(null);
  };

  const show = visible || iosVisible;
  if (!show) return null;

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[999] w-[calc(100%-2rem)] max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-300"
      style={{ filter: "drop-shadow(0 0 20px rgba(0,243,255,0.25))" }}
    >
      <div className="glass rounded-2xl border border-cyan-500/25 p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center flex-shrink-0">
          <Smartphone size={18} className="text-cyan-400" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm leading-tight">Install Bradlyn's Theatre</p>
          <p className="text-gray-400 text-xs mt-0.5 leading-snug">
            {isIos
              ? 'Tap the Share button then "Add to Home Screen"'
              : "Add to your home screen for the full app experience"}
          </p>

          {!isIos && (
            <button
              onClick={install}
              disabled={installing}
              className="mt-2.5 flex items-center gap-1.5 neon-btn text-xs px-3 py-1.5 rounded-lg font-medium disabled:opacity-50"
            >
              <Download size={12} />
              {installing ? "Installing…" : "Install App"}
            </button>
          )}
        </div>

        <button onClick={dismiss} className="text-gray-500 hover:text-white transition-colors flex-shrink-0">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
