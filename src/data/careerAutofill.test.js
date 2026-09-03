import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAutofillPreview, buildAutofillPreviewFromScannedFields } from './careerAutofill.js';

const mappings = [
  {
    id: 'fullName',
    label: '姓名',
    sourceLabel: '姓名',
    value: '郑涵亓',
    aliases: '姓名 / Name / Full Name',
    group: '基础资料',
  },
  {
    id: 'email',
    label: '邮箱',
    sourceLabel: '邮箱',
    value: '18741256546@163.com',
    aliases: '邮箱 / Email',
    group: '基础资料',
  },
  {
    id: 'education1School',
    label: '教育经历1-学校',
    sourceLabel: '教育经历1-学校',
    value: '香港城市大学',
    aliases: '毕业院校 / University / 学校',
    group: '教育经历',
  },
];

test('URL-only preview uses Ctrip template when host is known', () => {
  const preview = buildAutofillPreview('https://careers.ctrip.com/#/campus/personal-homepage/addCV', mappings);
  assert.equal(preview.platformId, 'ctrip');
  assert.ok(preview.totalCount > 8);
});

test('extension scan preview uses every scanned DOM field instead of generic URL template', () => {
  const scanPayload = {
    url: 'https://careers.ctrip.com/#/campus/personal-homepage/addCV?tabindex=2&sourceTag=225e12ba',
    adapter: 'generic',
    fields: [
      { fieldId: 'name', elementType: 'input', inputType: 'text', label: '姓名 / Full Name', name: 'candidate_name' },
      { fieldId: 'email', elementType: 'input', inputType: 'email', label: '邮箱 / Email', name: 'email' },
      { fieldId: 'university', elementType: 'input', inputType: 'text', label: '毕业院校 / University', name: 'university' },
      { fieldId: 'custom-1', elementType: 'textarea', inputType: 'textarea', label: '开放问题', name: 'question' },
    ],
  };

  const preview = buildAutofillPreviewFromScannedFields(scanPayload, mappings);
  assert.equal(preview.platform, 'generic 实页扫描');
  assert.equal(preview.totalCount, 4);
  assert.equal(preview.matchedCount, 3);
  assert.equal(preview.fields[0].value, '郑涵亓');
  assert.equal(preview.fields[2].value, '香港城市大学');
  assert.equal(preview.fields[3].confidence, '未匹配');
});
