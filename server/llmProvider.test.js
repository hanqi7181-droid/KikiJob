import assert from 'node:assert/strict';
import test from 'node:test';
import { DoubaoProvider } from './llmProvider.js';

test('DoubaoProvider calls Ark OpenAI-compatible chat completions and parses JSON content', async () => {
  let requestUrl = '';
  let requestBody = null;
  const provider = new DoubaoProvider({
    apiKey: 'test-key',
    model: 'test-model',
    baseUrl: 'https://ark.example.com/api/v3/',
    fetchImpl: async (url, options) => {
      requestUrl = url;
      requestBody = JSON.parse(options.body);
      assert.equal(options.headers.Authorization, 'Bearer test-key');
      return {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  basicInfo: { name: null, phone: null, email: null, location: null },
                  education: [
                    {
                      school: '香港城市大学',
                      degree: null,
                      major: '商业人工智能',
                      startDate: '2025-09',
                      endDate: '2026-07',
                      description: '香港城市大学\n商业人工智能\n2025.09 - 2026.07',
                    },
                  ],
                  workExperience: [],
                  projects: [],
                  skills: [],
                }),
              },
            },
          ],
        }),
      };
    },
  });

  const structuredResume = await provider.extractStructuredResume('香港城市大学\n商业人工智能');

  assert.equal(requestUrl, 'https://ark.example.com/api/v3/chat/completions');
  assert.equal(requestBody.model, 'test-model');
  assert.equal(requestBody.temperature, 0);
  assert.equal(requestBody.response_format.type, 'json_object');
  assert.equal(structuredResume.education[0].school, '香港城市大学');
});
