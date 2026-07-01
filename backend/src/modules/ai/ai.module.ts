import { Module } from '@nestjs/common';
import { AIService } from './ai.service';
import { MockAIProvider } from './providers/mock.provider';
//import { OpenAIProvider } from './providers/openai.provider';
import { ContextBuilderService } from './services/context-builder.service';
import { PromptBuilderService } from './services/prompt-builder.service';
import { AIInsightService } from './services/ai-insight.service';
import { AIController } from './ai.controller';
import { AI_PROVIDER } from './constants/ai.constants';
import { UsageModule } from '../usage/usage.module';

/**
 * To switch from mock to OpenAI:
 * 1. Import OpenAIProvider
 * 2. Change useClass: MockAIProvider → useClass: OpenAIProvider
 * Nothing else in the codebase changes.
 */
@Module({
  imports: [UsageModule],
  controllers: [AIController],
  providers: [
    {
      provide: AI_PROVIDER,
      useClass: MockAIProvider,
    },
    MockAIProvider,
    //OpenAIProvider,
    AIService,
    ContextBuilderService,
    PromptBuilderService,
    AIInsightService,
  ],
  exports: [
    AIService,
    ContextBuilderService,
    PromptBuilderService,
    AIInsightService,
  ],
})
export class AIModule {}
