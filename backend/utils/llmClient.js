/**
 * Optional LLM fallback. If GEMINI_API_KEY / OPENAI_API_KEY is set in .env,
 * unresolved (UNKNOWN intent) queries get passed here with retrieved context
 * so the model can phrase a natural answer grounded in real DB facts only.
 * If no key is set, falls back to a canned response (see queryController.js).
 */
require('dotenv').config();

async function askLLM(userQuestion, contextFacts) {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  const prompt = `You are ProjectAthena, an HR assistant. Answer ONLY using the facts below.
If the facts don't contain the answer, say you don't have that information and suggest contacting HR.
Never invent data.

Facts:
${JSON.stringify(contextFacts, null, 2)}

Employee question: ${userQuestion}`;

  try {
    if (geminiKey) {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        }
      );
      const data = await resp.json();
      return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
    }

    if (openaiKey) {
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }]
        })
      });
      const data = await resp.json();
      return data?.choices?.[0]?.message?.content || null;
    }
  } catch (err) {
    console.error('LLM call failed:', err.message);
  }

  return null; // no key configured or call failed
}

module.exports = { askLLM };