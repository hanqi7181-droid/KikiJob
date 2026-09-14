import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAutofillPreview, buildAutofillPreviewFromScannedFields, buildAutofillScript } from './careerAutofill.js';

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
  {
    id: 'internship1Company',
    label: '实习经历1-公司名称',
    sourceLabel: '实习经历1-公司名称',
    value: '招商金科',
    aliases: '公司名称 / Company / 雇主',
    group: '实习经历',
    sectionType: 'internship',
    itemIndex: 0,
  },
  {
    id: 'internship2Company',
    label: '实习经历2-公司名称',
    sourceLabel: '实习经历2-公司名称',
    value: '中国联通',
    aliases: '公司名称 / Company / 雇主',
    group: '实习经历',
    sectionType: 'internship',
    itemIndex: 1,
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

test('placeholder-only scan is not treated as a reliable field label', () => {
  const preview = buildAutofillPreviewFromScannedFields(
    {
      url: 'https://jobs.example.com/apply',
      adapter: 'generic',
      fields: [{ fieldId: 'field-1', elementType: 'input', inputType: 'text', placeholder: '请输入邮箱' }],
    },
    mappings,
  );

  assert.equal(preview.fields[0].matchedLabel, '');
  assert.equal(preview.fields[0].confidence, '未匹配');
});

test('section context prevents work fields from matching education mappings', () => {
  const preview = buildAutofillPreviewFromScannedFields(
    {
      url: 'https://jobs.example.com/apply',
      adapter: 'generic',
      fields: [
        {
          fieldId: 'field-1',
          elementType: 'input',
          inputType: 'text',
          label: '学校名称',
          placeholder: '请输入学校名称',
          section: '工作经历',
          nearbyText: '工作经历 公司名称 职位名称 工作职责',
        },
      ],
    },
    mappings,
  );

  assert.equal(preview.fields[0].matchedLabel, '');
  assert.equal(preview.fields[0].confidence, '未匹配');
});

test('section item context keeps repeated work cards aligned by index', () => {
  const preview = buildAutofillPreviewFromScannedFields(
    {
      url: 'https://jobs.example.com/apply',
      adapter: 'generic',
      fields: [
        {
          fieldId: 'work-card-2-company',
          elementType: 'input',
          inputType: 'text',
          label: '公司名称',
          sectionType: 'internship',
          section: '工作经历',
          itemIndex: 1,
          itemText: '工作经历 第 2 条 公司名称 职位名称 起止时间',
        },
      ],
    },
    mappings,
  );

  assert.equal(preview.fields[0].matchedSourceLabel, '实习经历2-公司名称');
  assert.equal(preview.fields[0].value, '中国联通');
});

test('manually confirmed medium-confidence fields are not marked as requiring user check', () => {
  const script = buildAutofillScript({
    fields: [
      {
        id: 'work-desc-1',
        label: '工作描述',
        matchedSourceLabel: '实习经历1-职责描述',
        matchedGroup: '实习经历',
        aliases: '职责描述 / 工作职责',
        type: 'textarea',
        value: '负责业务数据分析。',
        instruction: '用户已确认字段和值',
        confidence: '人工确认',
        userConfirmed: true,
      },
      {
        id: 'salary',
        label: '期望薪资',
        type: 'input',
        value: '待补充',
        instruction: '需要人工选择字段',
        confidence: '中',
      },
    ],
  });

  assert.equal(script[0].requiresUserCheck, false);
  assert.equal(script[0].confirmed, true);
  assert.equal(script[0].userConfirmed, true);
  assert.equal(script[1].requiresUserCheck, true);
});
