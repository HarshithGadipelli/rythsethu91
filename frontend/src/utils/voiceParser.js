// Multilingual Voice Parser for Rythu Sethu

const CROPS_MAP = {
  // English
  tomato: "Tomato", tomatoes: "Tomato",
  potato: "Potato", potatoes: "Potato",
  onion: "Onion", onions: "Onion",
  rice: "Rice", paddy: "Rice",
  wheat: "Wheat",
  cotton: "Cotton",
  apple: "Apple", apples: "Apple",
  mango: "Mango", mangoes: "Mango",
  banana: "Banana", bananas: "Banana",
  chili: "Chili", chilli: "Chili", chilies: "Chili", chillies: "Chili",
  garlic: "Garlic",
  ginger: "Ginger",
  cabbage: "Cabbage",
  cauliflower: "Cauliflower",
  carrot: "Carrot", carrots: "Carrot",
  brinjal: "Brinjal", brinjals: "Brinjal", eggplant: "Brinjal",
  spinach: "Spinach",
  pulses: "Pulses",
  sugarcane: "Sugarcane",

  // Telugu
  టమోటా: "Tomato", టమోటాలు: "Tomato", తమోటా: "Tomato", తమోటాలు: "Tomato",
  బంగాళదుంప: "Potato", బంగాళదుంపలు: "Potato", బంగాళాదుంప: "Potato", బంగాళాదుంపలు: "Potato",
  ఉల్లిపాయ: "Onion", ఉల్లిపాయలు: "Onion", ఉల్లిపాయల: "Onion",
  వరి: "Rice", బియ్యం: "Rice",
  గోధుమలు: "Wheat", గోధుమ: "Wheat",
  పత్తి: "Cotton",
  ఆపిల్: "Apple", ఆపిల్స్: "Apple",
  మామిడి: "Mango", మామిడిపండు: "Mango", మామిడిపండ్లు: "Mango",
  అరటి: "Banana", అరటిపండు: "Banana", అరటిపండ్లు: "Banana",
  మిరపకాయ: "Chili", మిర్చి: "Chili", మిరపకాయలు: "Chili",
  వెల్లుల్లి: "Garlic",
  అల్లం: "Ginger",
  క్యాబేజీ: "Cabbage", క్యాబేజీలు: "Cabbage",
  క్యారెట్: "Carrot", క్యారెట్లు: "Carrot",
  వంకాయ: "Brinjal", వంకాయలు: "Brinjal",
  పాలకూర: "Spinach",
  పప్పులు: "Pulses", పప్పు: "Pulses",
  చెరకు: "Sugarcane", చెరుకు: "Sugarcane",

  // Hindi
  टमाटर: "Tomato",
  आलू: "Potato",
  प्याज: "Onion",
  चावल: "Rice", धान: "Rice",
  गेहूं: "Wheat", गेहूँ: "Wheat",
  कपास: "Cotton",
  सेब: "Apple",
  आम: "Mango",
  केला: "Banana", केले: "Banana",
  मिर्च: "Chili", मिर्ची: "Chili",
  लहसुन: "Garlic",
  अदरक: "Ginger",
  पत्तागोभी: "Cabbage", "पत्ता गोभी": "Cabbage",
  गाजर: "Carrot",
  बैंगन: "Brinjal",
  पालक: "Spinach",
  दालें: "Pulses", दाल: "Pulses",
  गन्ना: "Sugarcane",

  // Kannada
  ಟೊಮೆಟೊ: "Tomato", ಟೊಮೇಟೊ: "Tomato",
  ಆಲೂಗಡ್ಡೆ: "Potato", ಆಲೂಗೆಡ್ಡೆ: "Potato",
  ಈರುಳ್ಳಿ: "Onion",
  ಅಕ್ಕಿ: "Rice", ಭತ್ತ: "Rice",
  ಗೋದಧಿ: "Wheat", ಗೋದೀ: "Wheat", ಗೋಧಿ: "Wheat",
  ಹತ್ತಿ: "Cotton",
  ಸೇಬು: "Apple",
  ಮಾವಿನಹಣ್ಣು: "Mango", ಮಾವು: "Mango",
  ಬಾಳೆಹಣ್ಣು: "Banana", ಬಾಳೆ: "Banana",
  ಮೆಣಸಿನಕಾಯಿ: "Chili", ಮೆಣಸು: "Chili",
  ಬೆಳ್ಳುಳ್ಳಿ: "Garlic",
  ಶುಂಠಿ: "Ginger",
  ಕೋಸು: "Cabbage", ಎಲೆಕೋಸು: "Cabbage",
  ಕ್ಯಾರೆಟ್: "Carrot",
  ಬದನೆಕಾಯಿ: "Brinjal",
  ಪಾಲಕ್: "Spinach", "ಪಾಲಕ್ ಸೊಪ್ಪು": "Spinach",
  ಬೇಳೆಕಾಳುಗಳು: "Pulses", ಬೇಳೆ: "Pulses",
  ಕಬ್ಬು: "Sugarcane",

  // Tamil
  தக்காளி: "Tomato", "தக்காளி பழம்": "Tomato",
  உருளைக்கிழங்கு: "Potato", உருளை: "Potato",
  வெங்காயம்: "Onion", வெங்காயங்கள்: "Onion",
  அரிசி: "Rice", நெல்: "Rice",
  கோதுமை: "Wheat",
  பருத்தி: "Cotton",
  ஆப்பிள்: "Apple",
  மாம்பழம்: "Mango", மாம்பழங்கள்: "Mango", மாங்காய்: "Mango",
  வாழைப்பழம்: "Banana", வாழைப்பழம்: "Banana", வாழை: "Banana",
  மிளகாய்: "Chili", மிளகாய்கள்: "Chili",
  பூண்டு: "Garlic", "வெள்ளை பூண்டு": "Garlic",
  இஞ்சி: "Ginger",
  முட்டைக்கோஸ்: "Cabbage", கோஸ்: "Cabbage",
  கேரட்: "Carrot",
  கத்தரிக்காய்: "Brinjal", கத்தரிக்காய்கள்: "Brinjal",
  கீரை: "Spinach",
  பருப்பு: "Pulses", "பருப்பு வகைகள்": "Pulses",
  கரும்பு: "Sugarcane"
};

