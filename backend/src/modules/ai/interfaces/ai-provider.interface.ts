import { AIGenerationOptions, AIResponse } from './ai-response.interface';

/**
 * The contract every AI provider must fulfill.
 *
 * Any class that implements this interface can be injected as AI_PROVIDER.
 * AIService depends on this interface — never on OpenAI, Claude, or any
 * specific implementation directly.
 */
export interface AIProvider {
  /**
   * Generate a text completion from a prompt.
   *
   * @param prompt  - The assembled prompt string (built by PromptBuilder)
   * @param options - Generation options (temperature, maxTokens, etc.)
   * @returns       Normalized AIResponse
   */
  generateText(prompt: string, options?: AIGenerationOptions): Promise<AIResponse>;

  /**
   * The name of this provider — used in logging and stored with AI insights
   * so you always know which model generated a given response.
   */
  readonly providerName: string;
}