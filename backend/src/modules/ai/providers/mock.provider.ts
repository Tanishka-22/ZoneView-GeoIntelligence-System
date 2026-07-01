import { Injectable, Logger } from '@nestjs/common';
import { AIProvider } from '../interfaces/ai-provider.interface';
import { AIGenerationOptions, AIResponse } from '../interfaces/ai-response.interface';

/**
 * Mock AI provider for development and testing.
 *
 * Returns realistic-looking responses instantly with zero cost.
 * Inspects the prompt to return contextually appropriate mock content —
 * so the pipeline can be fully tested end-to-end without a real API key.
 *
 * Swap this for OpenAIProvider in ai.module.ts when ready for production.
 */
@Injectable()
export class MockAIProvider implements AIProvider {
  private readonly logger = new Logger(MockAIProvider.name);
  readonly providerName = 'mock';

  async generateText(
    prompt: string,
    options: AIGenerationOptions = {},
  ): Promise<AIResponse> {
    this.logger.debug(`Mock AI generating response for prompt (${prompt.length} chars)`);

    // Simulate network latency so the pipeline behaves realistically
    await this.simulateLatency();

    const content = this.generateMockContent(prompt);

    const response: AIResponse = {
      content,
      promptTokens: Math.floor(prompt.length / 4), // rough token estimate
      completionTokens: Math.floor(content.length / 4),
      totalTokens: Math.floor((prompt.length + content.length) / 4),
      model: 'mock-v1',
    };

    this.logger.debug(
      `Mock AI response generated: ${response.totalTokens} tokens`,
    );

    return response;
  }

  /**
   * Inspect the prompt to return contextually relevant mock content.
   * This makes testing realistic — responses feel like real AI output
   * rather than generic placeholder text.
   */
  private generateMockContent(prompt: string): string {
    const lowerPrompt = prompt.toLowerCase();

    if (lowerPrompt.includes('regional summary') || lowerPrompt.includes('explain this location')) {
      return (
        'This region is experiencing significant infrastructure-led development, ' +
        'with multiple ongoing projects across transportation, healthcare, and urban planning sectors. ' +
        'The concentration of Smart City Mission investments signals a strong push toward ' +
        'digital governance and citizen services. Current development patterns suggest ' +
        'accelerating urbanization with a focus on connectivity and public amenities. ' +
        'Key growth drivers include government initiative funding and public-private partnerships, ' +
        'positioning this region as an emerging hub for sustainable urban development in central India.'
      );
    }

    if (lowerPrompt.includes('development record') || lowerPrompt.includes('explain this project')) {
      return (
        'This development initiative represents a significant investment in regional infrastructure. ' +
        'The project addresses a critical gap in public services and is expected to directly benefit ' +
        'a substantial portion of the local population upon completion. ' +
        'The timeline and budget allocation align with similar projects in comparable regions, ' +
        'suggesting realistic planning and execution capacity. ' +
        'The involvement of established government agencies provides institutional backing ' +
        'that reduces implementation risk and ensures accountability.'
      );
    }

    if (lowerPrompt.includes('compare') || lowerPrompt.includes('comparison')) {
      return (
        'Comparing these regions reveals distinct development trajectories. ' +
        'While both areas share a foundation of central government scheme funding, ' +
        'their sectoral priorities differ meaningfully. ' +
        'One region shows concentration in transportation and connectivity, ' +
        'while the other demonstrates stronger investment in healthcare and social infrastructure. ' +
        'Development velocity — measured by active project count and budget deployment — ' +
        'is notably higher in the first region, though the second shows stronger completion rates ' +
        'suggesting more conservative but reliable execution. ' +
        'Both regions would benefit from cross-learning opportunities in their respective areas of strength.'
      );
    }

    // Default response for other prompt types
    return (
      'Based on the available regional data, this area demonstrates active development ' +
      'across multiple sectors with a mix of central scheme funding and state-level initiatives. ' +
      'The development pattern is consistent with tier-2 city growth trajectories in Madhya Pradesh, ' +
      'with infrastructure investment preceding commercial and residential expansion.'
    );
  }

  private async simulateLatency(): Promise<void> {
    // 200-600ms — realistic for a fast LLM API call
    const ms = 200 + Math.random() * 400;
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}