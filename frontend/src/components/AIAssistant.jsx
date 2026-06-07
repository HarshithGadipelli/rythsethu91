import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, X, Sparkles, Send, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLocation } from "react-router-dom";
import { useLang } from "../context/LangContext";

export default function AIAssistant() {
  const { user } = useAuth();
  const { lang, t } = useLang();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Welcome message based on role
  useEffect(() => {
    if (isOpen && messages.length === 0 && user) {
      let welcomeMsg = `Hi ${user.name?.split(' ')[0]}! I'm your AI Assistant. `;
      if (user.role === "farmer") welcomeMsg += "Tell me what crop you'd like to list today. (e.g., 'I want to sell 50kg of organic tomatoes for 40 rupees')";
      else if (user.role === "customer" || location.pathname === "/marketplace") welcomeMsg += "What fresh produce are you looking for today? (e.g., 'Show me fresh organic apples')";
      else welcomeMsg += "How can I help you today?";

      setMessages([{ role: "assistant", text: welcomeMsg }]);
    }
  }, [isOpen, user, location.pathname, messages.length]);

  if (!user) return null; // Only show if logged in

  const initSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return null;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    
    // Map lang context to speech locale
    const localeMap = { en: "en-IN", te: "te-IN", hi: "hi-IN", kn: "kn-IN", ta: "ta-IN" };
    recognition.lang = localeMap[lang] || "en-IN";

    recognition.onresult = (event) => {
      let current = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        current += event.results[i][0].transcript;
      }
      setTranscript(current);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      // Once stopped, if we have a transcript, process it
      if (transcript.trim()) {
        handleProcessText(transcript.trim());
      }
    };

    return recognition;
  };

  const toggleListen = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setTranscript("");
      const recognition = initSpeechRecognition();
      if (recognition) {
        recognitionRef.current = recognition;
        recognition.start();
        setIsListening(true);
      }
    }
  };

  const handleProcessText = async (textToProcess) => {
    if (!textToProcess) return;
    
    // Add user message
    setMessages(prev => [...prev, { role: "user", text: textToProcess }]);
    setTranscript("");
    setLoading(true);

    // Determine context based on URL
    let contextStr = "general";
    if (location.pathname.includes("/farmer")) contextStr = "farmer_add_crop";
    else if (location.pathname.includes("/marketplace")) contextStr = "marketplace_search";

    try {
      const res = await fetch("http://localhost:5000/api/ai/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToProcess, context: contextStr })
      });
      const data = await res.json();
      
      if (data.data) {
        if (data.data.reply) {
          // Direct conversational reply
          setMessages(prev => [...prev, { role: "assistant", text: data.data.reply }]);
        } else {
          // Actionable form data
          window.dispatchEvent(new CustomEvent("ai_autofill", { 
            detail: { context: contextStr, parsedData: data.data } 
          }));

          let reply = "I've updated the form for you!";
          if (contextStr === "farmer_add_crop") reply = `Got it! Filled the form with: ${data.data.name || 'Crop'} - ${data.data.quantity || 0}${data.data.unit || 'kg'} at ₹${data.data.price || 0}`;
          if (contextStr === "marketplace_search") reply = `Searching the marketplace for: ${data.data.searchQuery || data.data.category || 'crops'}`;

          setMessages(prev => [...prev, { role: "assistant", text: reply }]);
        }
      } else {
        setMessages(prev => [...prev, { role: "assistant", text: "I couldn't quite understand that. Could you try rephrasing?" }]);
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: "assistant", text: "Oops, my connection to the AI engine failed. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && transcript.trim() && !isListening) {
      handleProcessText(transcript.trim());
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        style={{
          position: "fixed", bottom: "30px", right: "30px", zIndex: 9999,
          width: "60px", height: "60px", borderRadius: "50%",
          background: "linear-gradient(135deg, var(--green-mid), var(--green-deep))",
          color: "white", border: "none", boxShadow: "0 10px 25px rgba(22, 163, 74, 0.4)",
          display: isOpen ? "none" : "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer"
        }}
      >
        <Sparkles size={28} />
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            style={{
              position: "fixed", bottom: "30px", right: "30px", zIndex: 10000,
              width: "350px", height: "500px", background: "white",
              borderRadius: "24px", boxShadow: "0 15px 40px rgba(0,0,0,0.15)",
              display: "flex", flexDirection: "column", overflow: "hidden",
              border: "1px solid rgba(22, 163, 74, 0.1)"
            }}
          >
            {/* Header */}
            <div style={{ background: "linear-gradient(135deg, var(--green-mid), var(--green-deep))", padding: "1rem 1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center", color: "white" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Sparkles size={20} />
                <span style={{ fontWeight: 700, fontFamily: "Outfit, sans-serif", fontSize: "1.1rem" }}>Rythu AI Assistant</span>
              </div>
              <button onClick={() => setIsOpen(false)} style={{ background: "transparent", border: "none", color: "white", cursor: "pointer", display: "flex" }}>
                <X size={20} />
              </button>
            </div>

            {/* Chat Area */}
            <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem", background: "#f8fafc" }}>
              {messages.map((msg, i) => (
                <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{
                    maxWidth: "80%", padding: "0.75rem 1rem", borderRadius: "16px",
                    background: msg.role === "user" ? "var(--green-mid)" : "white",
                    color: msg.role === "user" ? "white" : "var(--text-dark)",
                    boxShadow: msg.role === "user" ? "none" : "0 2px 10px rgba(0,0,0,0.03)",
                    border: msg.role === "user" ? "none" : "1px solid #e2e8f0",
                    borderBottomRightRadius: msg.role === "user" ? "4px" : "16px",
                    borderBottomLeftRadius: msg.role === "assistant" ? "4px" : "16px",
                    fontSize: "0.9rem", lineHeight: 1.5
                  }}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ display: "flex", justifyContent: "flex-start" }}>
                  <div style={{ background: "white", padding: "0.75rem 1rem", borderRadius: "16px", borderBottomLeftRadius: "4px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--green-mid)" }}>
                    <Loader2 size={16} className="lucide-spin" style={{ animation: "spin 2s linear infinite" }} /> Thinking...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div style={{ padding: "1rem", background: "white", borderTop: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <button 
                onClick={toggleListen}
                style={{
                  width: "40px", height: "40px", borderRadius: "50%", flexShrink: 0,
                  background: isListening ? "#fee2e2" : "#f1f5f9",
                  color: isListening ? "#ef4444" : "var(--text-mid)",
                  border: "none", display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", transition: "all 0.2s"
                }}
              >
                {isListening ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
              
              <input 
                type="text" 
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isListening ? "Listening..." : "Type or speak..."}
                style={{
                  flex: 1, padding: "0.6rem 1rem", borderRadius: "100px",
                  border: "1px solid #e2e8f0", outline: "none", fontSize: "0.9rem",
                  background: isListening ? "#f8fafc" : "white"
                }}
                disabled={isListening}
              />
              
              <button 
                onClick={() => handleProcessText(transcript.trim())}
                disabled={!transcript.trim() || isListening}
                style={{
                  width: "40px", height: "40px", borderRadius: "50%", flexShrink: 0,
                  background: transcript.trim() && !isListening ? "var(--green-mid)" : "#f1f5f9",
                  color: transcript.trim() && !isListening ? "white" : "#cbd5e1",
                  border: "none", display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", transition: "all 0.2s"
                }}
              >
                <Send size={18} />
              </button>
            </div>
            
            {/* Spinning keyframes added inline for Loader2 */}
            <style>{`
              @keyframes spin { 100% { transform: rotate(360deg); } }
            `}</style>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