const CATEGORIES_MAP = {
  Tomato: "vegetable", Potato: "vegetable", Onion: "vegetable", Cabbage: "vegetable", Carrot: "vegetable", Brinjal: "vegetable", Spinach: "vegetable",
  Apple: "fruit", Mango: "fruit", Banana: "fruit",
  Rice: "grain", Wheat: "grain",
  Pulses: "pulse",
  Chili: "spice", Garlic: "spice", Ginger: "spice",
  Cotton: "other", Sugarcane: "other"
};

const ORGANIC_KEYWORDS = [
  // English
  "organic", "natural",
  // Telugu
  "సేంద్రీయ", "సేంద్రియ", "సేంద్రీయమైన", "నాచురల్",
  // Hindi
  "जैविक", "ऑर्गेनिक", "प्राकृतिक",
  // Kannada
  "ಸಾವಯವ", "ನೈಸರ್ಗಿಕ",
  // Tamil
  "இயற்கை", "ஆர்கானிக்"
];

const UNITS_MAP = {
  kg: ["kg", "kilo", "kilos", "kilogram", "kilograms", "కేజీ", "కేజీలు", "కిలో", "కిలోలు", "किलो", "किलोग्राम", "ಕೆಜಿ", "ಕಿಲೋ", "கிலோ"],
  g: ["g", "gram", "grams", "గ్రాములు", "గ్రామ్", "ग्राम", "ಗ್ರಾಂ", "கிராம்"],
  litre: ["litre", "litres", "liter", "liters", "లీటర్", "లీటర్లు", "लीटर", "ಲೀಟರ್", "லிட்டர்"],
  piece: ["piece", "pieces", "పీస్", "పీసులు", "मुक्का", "पीस", "टुकड़ा", "ಪೀಸ್", "பீಸ್"],
  dozen: ["dozen", "dozens", "డజన్", "दर्जन", "ಡಜನ್", "டஜன்"]
};

