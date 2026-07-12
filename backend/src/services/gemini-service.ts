import { config } from '../config';
import { createLogger } from '../utils/logger';

const log = createLogger('GeminiService');

export class GeminiService {
  async getFailureSummary(jobName: string, errorMessage: string, logs: string[]): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      log.info('GEMINI_API_KEY not configured, using local rules-based fallback analyzer');
      return this.getFallbackSummary(jobName, errorMessage, logs);
    }

    try {
      const logsCombined = logs.map(l => `[${l}]`).join('\n');
      const prompt = `You are an expert systems engineer and software reliability advisor.
We had a background job fail in our distributed scheduler. Please analyze the details and provide a concise summary with:
1. What went wrong (root cause)
2. Actionable developer-focused fixes

Job Name: "${jobName}"
Error Message: "${errorMessage}"
Recent Job Logs:
\`\`\`
${logsCombined || '(No log entries recorded)'}
\`\`\`

Provide the response in clean, beautiful Markdown format. Keep it concise (maximum 3 paragraphs).`;

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

      // AbortController with 15-second timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`API returned HTTP ${response.status}`);
        }

        const json = (await response.json()) as any;
        const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          throw new Error('Invalid response structure from Gemini');
        }

        return text;
      } finally {
        clearTimeout(timeout);
      }
    } catch (err: any) {
      log.error(`Gemini API query failed: ${err.message}. Falling back.`);
      return this.getFallbackSummary(jobName, errorMessage, logs);
    }
  }

  private getFallbackSummary(jobName: string, errorMessage: string, logs: string[]): string {
    const errLower = errorMessage.toLowerCase();
    let rootCause = "An unexpected error occurred during execution.";
    let suggestions: string[] = [];

    if (errLower.includes('timeout') || errLower.includes('external api') || errLower.includes('connection')) {
      rootCause = "The job failed because a connection to an external network resource timed out.";
      suggestions = [
        "Check downstream API or microservice health status.",
        "Increase connection and response timeout thresholds in your job configuration.",
        "Validate network settings, DNS resolution, and security groups/firewall rules."
      ];
    } else if (errLower.includes('rate limit') || errLower.includes('429') || errLower.includes('exceeded')) {
      rootCause = "The job hit api rate limits (HTTP 429) from an upstream vendor api.";
      suggestions = [
        "Apply a backoff strategy (exponential or linear retry policies).",
        "Introduce rate limiting on the parent queue to slow down job claims.",
        "Request a quota increase from the upstream api provider."
      ];
    } else if (errLower.includes('deadlock') || errLower.includes('database') || errLower.includes('sql') || errLower.includes('transaction')) {
      rootCause = "A database conflict or write deadlock was encountered.";
      suggestions = [
        "Optimize queries to ensure proper indexing on locked columns.",
        "Keep transactions short and execute multiple updates in priority order.",
        "Verify SQL Connection pool configurations and sqlite WAL locks."
      ];
    } else if (errLower.includes('memory') || errLower.includes('heap') || errLower.includes('allocation')) {
      rootCause = "The worker ran out of memory (Heap allocation failed) trying to process this job.";
      suggestions = [
        "Profile memory usage for memory leaks in the job handler.",
        "Reduce batch sizing or segment large input files into smaller chunks.",
        "Increase Node.js heap limit: `NODE_OPTIONS=--max-old-space-size=4096`."
      ];
    } else if (errLower.includes('format') || errLower.includes('json') || errLower.includes('type') || errLower.includes('parse')) {
      rootCause = "The job payload failed validation or json parsing.";
      suggestions = [
        "Verify the client enqueued valid JSON data.",
        "Enforce Zod payload schema validation before enqueuing.",
        "Check log history for mismatching payload attributes."
      ];
    } else {
      rootCause = `The execution failed with: "${errorMessage}"`;
      suggestions = [
        "Review worker console output for uncaught exceptions.",
        "Add explicit try/catch blocks within the job executor.",
        "Check the payload schema matches handler expectations."
      ];
    }

    return `### 🔍 Expert Diagnosis (Fallback Mode)

**Root Cause:**
\n${rootCause}

**💡 Actionable Developer Fixes:**
\n${suggestions.map(s => `- ${s}`).join('\n')}

> [!NOTE]
> Set \`GEMINI_API_KEY\` in your \`backend/.env\` to enable live AI-generated summaries.`;
  }
}

export const geminiService = new GeminiService();
