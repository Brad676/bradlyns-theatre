import { useEffect } from "react";

const GREETING = "Welcome to Bradlyn's theatre. Relax and enjoy the streaming.";
const SESSION_KEY = "bt_greeted";

function pickFemaleVoice(): SpeechSynthesisVoice | null {
  const voices = speechSynthesis.getVoices();
  const femaleKeywords = ["female", "woman", "zira", "hazel", "victoria", "samantha", "karen", "moira", "tessa", "fiona", "susan", "catherine"];
  const female = voices.find((v) =>
    femaleKeywords.some((k) => v.name.toLowerCase().includes(k))
  );
  return female ?? voices.find((v) => v.lang.startsWith("en")) ?? voices[0] ?? null;
}

export function useWelcomeVoice(active: boolean) {
  useEffect(() => {
    if (!active) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;
    if (!("speechSynthesis" in window)) return;

    const speak = () => {
      const utterance = new SpeechSynthesisUtterance(GREETING);
      utterance.rate = 0.88;
      utterance.pitch = 1.15;
      utterance.volume = 0.92;
      const voice = pickFemaleVoice();
      if (voice) utterance.voice = voice;
      sessionStorage.setItem(SESSION_KEY, "1");
      speechSynthesis.speak(utterance);
    };

    if (speechSynthesis.getVoices().length > 0) {
      speak();
    } else {
      speechSynthesis.addEventListener("voiceschanged", speak, { once: true });
    }

    return () => {
      speechSynthesis.removeEventListener("voiceschanged", speak);
    };
  }, [active]);
}