const PRICE_INDICATORS = [
  "price", "rupees", "rupee", "rs", "₹", "ధర", "రూపాయలు", "రూపాయి", "రూ", "कीमत", "रुपये", "रुपया", "रू", "ಬೆಲೆ", "ರೂಪಾಯಿ", "ರೂ", "விலะ", "விலை", "ரூபாய்", "ரூ"
];

const NUMBERS_MAP = {
  // English
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
  thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100,

  // Telugu
  సున్నా: 0, ఒకటి: 1, రెండు: 2, మూడు: 3, నాలుగు: 4, ఐదు: 5, ఆరు: 6, ఏడు: 7, ఎనిమిది: 8, తొమ్మిది: 9, పది: 10,
  ఇరవై: 20, ముప్పై: 30, నలభై: 40, యాభై: 50, అరవై: 60, దెబ్బై: 70, ఎనభై: 80, తొంభై: 90, వంద: 100,

  // Hindi
  शून्य: 0, एक: 1, दो: 2, तीन: 3, चार: 4, पांच: 5, छह: 6, सात: 7, आठ: 8, नौ: 9, दस: 10,
  बीस: 20, तीस: 30, चालीस: 40, पचास: 50, साठ: 60, सत्तर: 70, अस्सी: 80, नब्बे: 90, सौ: 100,

  // Kannada
  ಶೂನ್ಯ: 0, ಒಂದು: 1, ಎರಡು: 2, ಮೂರು: 3, ನಾಲ್ಕು: 4, ಐದು: 5, ಆರು: 6, ಏಳು: 7, ಎಂಟು: 8, ಒಂಬತ್ತು: 9, ಹತ್ತು: 10,
  ಇಪ್ಪತ್ತು: 20, ಮೂವತ್ತು: 30, ನಲವತ್ತು: 40, ಐವತ್ತು: 50, ಅರವತ್ತು: 60, ಎಪ್ಪತ್ತು: 70, ಎಂಭತ್ತು: 80, ತೊಂಬತ್ತು: 90, ನೂರು: 100,

  // Tamil
  பூஜ்ஜியம்: 0, ஒன்று: 1, ஒரு: 1, இரண்டு: 2, மூன்று: 3, நான்கு: 4, ஐந்து: 5, ஆறு: 6, ஏழு: 7, எட்டு: 8, ஒன்பது: 9, பத்து: 10,
  இருபது: 20, முப்பது: 30, நாற்பது: 40, ஐம்பது: 50, அறுபது: 60, எழுபது: 70, எண்பது: 80, தொண்ணூறு: 90, நூறு: 100
};

// Convert spoken number (word or digit string) to numerical string
export function parseSpokenNumber(text) {
  if (!text) return "";
  const cleaned = text.trim().toLowerCase();
  
  // Directly matches dictionary
  if (NUMBERS_MAP[cleaned] !== undefined) {
    return String(NUMBERS_MAP[cleaned]);
  }
  
  // Extract first group of digits if any
  const digitMatch = cleaned.match(/\d+/);
  if (digitMatch) {
    return digitMatch[0];
  }
  
  // Try split words in case of "five zero" (50) etc
  const words = cleaned.split(/[\s-]+/);
  let numVal = 0;
  let success = false;
  
  for (let word of words) {
    if (NUMBERS_MAP[word] !== undefined) {
      numVal += NUMBERS_MAP[word];
      success = true;
    }
  }
  
  return success ? String(numVal) : text;
}

