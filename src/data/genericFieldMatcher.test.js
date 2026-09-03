import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAnswerBank, flattenAnswerBank } from './answerBank.js';
import { matchScannedField, matchScannedFields } from './genericFieldMatcher.js';

const answerRows = flattenAnswerBank(buildAnswerBank({ resumeName: 'resume.pdf' }, {}));

test('matches email by autocomplete with high confidence', () => {
  const result = matchScannedField(
    {
      fieldId: 'candidate-email',
      elementType: 'input',
      inputType: 'email',
      label: 'Work Email',
      name: 'candidate_email',
      autocomplete: 'email',
      nearbyText: 'Please provide your preferred email address.',
    },
    answerRows
  );

  assert.equal(result.canonicalField, '邮箱');
  assert.equal(result.answer, '18741256546@163.com');
  assert.equal(result.matchSource, 'autocomplete');
  assert.equal(result.confidence, '高');
  assert.equal(result.riskLevel, 'low');
});

test('matches phone by aliases with high confidence', () => {
  const result = matchScannedField(
    {
      fieldId: 'mobile',
      elementType: 'input',
      inputType: 'tel',
      label: 'Mobile Phone Number',
      name: 'mobile',
      placeholder: '+86',
    },
    answerRows
  );

  assert.equal(result.canonicalField, '电话');
  assert.equal(result.answer, '18741256546');
  assert.equal(result.matchSource, 'alias_dictionary');
  assert.equal(result.confidence, '高');
});

test('salary fields require confirmation even when matched nearby', () => {
  const result = matchScannedField(
    {
      fieldId: 'expected_salary',
      elementType: 'input',
      inputType: 'number',
      label: 'Expected Salary',
      name: 'expected_salary',
      nearbyText: '期望薪资范围和当前城市偏好',
    },
    answerRows
  );

  assert.equal(result.confidence, '中');
  assert.equal(result.riskLevel, 'medium');
  assert.match(result.reason, /需要用户确认/);
});

test('does not infer sensitive political status fields', () => {
  const result = matchScannedField(
    {
      fieldId: 'political-status',
      elementType: 'select',
      inputType: 'select',
      label: '政治面貌',
      name: 'political_status',
      options: [
        { label: '中共党员', value: 'party-member' },
        { label: '群众', value: 'none' },
      ],
    },
    answerRows
  );

  assert.equal(result.canonicalField, '');
  assert.equal(result.answer, '');
  assert.equal(result.confidence, '低');
  assert.equal(result.riskLevel, 'high');
  assert.equal(result.matchSource, 'sensitive_field');
});

test('leaves ambiguous unknown fields unmatched', () => {
  const result = matchScannedField(
    {
      fieldId: 'custom-question',
      elementType: 'textarea',
      inputType: 'textarea',
      label: 'Tell us something unique',
      name: 'custom_question',
      nearbyText: 'Optional question from hiring team',
    },
    answerRows
  );

  assert.equal(result.canonicalField, '');
  assert.equal(result.answer, '');
  assert.equal(result.confidence, '低');
  assert.equal(result.matchSource, 'unmatched');
});

test('groups results into matched, needs confirmation, and unmatched', () => {
  const summary = matchScannedFields(
    [
      { fieldId: 'email', elementType: 'input', inputType: 'email', autocomplete: 'email', label: 'Email' },
      { fieldId: 'salary', elementType: 'input', inputType: 'number', label: 'Expected Salary', nearbyText: '期望薪资' },
      { fieldId: 'gender', elementType: 'select', inputType: 'select', label: 'Gender' },
    ],
    answerRows
  );

  assert.equal(summary.matched.length, 1);
  assert.equal(summary.needsConfirmation.length, 1);
  assert.equal(summary.unmatched.length, 1);
});
