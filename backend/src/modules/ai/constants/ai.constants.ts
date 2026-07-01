/**
 * Injection token for the AI provider.
 *
 * NestJS's DI system identifies providers by tokens.
 * Using a string token (instead of a class directly) lets us
 * swap which class is injected without changing anything that
 * depends on it — the consumer always asks for 'AI_PROVIDER',
 * and the module decides which class fulfills that token.
 *
 * This is the standard pattern for interface-based injection in NestJS.
 */
export const AI_PROVIDER = 'AI_PROVIDER';

export const AI_CACHE_TTL_SECONDS = 60 * 60 * 24; // 24 hours — AI responses are expensive, cache aggressively

export const AI_MAX_RETRIES = 3;
export const AI_RETRY_BASE_DELAY_MS = 1000; // 1 second base, doubles each retry