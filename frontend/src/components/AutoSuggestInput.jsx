import { useRef } from "react";
import { useAutoSuggest } from "../utils/useAutoSuggest";

export default function AutoSuggestInput({
  value, onChange, onSpeak, listening, interim,
  placeholder, type = "text", label, fieldType = "default",
  className = "rs-input", disabled = false
}) {
  const {
    suggestions, selectedIndex, showSuggestions,
    updateSuggestions, handleKeyDown, selectSuggestion, closeSuggestions
  } = useAutoSuggest(fieldType);
  const wrapperRef = useRef(null);

  const handleChange = (e) => {
    const val = e.target.value;
    onChange(val);
    updateSuggestions(val);
  };

  const handleSelect = (suggestion) => {
    selectSuggestion(suggestion, onChange);
  };

  return (
    <div className="form-group" style={{ position: "relative" }}>
      {label && <label className="field-label">{label}</label>}
      <div className="input-wrapper" ref={wrapperRef}>
        <input
          className={className}
          type={type}
          placeholder={placeholder}
          value={interim && listening ? `${value} ${interim}...` : value}
          onChange={handleChange}
          onKeyDown={(e) => handleKeyDown(e, handleSelect)}
          onBlur={closeSuggestions}
          disabled={disabled}
          autoComplete="off"
          style={interim && listening ? { color: "rgba(183,228,199,0.7)", fontStyle: "italic" } : {}}
        />
        {onSpeak && (
          <button
            type="button"
            className={`mic-btn ${listening ? "active" : ""}`}
            onClick={onSpeak}
            title={listening ? "Listening..." : "Speak"}
          >
            🎤
          </button>
        )}
      </div>

      {/* Auto-suggest dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="autosuggest-dropdown">
          {suggestions.map((s, i) => (
            <div
              key={i}
              className={`autosuggest-item ${i === selectedIndex ? "active" : ""}`}
              onMouseDown={() => handleSelect(s)}
            >
              <span className="autosuggest-icon">🔍</span>
              <span>{s}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
