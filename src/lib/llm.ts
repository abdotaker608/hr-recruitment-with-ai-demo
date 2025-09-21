type ChatMessage = {
  role: "system" | "user" | "assistant" | "candidate";
  content: string;
};

function openaiCompatBase() {
  const provider = (process.env.LLM_PROVIDER || "groq").toLowerCase();
  if (provider === "openrouter") {
    return {
      baseUrl: "https://openrouter.ai/api/v1",
      key: process.env.OPENROUTER_API_KEY,
      model:
        process.env.OPENROUTER_MODEL || "meta-llama/llama-3.1-70b-instruct",
      headers: {
        "HTTP-Referer": "http://localhost",
        "X-Title": "AI Screening Demo",
      },
    };
  }
  // default groq
  return {
    baseUrl: "https://api.groq.com/openai/v1",
    key: process.env.GROQ_API_KEY,
    model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
    headers: {},
  };
}

export function llmAvailable() {
  const { key } = openaiCompatBase();
  return Boolean(key);
}

export async function* streamChat(messages: ChatMessage[]) {
  // Fallback stub when no key (so hackathon demo never blocks)
  if (!llmAvailable()) {
    const canned =
      "Great, let’s start. First, could you share your salary expectation?";
    for (const ch of canned) {
      await new Promise((r) => setTimeout(r, 8));
      yield ch;
    }
    return;
  }

  const { baseUrl, key, model, headers } = openaiCompatBase();

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      ...headers,
    } as Record<string, string>,
    body: JSON.stringify({
      model,
      stream: true,
      temperature: 0.2,
      messages,
    }),
  });

  if (!res.ok || !res.body) {
    console.log(await res.text());
    throw new Error(`LLM HTTP ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    buf += decoder.decode(chunk.value, { stream: true });

    // parse OpenAI-style SSE stream: lines starting with "data: "
    const parts = buf.split("\n\n");
    buf = parts.pop() || "";
    for (const part of parts) {
      if (!part.startsWith("data:")) continue;
      const data = part.replace(/^data:\s*/, "");
      if (data === "[DONE]") return;
      try {
        const json = JSON.parse(data);
        const token = json.choices?.[0]?.delta?.content ?? "";
        if (token) yield token;
      } catch {
        // ignore parse errors
      }
    }
  }
}
