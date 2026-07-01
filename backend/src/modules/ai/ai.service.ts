import {
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as aiProviderInterface from './interfaces/ai-provider.interface';
import {
  AIGenerationOptions,
  AIResponse,
} from './interfaces/ai-response.interface';
import {
  AI_PROVIDER,
  AI_MAX_RETRIES,
  AI_RETRY_BASE_DELAY_MS,
} from './constants/ai.constants';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { AI_CACHE_TTL_SECONDS } from './constants/ai.constants';
import * as crypto from 'crypto';

export interface GenerateOptions extends AIGenerationOptions {
  cacheKey?: string; // if provided, cache this response
  skipCache?: boolean; // force fresh generation, ignore cached value
  minResponseLength?: number; // validation: reject responses shorter than this
}

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);

  constructor(
    @Inject(AI_PROVIDER)
    private readonly provider: aiProviderInterface.AIProvider,
    private readonly cache: CacheService,
  ) {}

  /**
   * Generate an AI response with full production features:
   * cache-aside, retry with exponential backoff, response validation.
   */
  async generate(
    prompt: string,
    options: GenerateOptions = {},
  ): Promise<AIResponse> {
    const {
      cacheKey,
      skipCache = false,
      minResponseLength = 50,
      ...generationOptions
    } = options;

    // 1. Check cache (unless caller explicitly wants fresh)
    if (cacheKey && !skipCache) {
      const cached = await this.cache.get<AIResponse>(cacheKey);
      if (cached) {
        this.logger.log(`AI cache hit: ${cacheKey}`);
        return { ...cached, cached: true };
      }
    }

    // 2. Generate with retry
    const response = await this.generateWithRetry(prompt, generationOptions);

    // 3. Validate response quality
    this.validateResponse(response.content, minResponseLength);

    // 4. Cache if a key was provided
    if (cacheKey) {
      await this.cache.set(cacheKey, response, AI_CACHE_TTL_SECONDS);
      this.logger.log(`AI response cached: ${cacheKey}`);
    }

    this.logger.log(
      `AI generation complete — provider: ${this.provider.providerName}, ` +
        `tokens: ${response.totalTokens}, cached: false`,
    );

    return response;
  }

  /**
   * Retry wrapper with exponential backoff.
   *
   * Attempt 1: immediate
   * Attempt 2: wait 1s
   * Attempt 3: wait 2s
   * Attempt 4: wait 4s → throw
   */
  private async generateWithRetry(
    prompt: string,
    options: AIGenerationOptions,
  ): Promise<AIResponse> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= AI_MAX_RETRIES; attempt++) {
      try {
        if (attempt > 1) {
          const delayMs = AI_RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 2);
          this.logger.warn(
            `AI generation attempt ${attempt}/${AI_MAX_RETRIES} — ` +
              `retrying after ${delayMs}ms (last error: ${lastError?.message})`,
          );
          await this.delay(delayMs);
        }

        return await this.provider.generateText(prompt, options);
      } catch (error) {
        lastError = error as Error;
        this.logger.error(
          `AI generation attempt ${attempt} failed: ${lastError.message}`,
        );
      }
    }

    // All retries exhausted
    throw new ServiceUnavailableException(
      `AI generation failed after ${AI_MAX_RETRIES} attempts: ${lastError?.message}`,
    );
  }

  /**
   * Validate that the AI returned a meaningful response.
   * Throws if the response is empty or suspiciously short.
   */
  private validateResponse(content: string, minLength: number): void {
    if (!content || content.trim().length === 0) {
      throw new ServiceUnavailableException('AI returned an empty response');
    }

    if (content.trim().length < minLength) {
      throw new ServiceUnavailableException(
        `AI response too short (${content.trim().length} chars, minimum ${minLength})`,
      );
    }
  }

  /**
   * Generate a deterministic cache key from a prompt.
   * Used when callers don't want to manage their own cache keys.
   * SHA-256 of the prompt → consistent, collision-resistant, fixed-length key.
   */
  buildCacheKey(namespace: string, prompt: string): string {
    const hash = crypto
      .createHash('sha256')
      .update(prompt)
      .digest('hex')
      .substring(0, 16); // first 16 hex chars is plenty for uniqueness
    return `ai:${namespace}:${hash}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
