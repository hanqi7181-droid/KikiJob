import { MockLLMProvider } from './llmProvider.js';
import { normalizeStructuredResumeCandidate, ResumeSchema } from './resumeSchema.js';

export async function parseStructuredResume(text, options = {}) {
  const provider = options.provider || new MockLLMProvider();
  const maxAttempts = Number(options.maxAttempts || 2);
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const candidate = await provider.extractStructuredResume(text);
      const normalizedCandidate = normalizeStructuredResumeCandidate(candidate);
      const result = ResumeSchema.safeParse(normalizedCandidate);
      if (result.success) return result.data;

      const message = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
      throw new Error(`Structured resume validation failed: ${message}`);
    } catch (error) {
      lastError = error;
      console.warn(`[structured-resume-parser] attempt ${attempt} failed: ${error.message}`);
    }
  }

  const error = new Error('resume_parse_failed');
  error.code = 'resume_parse_failed';
  error.cause = lastError;
  throw error;
}
