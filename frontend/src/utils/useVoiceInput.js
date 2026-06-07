import { useState, useCallback, useRef } from "react";

export function useVoiceInput(lang = "en") {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const recognitionRef = useRef(null);

  const langMap = {
    en: "en-IN",
    te: "te-IN",
    hi: "hi-IN",
    kn: "kn-IN",
    ta: "ta-IN"
  };

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setListening(false);
    setInterim("");
  }, []);

  const startListening = useCallback((onResult, options = {}) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition not supported. Please use Google Chrome.");
      return;
    }

    // Stop any existing recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    const recognition = new SpeechRecognition();
    recognition.lang = langMap[lang] || "en-IN";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setListening(true);
      setInterim("");
    };

    recognition.onend = () => {
      setListening(false);
      setInterim("");
      recognitionRef.current = null;
    };

    recognition.onerror = (e) => {
      setListening(false);
      setInterim("");
      recognitionRef.current = null;
      if (e.error === "not-allowed") {
        alert("🎤 Microphone access denied. Please allow microphone permission in your browser settings.");
      } else if (e.error === "no-speech") {
        // Silently ignore — user didn't speak
      } else if (e.error !== "aborted") {
        console.warn("Speech recognition error:", e.error);
      }
    };

    recognition.onresult = (e) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (interimTranscript) {
        setInterim(interimTranscript);
      }

      if (finalTranscript) {
        // APPEND mode: add spoken text to existing value
        if (options.replace) {
          onResult(finalTranscript.trim());
        } else {
          onResult((prev) => {
            const existing = typeof prev === "string" ? prev : "";
            const separator = existing && !existing.endsWith(" ") ? " " : "";
            return existing + separator + finalTranscript.trim();
          });
        }
        setInterim("");
        setListening(false);
      }
    };

    try {
      recognition.start();
    } catch (err) {
      console.warn("Failed to start speech recognition:", err);
      setListening(false);
    }
  }, [lang]);

  return { listening, interim, startListening, stopListening };
}
