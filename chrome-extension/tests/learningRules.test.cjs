const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function loadRules() {
  const module = { exports: {} };
  const context = vm.createContext({ module });
  const source = fs.readFileSync(path.resolve('chrome-extension/src/popup/learningRules.js'), 'utf8');
  vm.runInContext(source, context, { filename: 'learningRules.js' });
  return module.exports;
}

const { fieldSignature, findLearnedMapping, isSensitiveField } = loadRules();

test('learned mappings use page, domain, ats, global priority', () => {
  const field = { label: 'Email', name: 'email', selector: '#email', inputType: 'email' };
  const signature = fieldSignature(field);
  const mappings = [
    { scope: 'global', fieldSignature: signature, canonicalField: '全局邮箱' },
    { scope: 'ats', adapter: 'generic', fieldSignature: signature, canonicalField: 'ATS邮箱' },
    { scope: 'domain', domain: 'example.com', fieldSignature: signature, canonicalField: '域名邮箱' },
    { scope: 'page', pageUrl: 'https://example.com/apply', fieldSignature: signature, canonicalField: '页面邮箱' },
  ];

  const match = findLearnedMapping(field, mappings, {
    pageUrl: 'https://example.com/apply',
    domain: 'example.com',
    adapter: 'generic',
  });

  assert.equal(match.canonicalField, '页面邮箱');
});

test('domain learned mapping beats ATS and global mapping', () => {
  const field = { label: 'Mobile Phone', name: 'mobile', selector: '#phone', inputType: 'tel' };
  const signature = fieldSignature(field);
  const mappings = [
    { scope: 'global', fieldSignature: signature, canonicalField: '全局电话' },
    { scope: 'ats', adapter: 'generic', fieldSignature: signature, canonicalField: 'ATS电话' },
    { scope: 'domain', domain: 'example.com', fieldSignature: signature, canonicalField: '域名电话' },
  ];

  const match = findLearnedMapping(field, mappings, {
    domain: 'example.com',
    adapter: 'generic',
  });

  assert.equal(match.canonicalField, '域名电话');
});

test('sensitive fields are detected for no default autofill', () => {
  assert.equal(isSensitiveField({ label: 'Gender', name: 'gender' }), true);
  assert.equal(isSensitiveField({ label: '政治面貌', name: 'political_status' }), true);
  assert.equal(isSensitiveField({ label: 'Email', name: 'email' }), false);
});
