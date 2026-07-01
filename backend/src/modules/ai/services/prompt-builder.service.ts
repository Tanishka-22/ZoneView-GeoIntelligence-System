import { Injectable } from '@nestjs/common';
import {
  LocationContext,
  DevelopmentRecordContext,
  ComparisonContext,
} from '../interfaces/ai-context.interface';

/**
 * Builds structured AI prompts from context objects.
 *
 * Each method is a named prompt template — versioned by the method name.
 * If you improve a prompt, add a V2 method rather than modifying the original,
 * so existing stored insights remain reproducible.
 *
 * Prompt engineering principles applied:
 * - Role prompting (system persona)
 * - Context grounding (verified data only)
 * - Output structuring (explicit format instructions)
 * - Negative constraints (what NOT to do)
 * - Clean data formatting (consistent structure the model can parse)
 */
@Injectable()
export class PromptBuilderService {

  // ─── Regional Summary ─────────────────────────────────────────

  buildRegionalSummaryPrompt(context: LocationContext): {
    systemPrompt: string;
    userPrompt: string;
  } {
    const systemPrompt =
      'You are a regional development analyst specializing in Indian urban ' +
      'infrastructure and government initiatives. You provide clear, factual, ' +
      'and insightful analysis based strictly on verified data. ' +
      'You write in professional prose without bullet points or headers. ' +
      'You do not speculate beyond the provided data.';

    const userPrompt = `
Analyze the following verified regional development data and provide a comprehensive intelligence summary.

LOCATION OVERVIEW
─────────────────
Name: ${context.name}
State: ${context.state ?? 'Not specified'}
District: ${context.district ?? 'Not specified'}
${context.description ? `Background: ${context.description}` : ''}

DEVELOPMENT STATISTICS
──────────────────────
Total Projects: ${context.stats.totalProjects}
Ongoing:        ${context.stats.ongoingProjects}
Completed:      ${context.stats.completedProjects}
Planned:        ${context.stats.plannedProjects}
${context.stats.cancelledProjects > 0 ? `Cancelled:      ${context.stats.cancelledProjects}` : ''}
Total Budget:   ₹${context.stats.totalBudgetCrore} Crore

ACTIVE ORGANIZATIONS
────────────────────
${context.organizationNames.length > 0 ? context.organizationNames.join(', ') : 'Not specified'}

DEVELOPMENT SECTORS
───────────────────
${context.categoryNames.join(', ')}

DEVELOPMENT RECORDS
───────────────────
${this.formatDevelopmentList(context.developments)}

ANALYSIS INSTRUCTIONS
─────────────────────
Based ONLY on the verified data above, provide a 3-4 paragraph regional intelligence summary covering:

1. Overall development momentum and investment scale
2. Key infrastructure themes and sectoral focus
3. Notable organizations driving development and their roles
4. Assessment of project pipeline (completed vs ongoing vs planned)

Do not include bullet points, numbered lists, or section headers in your response.
Do not reference any information not present in the data above.
Do not include phrases like "based on the data" or "according to the information provided".
Write as a confident analyst presenting findings.
    `.trim();

    return { systemPrompt, userPrompt };
  }

  // ─── Development Record Explanation ──────────────────────────

  buildDevelopmentExplanationPrompt(context: DevelopmentRecordContext): {
    systemPrompt: string;
    userPrompt: string;
  } {
    const systemPrompt =
      'You are a regional development analyst specializing in Indian urban ' +
      'infrastructure. You explain development projects clearly and concisely, ' +
      'focusing on purpose, impact, and regional significance. ' +
      'You write in professional prose. You do not speculate beyond verified data.';

    const userPrompt = `
Explain the following verified development project and its significance.

PROJECT DETAILS
───────────────
Title:        ${context.title}
Location:     ${context.locationName}${context.locationState ? `, ${context.locationState}` : ''}
Category:     ${context.category}
Status:       ${context.status}
${context.organization ? `Organization: ${context.organization}` : ''}
${context.budgetCrore ? `Budget:       ₹${context.budgetCrore} Crore` : ''}
${context.startDate ? `Start Date:   ${context.startDate}` : ''}
${context.endDate ? `End Date:     ${context.endDate}` : ''}
${context.description ? `\nDescription:\n${context.description}` : ''}

ANALYSIS INSTRUCTIONS
─────────────────────
Provide a 2-3 paragraph explanation covering:

1. What this project is and what problem it addresses
2. Expected impact on the local population and region
3. Significance in the context of regional development

Do not use bullet points or headers.
Do not include phrases like "based on the data provided".
Do not speculate about information not present above.
Write as a confident analyst.
    `.trim();

    return { systemPrompt, userPrompt };
  }

