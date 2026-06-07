import { GoogleGenerativeAI } from "@google/generative-ai";

export const parseIntent = async (req, res) => {
  try {
    const { text, context } = req.body;
    if (!text) return res.status(400).json({ error: "No text provided" });

    // Initialize Gemini if API key is present
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (apiKey && apiKey.trim() !== "") {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        let prompt = "";
        
        if (context === "farmer_add_crop") {
          prompt = `
          You are an AI assistant for a farming app. Extract the crop details from the user's text and output ONLY a valid JSON object. Do not include markdown code blocks like \`\`\`json.
          Text: "${text}"
          
          Required JSON structure:
          {
            "name": "crop name (e.g., Tomato)",
            "quantity": number (e.g., 50),
            "unit": "kg" or "tons" or "liters",
            "price": number (e.g., 30),
            "isOrganic": boolean (true if mentioned organic, natural, pesticide-free)
          }
          If you cannot find a value, use null or false.
          `;
        } else if (context === "marketplace_search") {
          prompt = `
          You are an AI assistant for a farming app marketplace. Extract the search intent from the user's text and output ONLY a valid JSON object. Do not include markdown code blocks.
          Text: "${text}"
          
          Required JSON structure:
          {
            "searchQuery": "main item to search for (e.g., apples, tomatoes)",
            "category": "vegetable", "fruit", "grain", "dairy", "pulse", "spice" or "all",
            "isOrganic": boolean (true if they specifically asked for organic)
          }
          If you cannot find a value, use null.
          `;
        } else {
          prompt = `Extract intent from: "${text}". Output JSON.`;
        }

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        
        // Clean up response if it contains markdown JSON blocks
        let cleanJsonStr = responseText.replace(/```json/gi, '').replace(/```/gi, '').trim();
        const parsedData = JSON.parse(cleanJsonStr);
        
        return res.json({ source: "gemini", data: parsedData });
      } catch (geminiError) {
        console.error("Gemini API Error, falling back to local parser:", geminiError);
        // Fallthrough to local parser
      }
    }

    // --- Sophisticated Local Fallback Parser ---
    let parsedData = {};
    const lowerText = text.toLowerCase();
    
    // 1. Conversational Intents
    if (lowerText.match(/^(hi|hello|hey|namaste|vanakkam|namaskara|hallo)/)) {
      return res.json({ source: "local_heuristic", data: { reply: "Namaste! I am the Rythu Sethu AI Assistant. How can I help you with your farming or shopping today?" } });
    }
    if (lowerText.match(/(who are you|what can you do|help)/)) {
      return res.json({ source: "local_heuristic", data: { reply: "I am your intelligent farming assistant. If you're a farmer, tell me what you harvested to auto-fill your listing. If you're a buyer, tell me what you want to buy!" } });
    }
    if (lowerText.match(/(thank you|thanks|dhanyavad|nandri)/)) {
      return res.json({ source: "local_heuristic", data: { reply: "You're very welcome! Let me know if you need anything else. 🌱" } });
    }
    if (lowerText.match(/(good|awesome|great|nice|wow)/) && lowerText.length < 15) {
      return res.json({ source: "local_heuristic", data: { reply: "Thank you! I'm here to make things easier for you." } });
    }

    if (context === "farmer_add_crop") {
      // Multilingual Crop Dictionary
      const cropsDict = {
        "tomato": ["tomato", "tomatoes", "టమోటా", "టమోటాలు", "टमाटर", "தக்காளி", "ಟೊಮೆಟೊ"],
        "potato": ["potato", "potatoes", "బంగాళదుంప", "आलू", "உருளைக்கிழங்கு", "ಆಲೂಗಡ್ಡೆ"],
        "onion": ["onion", "onions", "ఉల్లిపాయ", "प्याज", "வெங்காயம்", "ಈರುಳ್ಳಿ"],
        "rice": ["rice", "paddy", "వరి", "బియ్యం", "चावल", "धान", "அரிசி", "ಅಕ್ಕಿ"],
        "wheat": ["wheat", "గోధుమలు", "गेहूं", "கோதுமை", "ಗೋಧಿ"],
        "cotton": ["cotton", "పత్తి", "कपास", "பருத்தி", "ಹತ್ತಿ"],
        "apple": ["apple", "apples", "ఆపిల్", "सेब", "ஆப்பிள்", "ಸೇಬು"],
        "mango": ["mango", "mangoes", "మామిడి", "आम", "மாம்பழம்", "ಮಾವಿನಹಣ್ಣು"]
      };

      // Try to extract quantity (handles English and basic numeric)
      const qtyMatch = lowerText.match(/(\d+)\s*(kg|kilos|kilograms|tons|tonnes|liters|l|కేజీలు|కిలోలు|किलो)/i);
      if (qtyMatch) {
        parsedData.quantity = parseInt(qtyMatch[1], 10);
        let unit = qtyMatch[2].toLowerCase();
        if (unit.startsWith('k') || unit.includes('కేజీ') || unit.includes('కిలో') || unit.includes('किलो')) parsedData.unit = 'kg';
        else if (unit.startsWith('t')) parsedData.unit = 'tons';
        else if (unit.startsWith('l')) parsedData.unit = 'liters';
      }

      // Try to extract price
      const priceMatch = lowerText.match(/(?:for|at|rs\.?|rupees|₹|inr|రూపాయలు|रुपये)\s*(\d+)/i) || lowerText.match(/(\d+)\s*(?:rs|rupees|bucks|రూపాయలు|रुपये)/i);
      if (priceMatch) {
        parsedData.price = parseInt(priceMatch[1], 10);
      }

      // Try to extract organic
      parsedData.isOrganic = /(organic|natural|without pesticide|no pesticide|desi|సేంద్రీయ|जैविक)/i.test(lowerText);

      // Extract crop name using multilingual dictionary
      for (const [enName, localNames] of Object.entries(cropsDict)) {
        if (localNames.some(name => lowerText.includes(name))) {
          parsedData.name = enName.charAt(0).toUpperCase() + enName.slice(1);
          break;
        }
      }
      
      if (!parsedData.name && lowerText.split(" ").length > 0) {
        // Fallback
        const words = lowerText.split(" ");
        const stopWords = ["i", "have", "sell", "want", "to", "add", "harvested", "my", "some", "organic", "fresh", "kg", "tons", "liters", "rs", "rupees", "for", "at"];
        for (const w of words) {
          if (!stopWords.includes(w) && isNaN(w)) {
            parsedData.name = w.charAt(0).toUpperCase() + w.slice(1);
            break;
          }
        }
      }

    } else if (context === "marketplace_search") {
      parsedData.isOrganic = /(organic|natural)/i.test(lowerText);
      
      if (lowerText.includes("fruit") || lowerText.includes("apple") || lowerText.includes("mango")) parsedData.category = "fruit";
      else if (lowerText.includes("veg") || lowerText.includes("tomato") || lowerText.includes("potato")) parsedData.category = "vegetable";
      else if (lowerText.includes("grain") || lowerText.includes("rice") || lowerText.includes("wheat")) parsedData.category = "grain";
      else parsedData.category = "all";

      // Extract search query
      const queryMatch = lowerText.match(/(?:find|search|show me|looking for)\s+(?:some\s+)?(?:fresh\s+)?(?:organic\s+)?([a-z\s]+)/i);
      if (queryMatch) {
        parsedData.searchQuery = queryMatch[1].trim();
      } else {
        parsedData.searchQuery = text.replace(/(find|search|show me|looking for|some|fresh|organic)/gi, "").trim();
      }
    }

    return res.json({ source: "local_heuristic", data: parsedData });

  } catch (error) {
    console.error("AI Parse Error:", error);
    res.status(500).json({ error: "Failed to parse text" });
  }
};
