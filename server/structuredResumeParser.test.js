import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import test from 'node:test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MockLLMProvider } from './llmProvider.js';
import { buildResumeParseDiagnostics, parseResumeFile, structuredResumeToParsedProfile } from './resumeParser.js';
import { parseStructuredResume } from './structuredResumeParser.js';

test('parses structured resume text through provider and Zod validation', async () => {
  const text = [
    '香港城市大学',
    '商业人工智能',
    '2025.09 - 2026.07',
    '',
    '招商金科',
    '算法实习生',
    '2026.06 - 2026.09',
  ].join('\n');

  const structuredResume = await parseStructuredResume(text, {
    provider: new MockLLMProvider(),
  });

  assert.equal(structuredResume.education[0].school, '香港城市大学');
  assert.equal(structuredResume.education[0].major, '商业人工智能');
  assert.equal(structuredResume.education[0].startDate, '2025.09');
  assert.equal(structuredResume.education[0].endDate, '2026.07');
  assert.equal(structuredResume.education[0].description, '香港城市大学\n商业人工智能\n2025.09 - 2026.07');
  assert.equal(structuredResume.workExperience[0].company, '招商金科');
  assert.equal(structuredResume.workExperience[0].position, '算法实习生');
  assert.equal(structuredResume.workExperience[0].description, '招商金科\n算法实习生\n2026.06 - 2026.09');
  assert.deepEqual(structuredResume.projects, []);
  assert.deepEqual(structuredResume.skills, []);
});

test('maps Zod-validated structured resume to existing parsedProfile shape', () => {
  const parsedProfile = structuredResumeToParsedProfile(
    {
      basicInfo: {
        name: '郑涵亓',
        phone: '13800138000',
        email: 'name@example.com',
        location: '深圳',
      },
      education: [
        {
          school: '香港城市大学',
          degree: '硕士',
          major: '商业人工智能',
          startDate: '2025-09',
          endDate: '2026-07',
          description: '香港城市大学 商业人工智能',
        },
      ],
      workExperience: [
        {
          company: '招商金科',
          position: '算法实习生',
          startDate: '2026-06',
          endDate: '2026-09',
          description: '招商金科\n算法实习生',
        },
      ],
      projects: [
        {
          projectName: '智能求职 Web 项目',
          role: '开发者',
          startDate: null,
          endDate: null,
          description: '智能求职 Web 项目',
        },
      ],
      skills: ['Python', 'SQL'],
    },
    '郑涵亓\n香港城市大学\n招商金科',
  );

  assert.equal(parsedProfile.name, '郑涵亓');
  assert.equal(parsedProfile.email, 'name@example.com');
  assert.equal(parsedProfile.educationDetails[0].school, '香港城市大学');
  assert.equal(parsedProfile.educationDetails[0].major, '商业人工智能');
  assert.equal(parsedProfile.workExperienceDetails[0].role, '算法实习生');
  assert.equal(parsedProfile.projectExperienceDetails[0].name, '智能求职 Web 项目');
  assert.deepEqual(parsedProfile.skills, ['Python', 'SQL']);
  assert.equal(parsedProfile.parser, 'doubao');
  assert.equal(parsedProfile.fullText, '郑涵亓 香港城市大学 招商金科');
});

test('normalizes common Doubao JSON aliases before Zod validation', async () => {
  const provider = {
    async extractStructuredResume() {
      return {
        basic_info: {
          full_name: '郑涵亓',
          mobile_phone: '13800138000',
          e_mail: 'name@example.com',
        },
        education_experience: [
          {
            university: '香港城市大学',
            education_level: '硕士',
            field_of_study: '商业人工智能',
            start_date: '2025-09',
            end_date: '2026-07',
          },
        ],
        work_experience: [
          {
            organization: '招商金科',
            job_title: '算法实习生',
            start_date: '2026-06',
            end_date: '2026-09',
          },
        ],
        project_experience: [
          {
            project_name: '智能求职 Web 项目',
            responsibilities: '智能求职 Web 项目',
          },
        ],
        skill_list: 'Python、SQL',
      };
    },
  };

  const structuredResume = await parseStructuredResume('sample', { provider });

  assert.equal(structuredResume.basicInfo.name, '郑涵亓');
  assert.equal(structuredResume.basicInfo.email, 'name@example.com');
  assert.equal(structuredResume.education[0].school, '香港城市大学');
  assert.equal(structuredResume.education[0].major, '商业人工智能');
  assert.equal(structuredResume.workExperience[0].position, '算法实习生');
  assert.equal(structuredResume.projects[0].projectName, '智能求职 Web 项目');
  assert.deepEqual(structuredResume.skills, ['Python', 'SQL']);
});

test('falls back to local extraction when Doubao returns empty structured fields', async () => {
  const previousApiKey = process.env.ARK_API_KEY;
  const previousModel = process.env.DOUBAO_MODEL;
  const previousFetch = globalThis.fetch;
  const tempDir = mkdtempSync(join(tmpdir(), 'auto-cv-resume-'));
  const resumePath = join(tempDir, 'resume.txt');

  process.env.ARK_API_KEY = 'test-key';
  process.env.DOUBAO_MODEL = 'test-model';
  globalThis.fetch = async () => ({
    ok: true,
    async json() {
      return {
        choices: [
          {
            message: {
              content: JSON.stringify({
                basicInfo: { name: null, phone: null, email: null, location: null },
                education: [],
                workExperience: [],
                projects: [],
                skills: [],
              }),
            },
          },
        ],
      };
    },
  });

  try {
    writeFileSync(resumePath, '郑涵亓\n邮箱 name@example.com\n电话 13800138000\n香港城市大学\n商业人工智能', 'utf8');
    const { rawText, parsedProfile } = await parseResumeFile(resumePath);
    const diagnostics = buildResumeParseDiagnostics(parsedProfile, rawText);

    assert.equal(parsedProfile.parser, 'doubao');
    assert.equal(parsedProfile.parseWarning, 'AI_RETURNED_EMPTY_FIELDS');
    assert.equal(parsedProfile.email, 'name@example.com');
    assert.equal(parsedProfile.phone, '13800138000');
    assert.equal(diagnostics.parseWarning, 'AI_RETURNED_EMPTY_FIELDS');
    assert.equal(diagnostics.hasBasicInfo, true);
  } finally {
    if (previousApiKey === undefined) delete process.env.ARK_API_KEY;
    else process.env.ARK_API_KEY = previousApiKey;
    if (previousModel === undefined) delete process.env.DOUBAO_MODEL;
    else process.env.DOUBAO_MODEL = previousModel;
    globalThis.fetch = previousFetch;
    rmSync(tempDir, { recursive: true, force: true });
  }
});
