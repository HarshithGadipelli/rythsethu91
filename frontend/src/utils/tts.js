export const playTTS = (text, langCode = "en") => {
  if (!("speechSynthesis" in window)) {
    console.warn("Text-to-Speech not supported in this browser.");
    return;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);

  // Map language context to SpeechSynthesis BCP 47 tags
  // We primarily support en, hi, te
  if (langCode === "te") {
    utterance.lang = "te-IN";
  } else if (langCode === "hi") {
    utterance.lang = "hi-IN";
  } else {
    utterance.lang = "en-IN"; // Default to Indian English accent
  }

  // Try to find a specific voice for the language to improve naturalness
  const voices = window.speechSynthesis.getVoices();
  const targetVoice = voices.find(v => v.lang.startsWith(utterance.lang));
  if (targetVoice) {
    utterance.voice = targetVoice;
  }

  // Configure speed and pitch slightly for clarity
  utterance.rate = 0.95; // Slightly slower for better comprehension
  utterance.pitch = 1.0;

  window.speechSynthesis.speak(utterance);
};
