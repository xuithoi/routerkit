/**
 * RouterKit — rtk.js
 * RTK Token Saver: compresses verbose content in chat messages to reduce token usage.
 * Ported and adapted from 9Router's open-sse/rtk compression logic.
 */

// ─────────────────────────────────────────────
// RTK Compression Filters
// ─────────────────────────────────────────────

/**
 * Compresses git diff hunks by removing context lines and collapsing them.
 */
function compressGitDiff(text) {
  const lines = text.split("\n");
  const result = [];
  let inHunk = false;
  let contextBuffer = [];
  let contextCount = 0;
  const MAX_CONTEXT = 2;

  for (const line of lines) {
    if (line.startsWith("diff --git") || line.startsWith("index ") || line.startsWith("---") || line.startsWith("+++")) {
      result.push(line);
    } else if (line.startsWith("@@")) {
      if (contextBuffer.length > MAX_CONTEXT) {
        result.push(`... [${contextBuffer.length - MAX_CONTEXT} context lines omitted]`);
        result.push(...contextBuffer.slice(-MAX_CONTEXT));
      } else {
        result.push(...contextBuffer);
      }
      contextBuffer = [];
      result.push(line);
      inHunk = true;
    } else if (inHunk && (line.startsWith("+") || line.startsWith("-"))) {
      if (contextBuffer.length > MAX_CONTEXT) {
        result.push(`... [${contextBuffer.length - MAX_CONTEXT} context lines omitted]`);
        result.push(...contextBuffer.slice(-MAX_CONTEXT));
      } else {
        result.push(...contextBuffer);
      }
      contextBuffer = [];
      result.push(line);
    } else if (inHunk && line.startsWith(" ")) {
      contextBuffer.push(line);
    } else {
      result.push(line);
    }
  }

  if (contextBuffer.length > 0) {
    if (contextBuffer.length > MAX_CONTEXT) {
      result.push(`... [${contextBuffer.length - MAX_CONTEXT} trailing context lines omitted]`);
    } else {
      result.push(...contextBuffer);
    }
  }

  return result.join("\n");
}

/**
 * Collapses repeated grep output lines, grouping by filename.
 */
function compressGrepOutput(text) {
  const lines = text.split("\n");
  const byFile = {};
  const order = [];
  const grepLineRe = /^([^:]+):(\d+):(.*)$/;

  for (const line of lines) {
    const m = line.match(grepLineRe);
    if (m) {
      const [, file, lineNo, content] = m;
      if (!byFile[file]) {
        byFile[file] = [];
        order.push(file);
      }
      byFile[file].push(`  L${lineNo}: ${content.trim()}`);
    }
  }

  if (order.length === 0) return text;

  return order
    .map((file) => `${file}:\n${byFile[file].join("\n")}`)
    .join("\n\n");
}

/**
 * Collapses long file-system listing output (find / ls -la style).
 */
function compressFsListing(text) {
  const lines = text.split("\n").filter(Boolean);
  if (lines.length <= 20) return text;

  const truncated = lines.slice(0, 20);
  return truncated.join("\n") + `\n... [${lines.length - 20} more lines omitted by RTK]`;
}

/**
 * Strips excessive blank lines and trims very long lines.
 */
function normalizeWhitespace(text) {
  return text
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((l) => (l.length > 2000 ? l.slice(0, 2000) + "…[truncated]" : l))
    .join("\n")
    .trim();
}

// ─────────────────────────────────────────────
// Content-Shape Detection
// ─────────────────────────────────────────────

function detectAndCompress(text) {
  const hasDiff = /^diff --git /m.test(text) || /^@@.*@@/m.test(text);
  const hasGrep = /^[^:]+:\d+:/.test(text);
  const hasFsListing =
    /^(total \d+|[-drwx]{10}|\.\/)/.test(text) ||
    text.split("\n").length > 30;

  let result = text;
  if (hasDiff) result = compressGitDiff(result);
  if (hasGrep) result = compressGrepOutput(result);
  if (hasFsListing) result = compressFsListing(result);
  result = normalizeWhitespace(result);

  return result;
}

// ─────────────────────────────────────────────
// Message Format Support: OpenAI + Anthropic
// ─────────────────────────────────────────────

function compressMessageContent(content) {
  if (typeof content === "string") {
    return detectAndCompress(content);
  }
  if (Array.isArray(content)) {
    return content.map((block) => {
      if (block.type === "text" && typeof block.text === "string") {
        return { ...block, text: detectAndCompress(block.text) };
      }
      return block;
    });
  }
  return content;
}

// ─────────────────────────────────────────────
// Main RTK Export
// ─────────────────────────────────────────────

/**
 * Applies RTK compression to a request body (OpenAI or Anthropic format).
 * Returns { body: compressedBody, originalTokenEstimate, savedTokenEstimate }
 */
export function rtkCompress(body) {
  if (!body || typeof body !== "object") return { body, originalTokenEstimate: 0, savedTokenEstimate: 0 };

  const messages = body.messages || body.prompt || [];
  if (!Array.isArray(messages) || messages.length === 0) {
    return { body, originalTokenEstimate: 0, savedTokenEstimate: 0 };
  }

  const originalText = JSON.stringify(messages);
  const originalTokenEstimate = Math.ceil(originalText.length / 4);

  const compressedMessages = messages.map((msg) => ({
    ...msg,
    content: compressMessageContent(msg.content),
  }));

  const compressedText = JSON.stringify(compressedMessages);
  const compressedTokenEstimate = Math.ceil(compressedText.length / 4);
  const savedTokenEstimate = Math.max(0, originalTokenEstimate - compressedTokenEstimate);

  const compressedBody = { ...body, messages: compressedMessages };
  if (body.prompt) delete compressedBody.prompt;

  return { body: compressedBody, originalTokenEstimate, savedTokenEstimate };
}

/**
 * Estimate token count from a string (rough 4-chars-per-token heuristic).
 */
export function estimateTokens(text) {
  return Math.ceil((text || "").length / 4);
}