  // ─── Regional Comparison ──────────────────────────────────────

  buildComparisonPrompt(context: ComparisonContext): {
    systemPrompt: string;
    userPrompt: string;
  } {
    const systemPrompt =
      'You are a regional development analyst specializing in comparative ' +
      'analysis of Indian urban infrastructure. You identify meaningful ' +
      'differences and similarities between regions based strictly on verified data. ' +
      'You write in professional prose without bullet points.';

    const locationSections = context.locations
      .map(
        (loc, index) => `
LOCATION ${index + 1}: ${loc.name.toUpperCase()}
${'─'.repeat(40)}
State:           ${loc.state ?? 'Not specified'}
Total Projects:  ${loc.stats.totalProjects}
Ongoing:         ${loc.stats.ongoingProjects}
Completed:       ${loc.stats.completedProjects}
Planned:         ${loc.stats.plannedProjects}
Total Budget:    ₹${loc.stats.totalBudgetCrore} Crore
Sectors:         ${loc.categoryNames.join(', ')}
Organizations:   ${loc.organizationNames.join(', ') || 'Not specified'}

Projects:
${this.formatDevelopmentList(loc.developments)}
        `.trim(),
      )
      .join('\n\n');

    const locationNames = context.locations.map((l) => l.name).join(' and ');

    const userPrompt = `
Compare the following verified regional development data for ${locationNames}.

${locationSections}

ANALYSIS INSTRUCTIONS
─────────────────────
Provide a 3-4 paragraph comparative analysis covering:

1. Overall investment scale and development velocity comparison
2. Sectoral priorities — where each region is focusing its development
3. Key similarities in development approach or funding sources
4. Key differences and what they reveal about each region's priorities
5. Which region shows stronger development momentum and why

Do not use bullet points, numbered lists, or section headers.
Do not reference information not present in the data above.
Write as a confident analyst presenting a comparative intelligence brief.
    `.trim();

    return { systemPrompt, userPrompt };
  }

  // ─── Private Helpers ──────────────────────────────────────────

  private formatDevelopmentList(
    developments: LocationContext['developments'],
  ): string {
    if (developments.length === 0) return 'No development records found.';

    return developments
      .map((d) => {
        const parts = [
          `• ${d.title}`,
          `  Status: ${d.status}`,
          `  Category: ${d.category}`,
        ];

        if (d.organization) parts.push(`  Organization: ${d.organization}`);
        if (d.budgetCrore) parts.push(`  Budget: ₹${d.budgetCrore} Crore`);
        if (d.startDate) {
          const dateRange = d.endDate
            ? `${d.startDate} – ${d.endDate}`
            : `${d.startDate} – Present`;
          parts.push(`  Timeline: ${dateRange}`);
        }

        return parts.join('\n');
      })
      .join('\n\n');
  }

  // ─── AI Chat ─────────────────────────────────────────────────

buildChatPrompt(
  message: string,
  locationContext?: LocationContext,
): {
  systemPrompt: string;
  userPrompt: string;
} {
  const systemPrompt =
    'You are ZoneView Assistant, an AI analyst specialized in regional ' +
    'development intelligence for Indian cities and districts. ' +
    'You help users understand regional development data, infrastructure projects, ' +
    'government initiatives, and urban growth patterns. ' +
    'You answer questions clearly and concisely based on the data available. ' +
    'If asked about something outside regional development or not in your data, ' +
    'politely redirect to your area of expertise. ' +
    'Keep responses under 200 words unless detailed explanation is explicitly requested.';

  // If a location was provided, include its context so the chat is grounded
  const locationSection = locationContext
    ? `
CURRENT LOCATION CONTEXT
────────────────────────
You are currently discussing: ${locationContext.name}, ${locationContext.state ?? ''}
Total Projects: ${locationContext.stats.totalProjects}
Ongoing: ${locationContext.stats.ongoingProjects}
Total Investment: ₹${locationContext.stats.totalBudgetCrore} Crore
Active Sectors: ${locationContext.categoryNames.join(', ')}
Active Organizations: ${locationContext.organizationNames.join(', ')}

Recent Projects:
${this.formatDevelopmentList(locationContext.developments.slice(0, 3))}

Answer the user's question in the context of this location's data.
`
    : `
You have access to ZoneView's regional intelligence platform covering
cities across India, currently focused on Madhya Pradesh.
Answer the user's question based on your knowledge of regional development.
`;

  const userPrompt = `
${locationSection}

USER QUESTION
─────────────
${message}

Provide a helpful, accurate response. Be concise unless detail is needed.
Do not use bullet points unless listing more than 3 distinct items.
  `.trim();

  return { systemPrompt, userPrompt };
}

}