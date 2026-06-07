const fs = require('fs');
let content = fs.readFileSync('frontend/src/context/LangContext.jsx', 'utf8');

const newEn = `
    home: 'Home',
    seasonalSpecials: 'Seasonal Specials',
    freshlyHarvested: 'Freshly harvested this season!',
    list: 'List',
    map: 'Map',
    placeOrder: 'Place Order',
    deliveryOption: 'Delivery Option',
    buyAtFarm: 'Buy at Farm',
    homeDelivery: 'Home Delivery',
    paymentMethod: 'Payment Method',
    cashOnDelivery: 'Cash on Delivery',
    payOnline: 'Pay Online',
    apply: 'Apply',
    billPreview: 'Bill Preview',
    total: 'Total',
    fetchWeather: 'Fetch Live Weather',
    detecting: 'Detecting...',
    weatherData: 'Weather Data',
    demandForecaster: 'Demand Forecaster',
    predictDemand: 'Predict Demand',
    analyzing: 'Analyzing...',
    smartRoute: 'Smart Route Optimize',
    optimizing: 'Optimizing...',
    routeGenerated: 'Smart Route Generated',
    totalDistance: 'Total Distance',
    notifications: 'Notifications',
    unread: 'Unread',
    noNotifications: 'No new notifications',
    myOrders: 'My Orders',
    cancel: 'Cancel',
    confirm: 'Confirm',
    printBill: 'Print Bill',`;

const newTe = `
    home: 'హోమ్',
    seasonalSpecials: 'సీజనల్ స్పెషల్స్',
    freshlyHarvested: 'ఈ సీజన్‌లో తాజాగా పండించినవి!',
    list: 'జాబితా',
    map: 'మ్యాప్',
    placeOrder: 'ఆర్డర్ చేయండి',
    deliveryOption: 'డెలివరీ ఎంపిక',
    buyAtFarm: 'పొలంలో కొనండి',
    homeDelivery: 'హోమ్ డెలివరీ',
    paymentMethod: 'చెల్లింపు పద్ధతి',
    cashOnDelivery: 'క్యాష్ ఆన్ డెలివరీ',
    payOnline: 'ఆన్‌లైన్ చెల్లింపు',
    apply: 'వర్తించు',
    billPreview: 'బిల్లు ప్రివ్యూ',
    total: 'మొత్తం',
    fetchWeather: 'వాతావరణం పొందండి',
    detecting: 'గుర్తిస్తోంది...',
    weatherData: 'వాతావరణ డేటా',
    demandForecaster: 'డిమాండ్ అంచనా',
    predictDemand: 'డిమాండ్ అంచనా వేయండి',
    analyzing: 'విశ్లేషిస్తోంది...',
    smartRoute: 'స్మార్ట్ రూట్ ఆప్టిమైజ్',
    optimizing: 'ఆప్టిమైజ్ చేస్తోంది...',
    routeGenerated: 'స్మార్ట్ రూట్ రూపొందించబడింది',
    totalDistance: 'మొత్తం దూరం',
    notifications: 'నోటిఫికేషన్‌లు',
    unread: 'చదవనివి',
    noNotifications: 'కొత్త నోటిఫికేషన్‌లు లేవు',
    myOrders: 'నా ఆర్డర్‌లు',
    cancel: 'రద్దు చేయి',
    confirm: 'నిర్ధారించు',
    printBill: 'బిల్లు ప్రింట్ చేయండి',`;

const newHi = `
    home: 'होम',
    seasonalSpecials: 'मौसमी विशेष',
    freshlyHarvested: 'इस मौसम में ताज़ा काटा गया!',
    list: 'सूची',
    map: 'नक्शा',
    placeOrder: 'ऑर्डर करें',
    deliveryOption: 'डिलीवरी विकल्प',
    buyAtFarm: 'खेत पर खरीदें',
    homeDelivery: 'होम डिलीवरी',
    paymentMethod: 'भुगतान विधि',
    cashOnDelivery: 'कैश ऑन डिलीवरी',
    payOnline: 'ऑनलाइन भुगतान करें',
    apply: 'लागू करें',
    billPreview: 'बिल पूर्वावलोकन',
    total: 'कुल',
    fetchWeather: 'मौसम की जानकारी लाएं',
    detecting: 'पता लगा रहा है...',
    weatherData: 'मौसम डेटा',
    demandForecaster: 'मांग पूर्वानुमानकर्ता',
    predictDemand: 'मांग का अनुमान लगाएं',
    analyzing: 'विश्लेषण कर रहा है...',
    smartRoute: 'स्मार्ट मार्ग अनुकूलित करें',
    optimizing: 'अनुकूलित कर रहा है...',
    routeGenerated: 'स्मार्ट मार्ग उत्पन्न',
    totalDistance: 'कुल दूरी',
    notifications: 'सूचनाएं',
    unread: 'अपठित',
    noNotifications: 'कोई नई सूचना नहीं',
    myOrders: 'मेरे ऑर्डर',
    cancel: 'रद्द करें',
    confirm: 'पुष्टि करें',
    printBill: 'बिल प्रिंट करें',`;

