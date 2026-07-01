import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { AIProvider } from '../interfaces/ai-provider.interface';
import { AIGenerationOptions, AIResponse } from '../interfaces/ai-response.interface';

/**
 * OpenAI provider implementation.
 *
 * NOT wired into the module yet — swap this in ai.module.ts when ready.
 * The AIService and everything above it requires zero changes.
 *
 * To activate:
 * 1. Set OPENAI_API_KEY in your .env
 * 2. In ai.module.ts, change:
 *    { provide: AI_PROVIDER, useClass: MockAIProvider }
 *    to:
 *    { provide: AI_PROVIDER, useClass: OpenAIProvider }
 */
@Injectable()
export class OpenAIProvider implements AIProvider {
  private readonly logger = new Logger(OpenAIProvider.name);
  private readonly client: OpenAI;
  readonly providerName = 'openai';

  private readonly DEFAULT_MODEL = 'gpt-4o-mini'; // cost-effective, capable model
  private readonly DEFAULT_MAX_TOKENS = 1000;
  private readonly DEFAULT_TEMPERATURE = 0.7;

  constructor(private readonly configService: ConfigService) {
    this.client = new OpenAI({
      apiKey: this.configService.get<string>('ai.openaiApiKey'),
    });
  }

  async generateText(
    prompt: string,
    options: AIGenerationOptions = {},
  ): Promise<AIResponse> {
    const {
      maxTokens = this.DEFAULT_MAX_TOKENS,
      temperature = this.DEFAULT_TEMPERATURE,
      systemPrompt,
    } = options;

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    messages.push({ role: 'user', content: prompt });

    const response = await this.client.chat.completions.create({
      model: this.DEFAULT_MODEL,
      messages,
      max_tokens: maxTokens,
      temperature,
    });

    const choice = response.choices[0];
    const usage = response.usage!;

    return {
      content: choice.message.content ?? '',
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
      model: response.model,
    };
  }
}