// Multilingual voice-to-form parser
export function parseVoiceToFormMultilingual(text, lang = "en") {
  const lower = text.toLowerCase();
  const updates = {};

  // 1. Detect Crop Name
  for (const [key, value] of Object.entries(CROPS_MAP)) {
    if (lower.includes(key.toLowerCase())) {
      updates.name = value;
      if (CATEGORIES_MAP[value]) {
        updates.category = CATEGORIES_MAP[value];
      }
      break;
    }
  }

  // 2. Detect Organic
  for (const keyword of ORGANIC_KEYWORDS) {
    if (lower.includes(keyword.toLowerCase())) {
      updates.isOrganic = true;
      break;
    }
  }

  // 3. Extract Numbers & Map them to Price vs Quantity
  // Split tokens by spaces, punctuation
  const tokens = lower.split(/[\s,，.।!?]+/);
  const foundNumbers = []; // elements of { val: number, index: number }

  tokens.forEach((token, index) => {
    // Check if token is directly digits
    const digitMatch = token.match(/\d+/);
    if (digitMatch) {
      foundNumbers.push({ val: parseInt(digitMatch[0]), index });
    } else if (NUMBERS_MAP[token] !== undefined) {
      foundNumbers.push({ val: NUMBERS_MAP[token], index });
    }
  });

  // Assign numbers to fields based on proximity keywords
  foundNumbers.forEach(({ val, index }) => {
    // Look around index (up to 4 tokens before or after)
    let isQty = false;
    let isPrice = false;

    const lookBack = tokens.slice(Math.max(0, index - 4), index);
    const lookForward = tokens.slice(index + 1, Math.min(tokens.length, index + 5));
    const context = [...lookBack, ...lookForward];

    // Check if context contains any unit
    for (const [unitKey, unitAliases] of Object.entries(UNITS_MAP)) {
      if (context.some(t => unitAliases.some(alias => t.includes(alias.toLowerCase())))) {
        isQty = true;
        updates.unit = unitKey;
        break;
      }
    }

    // Check if context contains price indicator
    if (context.some(t => PRICE_INDICATORS.some(ind => t.includes(ind.toLowerCase())))) {
      isPrice = true;
    }

    if (isQty) {
      updates.quantity = val;
    } else if (isPrice) {
      updates.price = val;
    } else {
      // Fallback: if quantity is not set, set it. Otherwise set price.
      if (updates.quantity === undefined) {
        updates.quantity = val;
      } else if (updates.price === undefined) {
        updates.price = val;
      }
    }
  });

  // 4. Extract Location if any
  // e.g. "from hyderabad", "హైదరాబాద్ నుండి", "हैदराबाद से", "ಹೈದರಾಬಾದ್‌ನಿಂದ", "ஹைதராபாத்தில் இருந்து"
  // Look for location indicator words and extract the next capitalized/meaningful word
  const locationPrepositions = ["from", "in", "at", "నుండి", "నుంచి", "से", "ನಲ್ಲಿ", "ಇಂದ", "இருந்து", "இல்"];
  for (const prep of locationPrepositions) {
    const prepIndex = tokens.indexOf(prep.toLowerCase());
    if (prepIndex !== -1) {
      // Look at surrounding words
      let locWord = "";
      if (["నుండి", "నుంచి", "से", "ನಲ್ಲಿ", "ಇಂದ", "இருந்து", "இல்"].includes(prep)) {
        // Indian languages are usually SOV/prepositional, location word comes BEFORE the preposition
        if (prepIndex > 0) locWord = tokens[prepIndex - 1];
      } else {
        // English preposition comes BEFORE the location word
        if (prepIndex < tokens.length - 1) locWord = tokens[prepIndex + 1];
      }
      
      // Clean and set location if it is not a crop, category or number word
      if (locWord && locWord.length > 2 && !CROPS_MAP[locWord] && NUMBERS_MAP[locWord] === undefined) {
        updates.location = locWord.charAt(0).toUpperCase() + locWord.slice(1);
      }
    }
  }

  return updates;
}