const newKn = `
    home: 'ಮುಖಪುಟ',
    seasonalSpecials: 'ಋತುಮಾನದ ವಿಶೇಷತೆಗಳು',
    freshlyHarvested: 'ಈ ಋತುವಿನಲ್ಲಿ ತಾಜಾವಾಗಿ ಕಟಾವು ಮಾಡಲಾಗಿದೆ!',
    list: 'ಪಟ್ಟಿ',
    map: 'ನಕ್ಷೆ',
    placeOrder: 'ಆರ್ಡರ್ ಮಾಡಿ',
    deliveryOption: 'ವಿತರಣೆ ಆಯ್ಕೆ',
    buyAtFarm: 'ಹೊಲದಲ್ಲಿ ಖರೀದಿಸಿ',
    homeDelivery: 'ಮನೆ ವಿತರಣೆ',
    paymentMethod: 'ಪಾವತಿ ವಿಧಾನ',
    cashOnDelivery: 'ವಿತರಣೆಯ ನಂತರ ನಗದು',
    payOnline: 'ಆನ್‌ಲೈನ್ ಪಾವತಿಸಿ',
    apply: 'ಅನ್ವಯಿಸು',
    billPreview: 'ಬಿಲ್ ಮುನ್ನೋಟ',
    total: 'ಒಟ್ಟು',
    fetchWeather: 'ಹವಾಮಾನ ಮಾಹಿತಿ ಪಡೆಯಿರಿ',
    detecting: 'ಪತ್ತೆಹಚ್ಚಲಾಗುತ್ತಿದೆ...',
    weatherData: 'ಹವಾಮಾನ ಡೇಟಾ',
    demandForecaster: 'ಬೇಡಿಕೆ ಮುನ್ಸೂಚನೆಕಾರ',
    predictDemand: 'ಬೇಡಿಕೆಯನ್ನು ಅಂದಾಜು ಮಾಡಿ',
    analyzing: 'ವಿಶ್ಲೇಷಿಸಲಾಗುತ್ತಿದೆ...',
    smartRoute: 'ಸ್ಮಾರ್ಟ್ ಮಾರ್ಗ ಆಪ್ಟಿಮೈಸ್',
    optimizing: 'ಆಪ್ಟಿಮೈಸ್ ಮಾಡಲಾಗುತ್ತಿದೆ...',
    routeGenerated: 'ಸ್ಮಾರ್ಟ್ ಮಾರ್ಗ ರಚಿಸಲಾಗಿದೆ',
    totalDistance: 'ಒಟ್ಟು ದೂರ',
    notifications: 'ಅಧಿಸೂಚನೆಗಳು',
    unread: 'ಓದದಿರುವ',
    noNotifications: 'ಯಾವುದೇ ಹೊಸ ಅಧಿಸೂಚನೆಗಳಿಲ್ಲ',
    myOrders: 'ನನ್ನ ಆರ್ಡರ್‌ಗಳು',
    cancel: 'ರದ್ದುಮಾಡು',
    confirm: 'ಖಚಿತಪಡಿಸಿ',
    printBill: 'ಬಿಲ್ ಮುದ್ರಿಸಿ',`;

const newTa = `
    home: 'முகப்பு',
    seasonalSpecials: 'பருவகால சிறப்புகள்',
    freshlyHarvested: 'இந்த பருவத்தில் புதிதாக அறுவடை செய்யப்பட்டது!',
    list: 'பட்டியல்',
    map: 'வரைபடம்',
    placeOrder: 'ஆர்டர் செய்',
    deliveryOption: 'டெலிவரி விருப்பம்',
    buyAtFarm: 'பண்ணையில் வாங்குங்கள்',
    homeDelivery: 'ஹோம் டெலிவரி',
    paymentMethod: 'கட்டண முறை',
    cashOnDelivery: 'பணம் செலுத்தி பெறுதல்',
    payOnline: 'ஆன்லைனில் செலுத்துங்கள்',
    apply: 'பயன்படுத்து',
    billPreview: 'ரசீது முன்னோட்டம்',
    total: 'மொத்தம்',
    fetchWeather: 'வானிலை தகவலைப் பெறு',
    detecting: 'கண்டறியப்படுகிறது...',
    weatherData: 'வானிலை தரவு',
    demandForecaster: 'தேவை கணிப்பாளர்',
    predictDemand: 'தேவையை கணிக்கவும்',
    analyzing: 'பகுப்பாய்வு செய்யப்படுகிறது...',
    smartRoute: 'ஸ்மார்ட் வழியை மேம்படுத்து',
    optimizing: 'மேம்படுத்தப்படுகிறது...',
    routeGenerated: 'ஸ்மார்ட் வழி உருவாக்கப்பட்டது',
    totalDistance: 'மொத்த தூரம்',
    notifications: 'அறிவிப்புகள்',
    unread: 'படிக்காதவை',
    noNotifications: 'புதிய அறிவிப்புகள் இல்லை',
    myOrders: 'என் ஆர்டர்கள்',
    cancel: 'ரத்து செய்',
    confirm: 'உறுதிப்படுத்து',
    printBill: 'ரசீதை அச்சிடு',`;

let lines = content.split('\n');
let res = [];
for (let i = 0; i < lines.length; i++) {
    res.push(lines[i]);
    if (lines[i].includes('usePoints:')) {
        let langCode = 'en';
        for (let j = i; j >= 0; j--) {
            if (lines[j].includes('en: {')) { langCode = 'en'; break; }
            if (lines[j].includes('te: {')) { langCode = 'te'; break; }
            if (lines[j].includes('hi: {')) { langCode = 'hi'; break; }
            if (lines[j].includes('kn: {')) { langCode = 'kn'; break; }
            if (lines[j].includes('ta: {')) { langCode = 'ta'; break; }
        }
        if (langCode === 'en') res.push(newEn);
        if (langCode === 'te') res.push(newTe);
        if (langCode === 'hi') res.push(newHi);
        if (langCode === 'kn') res.push(newKn);
        if (langCode === 'ta') res.push(newTa);
    }
}
fs.writeFileSync('frontend/src/context/LangContext.jsx', res.join('\n'));
console.log('LangContext updated!');
