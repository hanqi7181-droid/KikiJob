import { createEmptyStructuredResume } from './resumeSchema.js';

export class DoubaoProvider {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.ARK_API_KEY || '';
    this.model = options.model || process.env.DOUBAO_MODEL || '';
    this.baseUrl = (options.baseUrl || process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3').replace(/\/+$/, '');
    this.fetchImpl = options.fetchImpl || globalThis.fetch;
  }

  async extractStructuredResume(text) {
    if (!this.apiKey) throw new Error('ARK_API_KEY is required for DoubaoProvider');
    if (!this.model) throw new Error('DOUBAO_MODEL is required for DoubaoProvider');
    if (typeof this.fetchImpl !== 'function') throw new Error('fetch is not available in this Node runtime');

    const response = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: RESUME_EXTRACTION_SYSTEM_PROMPT },
          { role: 'user', content: buildResumeExtractionPrompt(text) },
        ],
        temperature: 0,
        response_format: { type: 'json_object' },
      }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const message = payload?.error?.message || payload?.message || `Doubao API request failed: ${response.status}`;
      throw new Error(message);
    }

    const content = payload?.choices?.[0]?.message?.content;
    if (!content) throw new Error('Doubao API returned an empty resume extraction result');
    return parseJsonContent(content);
  }
}

export class MockLLMProvider {
  async extractStructuredResume(text) {
    const rawText = String(text || '');
    const resume = createEmptyStructuredResume();

    resume.basicInfo.email = pick(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i, rawText) || null;
    resume.basicInfo.phone = pick(/(?:\+?86[-\s]?)?1[3-9]\d[-\s]?\d{4}[-\s]?\d{4}/, rawText)?.replace(/\s|-/g, '') || null;

    const educationMatch = rawText.match(
      /(?<school>香港城市大学|[\u4e00-\u9fa5A-Za-z\s]+?(?:大学|学院|University|College))\s*\n(?<major>[^\n]+)\s*\n(?<range>20\d{2}[./-]\d{1,2}\s*[-–—]\s*(?:20\d{2}[./-]\d{1,2}|至今))/,
    );
    if (educationMatch?.groups) {
      const { startDate, endDate } = parseDateRange(educationMatch.groups.range);
      resume.education.push({
        school: educationMatch.groups.school.trim(),
        degree: pick(/(博士|硕士|本科|学士|Master|Bachelor|PhD)/i, rawText) || null,
        major: educationMatch.groups.major.trim(),
        startDate,
        endDate,
        description: educationMatch[0],
      });
    }

    const workMatch = rawText.match(
      /(?<company>招商金科|[\u4e00-\u9fa5A-Za-z\s]+?(?:公司|集团|科技|金科))\s*\n(?<position>[^\n]+)\s*\n(?<range>20\d{2}[./-]\d{1,2}\s*[-–—]\s*(?:20\d{2}[./-]\d{1,2}|至今))/,
    );
    if (workMatch?.groups) {
      const { startDate, endDate } = parseDateRange(workMatch.groups.range);
      resume.workExperience.push({
        company: workMatch.groups.company.trim(),
        position: workMatch.groups.position.trim(),
        startDate,
        endDate,
        description: workMatch[0],
      });
    }

    return resume;
  }
}

export const RESUME_EXTRACTION_SYSTEM_PROMPT = [
  '你是一个简历字段提取器。',
  '你的任务仅仅是从用户简历原文中提取结构化字段。',
  '严格要求：',
  '1. 只能提取简历中明确存在的信息。',
  '2. 禁止推断。',
  '3. 禁止总结。',
  '4. 禁止润色。',
  '5. 禁止改写经历。',
  '6. 禁止补充不存在的信息。',
  '7. 缺失字段返回 null 或空数组。',
  '8. workExperience.description 必须尽可能保留原文。',
  '9. projects.description 必须尽可能保留原文。',
  '10. 不要根据工作内容自行生成技能标签。',
  '11. 日期如果能明确解析，可以统一 YYYY-MM；无法确定则保留原文或 null。',
  '12. 只返回符合指定 Schema 的 JSON。',
].join('\n');

function buildResumeExtractionPrompt(text) {
  return [
    '请把下面的简历原文转换成这个 JSON Schema 对应的数据结构：',
    JSON.stringify(createEmptyStructuredResume(), null, 2),
    '',
    '字段说明：',
    '- basicInfo: name, phone, email, location',
    '- education: school, degree, major, startDate, endDate, description',
    '- workExperience: company, position, startDate, endDate, description',
    '- projects: projectName, role, startDate, endDate, description',
    '- skills: 只保留原文明确列出的技能词或技能短语',
    '',
    '简历原文：',
    String(text || ''),
  ].join('\n');
}

function parseJsonContent(content) {
  const text = String(content || '').trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return JSON.parse(fenced ? fenced[1].trim() : text);
}

function parseDateRange(value = '') {
  const match = value.match(/(20\d{2}[./-]\d{1,2})\s*[-–—]\s*((?:20\d{2}[./-]\d{1,2})|至今)/);
  return {
    startDate: match?.[1] || null,
    endDate: match?.[2] || null,
  };
}

function pick(pattern, text) {
  const match = String(text || '').match(pattern);
  return match ? match[1] || match[0] : '';
}
