import { useState, useCallback } from "react";

export function useVoiceInput(lang = "en") {
  const [listening, setListening] = useState(false);

  const langMap = {
    en: "en-IN",
    te: "te-IN",
    hi: "hi-IN",
    kn: "kn-IN",
    ta: "ta-IN"
  };

  const startListening = useCallback((onResult) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser. Use Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = langMap[lang] || "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      onResult(transcript);
      setListening(false);
    };

    recognition.start();
  }, [lang]);

  return { listening, startListening };
}
