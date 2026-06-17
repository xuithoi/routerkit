/**
 * RouterKit — translator.js
 * Bidirectional format translation: OpenAI ↔ Anthropic Claude ↔ Gemini
 * All translations pivot through OpenAI format as the intermediate canonical form.
 */

// ─────────────────────────────────────────────
// Anthropic → OpenAI
// ─────────────────────────────────────────────

export function anthropicToOpenAI(body) {
  const messages = [];

  if (body.system) {
    messages.push({ role: "system", content: body.system });
  }

  for (const msg of body.messages || []) {
    const role = msg.role === "assistant" ? "assistant" : "user";
    let content = msg.content;

    if (Array.isArray(content)) {
      const textParts = content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("\n");
      content = textParts;
    }

    messages.push({ role, content });
  }

  return {
    model: body.model || "gpt-4o",
    messages,
    max_tokens: body.max_tokens,
    temperature: body.temperature,
    stream: body.stream,
    top_p: body.top_p,
  };
}

// ─────────────────────────────────────────────
// OpenAI → Anthropic
// ─────────────────────────────────────────────

export function openAIToAnthropic(body) {
  let system = undefined;
  const messages = [];

  for (const msg of body.messages || []) {
    if (msg.role === "system") {
      system = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
    } else {
      const role = msg.role === "assistant" ? "assistant" : "user";
      const content =
        typeof msg.content === "string"
          ? [{ type: "text", text: msg.content }]
          : msg.content;
      messages.push({ role, content });
    }
  }

  return {
    model: body.model || "claude-opus-4-5",
    system,
    messages,
    max_tokens: body.max_tokens || 4096,
    temperature: body.temperature,
    stream: body.stream,
    top_p: body.top_p,
  };
}

// ─────────────────────────────────────────────
// OpenAI → Gemini (generateContent API)
// ─────────────────────────────────────────────

export function openAIToGemini(body) {
  const contents = [];
  let systemInstruction = undefined;

  for (const msg of body.messages || []) {
    if (msg.role === "system") {
      systemInstruction = {
        parts: [{ text: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content) }],
      };
    } else {
      const role = msg.role === "assistant" ? "model" : "user";
      const text = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
      contents.push({ role, parts: [{ text }] });
    }
  }

  return {
    contents,
    systemInstruction,
    generationConfig: {
      maxOutputTokens: body.max_tokens,
      temperature: body.temperature,
      topP: body.top_p,
    },
  };
}

// ─────────────────────────────────────────────
// Gemini response → OpenAI response
// ─────────────────────────────────────────────

export function geminiResponseToOpenAI(geminiResponse, model = "gemini-pro") {
  const candidate = geminiResponse.candidates?.[0];
  const text = candidate?.content?.parts?.map((p) => p.text || "").join("") || "";
  const usage = geminiResponse.usageMetadata || {};

  return {
    id: `chatcmpl-${Date.now()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: text },
        finish_reason: candidate?.finishReason?.toLowerCase() || "stop",
      },
    ],
    usage: {
      prompt_tokens: usage.promptTokenCount || 0,
      completion_tokens: usage.candidatesTokenCount || 0,
      total_tokens: usage.totalTokenCount || 0,
    },
  };
}

// ─────────────────────────────────────────────
// Anthropic response → OpenAI response
// ─────────────────────────────────────────────

export function anthropicResponseToOpenAI(anthropicResponse) {
  const text = anthropicResponse.content
    ?.filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("") || "";
  const usage = anthropicResponse.usage || {};

  return {
    id: anthropicResponse.id || `chatcmpl-${Date.now()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: anthropicResponse.model || "claude-opus-4-5",
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: text },
        finish_reason: anthropicResponse.stop_reason || "stop",
      },
    ],
    usage: {
      prompt_tokens: usage.input_tokens || 0,
      completion_tokens: usage.output_tokens || 0,
      total_tokens: (usage.input_tokens || 0) + (usage.output_tokens || 0),
    },
  };
}

// ─────────────────────────────────────────────
// Translation Registry
// ─────────────────────────────────────────────

/** Translate a request body FROM a source format TO a target provider format */
export function translateRequest(body, fromFormat, toProvider) {
  let openAIBody = body;

  // First normalize to OpenAI
  if (fromFormat === "anthropic") {
    openAIBody = anthropicToOpenAI(body);
  }

  // Then translate to target
  switch (toProvider) {
    case "claude":
      return openAIToAnthropic(openAIBody);
    case "gemini":
      return openAIToGemini(openAIBody);
    case "codex":
    case "github":
    case "openai":
    default:
      return openAIBody;
  }
}

/** Translate a provider's response back to OpenAI format */
export function translateResponse(response, fromProvider) {
  switch (fromProvider) {
    case "claude":
      return anthropicResponseToOpenAI(response);
    case "gemini":
      return geminiResponseToOpenAI(response, response.model);
    case "codex":
    case "github":
    case "openai":
    default:
      return response;
  }
}
