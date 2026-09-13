import '../env.js';
import { DoubaoProvider } from '../llmProvider.js';
import { parseStructuredResume } from '../structuredResumeParser.js';

const sampleResumeText = [
  '香港城市大学',
  '商业人工智能',
  '2025.09 - 2026.07',
  '',
  '招商金科',
  '算法实习生',
  '2026.06 - 2026.09',
].join('\n');

async function main() {
  if (!process.env.ARK_API_KEY) throw new Error('Missing ARK_API_KEY in .env.local or environment');
  if (!process.env.DOUBAO_MODEL) throw new Error('Missing DOUBAO_MODEL in .env.local or environment');

  const structuredResume = await parseStructuredResume(sampleResumeText, {
    provider: new DoubaoProvider(),
    maxAttempts: 2,
  });

  console.log(JSON.stringify(structuredResume, null, 2));
}

main().catch((error) => {
  console.error(`[doubao-resume-parser-test] ${error.message}`);
  if (error.cause) console.error(`[doubao-resume-parser-test] cause: ${error.cause.message}`);
  process.exitCode = 1;
});
