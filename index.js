export default {
  // ၁။ Main Function (Telegram မှ ဝင်လာသမျှကို လက်ခံမည့်နေရာ)
  async fetch(request, env) {
    // POST request မဟုတ်ရင် Bot အလုပ်လုပ်ကြောင်း စာသားသာ ပြန်ပေးမည်
    if (request.method !== "POST") {
      return new Response("Telegram Bot is running smoothly!", { status: 200 });
    }

    try {
      const update = await request.json();
      
      // Update ထဲမှာ Message ပါမှသာ အလုပ်ဆက်လုပ်မည်
      if (update.message && update.message.text) {
        await handleMessage(update.message, env);
      }
      
      // Telegram ဘက်မှ ထပ်ခါထပ်ခါ မပို့စေရန် OK အမြဲပြန်ပေးရမည်
      return new Response("OK", { status: 200 });
    } catch (error) {
      console.error("Webhook Error:", error);
      return new Response("OK", { status: 200 });
    }
  }
};


// ၂။ Message များကို စစ်ဆေးစီမံသည့် Function
async function handleMessage(message, env) {
  const chatId = message.chat.id;
  const userText = message.text;
  const botToken = env.TELEGRAM_BOT_TOKEN;
  const geminiKey = env.GEMINI_API_KEY;

  // /start command အတွက်
  if (userText === "/start") {
    await sendTelegramMessage(botToken, chatId, "မင်္ဂလာပါ! ကျွန်တော်က Gemini AI Bot ဖြစ်ပါတယ်။ သိချင်တာတွေ မေးမြန်းနိုင်ပါတယ်။");
    return;
  }

  // Gemini မစဉ်းစားခင် "typing..." ဟု Telegram တွင် ပေါ်စေရန်
  await sendChatAction(botToken, chatId, "typing");

  // Gemini ထံမှ အဖြေတောင်းမည်
  const aiResponse = await getGeminiResponse(geminiKey, userText);

  // ရလာတဲ့ အဖြေကို Telegram ထံ ပြန်ပို့မည်
  await sendTelegramMessage(botToken, chatId, aiResponse);
}


// ၃။ Gemini API ထံမှ အဖြေတောင်းသည့် Function
async function getGeminiResponse(apiKey, prompt) {
  // Google ၏ မူရင်း API ကို Model အမှန်ဖြင့် အသုံးပြုထားသည်
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }]
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    // API ခေါ်ဆိုမှု အောင်မြင်ခြင်း မရှိပါက (ဥပမာ - Quota ပြည့်ခြင်း၊ API မှားခြင်း)
    if (!response.ok) {
      console.error("Gemini API Error:", data);
      return `⚠️ API Error: ${data.error?.message || "Google ဘက်မှ အမှားအယွင်း ဖြစ်နေပါသည်။"}`;
    }

    // အဖြေရရှိပါက
    if (data.candidates && data.candidates.length > 0) {
      return data.candidates[0].content.parts[0].text;
    } else {
      return "⚠️ တောင်းပန်ပါတယ်။ Gemini ဘက်မှ အဖြေထုတ်ပေးနိုင်ခြင်း မရှိပါ။";
    }
  } catch (error) {
    console.error("Network Error:", error);
    return `⚠️ Network Error: ${error.message}`;
  }
}


// ၄။ Telegram သို့ မက်ဆေ့ဂျ် ပြန်ပို့ပေးသည့် Function
async function sendTelegramMessage(botToken, chatId, text) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: text
      // parse_mode ဖယ်ထားသည် (Markdown အမှားကြောင့် Telegram Error တက်ခြင်းကို ကာကွယ်ရန်)
    })
  });
}


// ၅။ Telegram တွင် Typing... ပြသပေးသည့် Function
async function sendChatAction(botToken, chatId, action) {
  const url = `https://api.telegram.org/bot${botToken}/sendChatAction`;
  
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      action: action
    })
  });
    }

