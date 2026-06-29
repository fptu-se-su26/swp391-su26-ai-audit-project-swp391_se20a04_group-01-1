const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Groq } = require('groq-sdk');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const aiCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

// Helper kiểm tra lỗi Quota
function isQuotaError(err) {
    const msg = err?.message || "";
    return msg.includes('429') || msg.includes('Quota exceeded') || msg.includes('503') || msg.includes('overloaded');
}

async function askGemini(message) {
    // 1. Kiểm tra cache
    const cached = aiCache.get(message);
    if (cached && (Date.now() - cached.ts < CACHE_TTL_MS)) {
        console.log('⚡ [AI CACHE] Trả về từ bộ nhớ đệm.');
        return cached.value;
    }

    // 2. Gọi Gemini
    try {
        console.log('🤖 [AI GEMINI] Đang gọi Gemini API...');
        const result = await geminiModel.generateContent(message);
        const text = result.response.text();
        
        aiCache.set(message, { value: text, ts: Date.now() });
        return text;
    } catch (err) {
        console.error('❌ Lỗi Gemini:', err.message);

        // 3. Fallback logic
        if (isQuotaError(err)) {
            console.log('🔄 [AI FALLBACK] Quota đầy, chuyển sang Groq...');
            try {
                return await askGroq(message);
            } catch (groqErr) {
                console.error('❌ Lỗi Groq:', groqErr.message);
                throw new Error('Hệ thống AI đang bận. Vui lòng thử lại sau ít phút.');
            }
        }
        
        throw new Error(`Dịch vụ AI gặp lỗi: ${err.message}`);
    }
}

async function askGroq(message) {
    const completion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: message }],
        model: 'llama-3.1-8b-instant',
        temperature: 0.5,
    });
    
    const text = completion.choices[0]?.message?.content || '(Không có phản hồi từ Groq)';
    aiCache.set(message, { value: text, ts: Date.now() });
    return text;
}

module.exports = { askGemini, askGroq };