import { useState, useEffect, useRef, useCallback } from "react";

// Common Indian crop names for auto-suggest
const CROP_SUGGESTIONS = [
  "Rice","Wheat","Maize","Tomato","Onion","Potato","Brinjal","Okra","Spinach",
  "Cauliflower","Cabbage","Carrot","Radish","Cucumber","Bitter Gourd","Bottle Gourd",
  "Ridge Gourd","Pumpkin","Watermelon","Mango","Banana","Papaya","Guava","Pomegranate",
  "Apple","Grapes","Orange","Lemon","Coconut","Sugarcane","Cotton","Groundnut",
  "Soybean","Mustard","Sunflower","Turmeric","Chilli","Ginger","Garlic","Coriander",
  "Cumin","Black Pepper","Cardamom","Cloves","Fenugreek","Mint","Curry Leaves",
  "Drumstick","Sweet Potato","Green Peas","Bengal Gram","Red Gram","Black Gram",
  "Jowar","Bajra","Ragi","Millets","Sesame","Cashew","Arecanut","Tea","Coffee"
];

// Indian cities for auto-suggest
const CITY_SUGGESTIONS = [
  "Hyderabad","Warangal","Nizamabad","Karimnagar","Khammam","Ramagundam",
  "Vijayawada","Visakhapatnam","Guntur","Tirupati","Nellore","Kurnool","Rajahmundry",
  "Bengaluru","Mysuru","Hubli","Mangaluru","Belgaum",
  "Chennai","Coimbatore","Madurai","Salem","Tiruchirappalli",
  "Mumbai","Pune","Nagpur","Nashik","Aurangabad",
  "Delhi","Noida","Gurugram","Faridabad",
  "Kolkata","Lucknow","Jaipur","Ahmedabad","Bhopal","Indore","Patna","Ranchi",
  "Chandigarh","Surat","Vadodara","Thiruvananthapuram","Kochi"
];

const STATE_SUGGESTIONS = [
  "Andhra Pradesh","Telangana","Karnataka","Tamil Nadu","Kerala",
  "Maharashtra","Gujarat","Rajasthan","Uttar Pradesh","Madhya Pradesh",
  "West Bengal","Bihar","Jharkhand","Odisha","Chhattisgarh",
  "Punjab","Haryana","Himachal Pradesh","Uttarakhand","Assam",
  "Goa","Jammu & Kashmir","Delhi"
];

const SUGGESTION_MAP = {
  crop: CROP_SUGGESTIONS,
  city: CITY_SUGGESTIONS,
  state: STATE_SUGGESTIONS,
  name: [],
  default: []
};

export function useAutoSuggest(fieldType = "default") {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Load user's previous inputs from localStorage
  const getUserHistory = useCallback(() => {
    try {
      const stored = localStorage.getItem(`rs_suggest_${fieldType}`);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  }, [fieldType]);

  const saveToHistory = useCallback((value) => {
    if (!value || value.length < 2) return;
    try {
      const history = getUserHistory();
      const updated = [value, ...history.filter(h => h !== value)].slice(0, 20);
      localStorage.setItem(`rs_suggest_${fieldType}`, JSON.stringify(updated));
    } catch {}
  }, [fieldType, getUserHistory]);

  const updateSuggestions = useCallback((text) => {
    setQuery(text);
    if (!text || text.length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const baseSuggestions = SUGGESTION_MAP[fieldType] || [];
    const history = getUserHistory();
    const allSuggestions = [...new Set([...history, ...baseSuggestions])];

    const lower = text.toLowerCase();
    const filtered = allSuggestions
      .filter(s => s.toLowerCase().includes(lower) && s.toLowerCase() !== lower)
      .slice(0, 8);

    setSuggestions(filtered);
    setSelectedIndex(-1);
    setShowSuggestions(filtered.length > 0);
  }, [fieldType, getUserHistory]);

  const handleKeyDown = useCallback((e, onSelect) => {
    if (!showSuggestions) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      const selected = suggestions[selectedIndex];
      onSelect(selected);
      saveToHistory(selected);
      setShowSuggestions(false);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  }, [showSuggestions, suggestions, selectedIndex, saveToHistory]);

  const selectSuggestion = useCallback((value, onSelect) => {
    onSelect(value);
    saveToHistory(value);
    setShowSuggestions(false);
  }, [saveToHistory]);

  const closeSuggestions = useCallback(() => {
    // Delay to allow click on suggestion
    setTimeout(() => setShowSuggestions(false), 200);
  }, []);

  return {
    suggestions,
    selectedIndex,
    showSuggestions,
    updateSuggestions,
    handleKeyDown,
    selectSuggestion,
    closeSuggestions,
    saveToHistory
  };
}
