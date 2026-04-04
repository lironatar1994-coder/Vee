const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize with the cheapest capable model for extraction
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

/**
 * Parses a natural language task description into structured JSON.
 * @param {string} userMessage The raw text message from the user
 * @returns {Promise<Object>} The parsed task details object
 */
async function parseTaskMessage(userMessage) {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is not defined in the environment variables.');
    }

    const now = new Date();
    const dayOfWeek = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'Asia/Jerusalem' }).format(now);
    const dateStr = now.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' });

    const prompt = `
    You are a task extractor for a system.
    Current Context: Today is ${dayOfWeek}, ${dateStr} (Israel Timezone).
    
    Extract task details from this user message: "${userMessage}"
    
    Return a valid JSON object ONLY with these keys (do not add markdown code blocks):
    {
      "content": "String (Task title in Hebrew)",
      "target_date": "String YYYY-MM-DD (null if not specified)",
      "time": "String HH:MM (null if not specified)",
      "duration": Number (duration in minutes if specified, e.g., 45. Defaults to 15 if not specified)
    }`;

    const result = await model.generateContent(prompt);
    let textResult = result.response.text().trim();
    if (textResult.startsWith('\`\`\`json')) {
        textResult = textResult.substring(7, textResult.length - 3);
    } else if (textResult.startsWith('\`\`\`')) {
        textResult = textResult.substring(3, textResult.length - 3);
    }
    
    return JSON.parse(textResult);
}

module.exports = { parseTaskMessage };
