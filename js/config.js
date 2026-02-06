// ⚠️ TEMPLATE FILE - DO NOT COMMIT REAL API KEYS HERE
// Copy this to config.local.js and fill in your real values
// config.local.js is gitignored and will override these values

const CONFIG = {
  firebase: {
    apiKey: "AIzaSyBqRnmZziNsSuzNkq2DIfybUSydVL1jHQs",
    authDomain: "assexp-8524b.firebaseapp.com",
    projectId: "assexp-8524b",
    storageBucket: "assexp-8524b.firebasestorage.app",
    messagingSenderId: "537065530",
    appId: "1:537065530:web:ba3a8c51cb7dcb56508d78"
  },
  llm: {
    apiKey: "YOUR_OPENROUTER_API_KEY_HERE",
    model: "deepseek/deepseek-chat",
    endpoint: "https://openrouter.ai/api/v1/chat/completions"
  },
  telegram: {
    botToken: "YOUR_TELEGRAM_BOT_TOKEN_HERE",
    adminChatId: "YOUR_TELEGRAM_CHAT_ID_HERE"
  },
  elevenlabs: {
    apiKey: "YOUR_ELEVENLABS_API_KEY_HERE",
    defaultVoice: "9xDZ0uWK4h0mYOKCXBnw"
  },
  assistant: "muy",
  hourlyRate: 2.5
};
