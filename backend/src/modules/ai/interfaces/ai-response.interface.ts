/**
 * The normalized response shape returned by every AI provider.
 *
 * Every provider (OpenAI, Claude, Gemini) returns responses in
 * different shapes. This interface is what OUR code sees — the
 * provider is responsible for mapping its own format to this.
 */
export interface AIResponse {
  content: string;          // the generated text
  promptTokens: number;     // tokens used in the prompt (input cost)
  completionTokens: number; // tokens used in the response (output cost)
  totalTokens: number;      // promptTokens + completionTokens
  model: string;            // which model generated this (for logging)
  cached?: boolean;         // true if this response came from cache
}

/**
 * Options passed to the provider for each generation request.
 */
export interface AIGenerationOptions {
  maxTokens?: number;       // cap on response length
  temperature?: number;     // 0 = deterministic, 1 = creative; default 0.7
  systemPrompt?: string;    // sets the AI's role/persona
}