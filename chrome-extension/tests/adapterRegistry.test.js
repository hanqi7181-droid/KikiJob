import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';

const extensionRoot = path.resolve('chrome-extension');

function loadScript(context, relativePath) {
  const source = fs.readFileSync(path.join(extensionRoot, relativePath), 'utf8');
  vm.runInContext(source, context, { filename: relativePath });
}

function createContext(url = 'https://jobs.example.com/apply') {
  const root = {
    utils: {
      norm(value = '') {
        return String(value).toLowerCase().replace(/\s+/g, '');
      },
    },
    scanner: {
      scanFields() {
        return [];
      },
    },
    filler: {
      fillControl() {
        return true;
      },
      fillSteps() {
        return [];
      },
    },
  };
  const context = {
    window: { JobPilotAutofill: root },
    location: { href: url },
    document: { body: { innerText: '' } },
    MutationObserver: class {
      observe() {}
      disconnect() {}
    },
    URL,
  };
  context.window.window = context.window;
  vm.createContext(context);
  return context;
}

function loadAdapters(context) {
  loadScript(context, 'src/content/adapters/adapterFactory.js');
  loadScript(context, 'src/content/adapters/generic.js');
  loadScript(context, 'src/content/adapters/beisen.js');
  loadScript(context, 'src/content/adapters/nowcoder.js');
  loadScript(context, 'src/content/adapters/workday.js');
  loadScript(context, 'src/content/adapters/lever.js');
  loadScript(context, 'src/content/adapters/greenhouse.js');
  loadScript(context, 'src/content/adapters/registry.js');
}

test('registry detects mainstream ATS adapters before generic fallback', () => {
  const context = createContext();
  loadAdapters(context);
  const registry = context.window.JobPilotAutofill.registry;

  assert.equal(registry.getAdapter('https://candidate.italent.cn/apply').id, 'beisen');
  assert.equal(registry.getAdapter('https://www.nowcoder.com/jobs/detail/1').id, 'nowcoder');
  assert.equal(registry.getAdapter('https://company.myworkdayjobs.com/careers/job/1').id, 'workday');
  assert.equal(registry.getAdapter('https://jobs.lever.co/example/1').id, 'lever');
  assert.equal(registry.getAdapter('https://boards.greenhouse.io/example/jobs/1').id, 'greenhouse');
  assert.equal(registry.getAdapter('https://jobs.example.com/apply').id, 'generic');
});

test('adapter factory keeps scan output compatible while tagging platform', () => {
  const context = createContext('https://jobs.lever.co/example/1');
  context.window.JobPilotAutofill.scanner.scanFields = () => [
    {
      label: '工作经历 公司名称',
      sectionType: 'internship',
      itemIndex: 1,
      sectionItemKey: 'internship:1',
    },
  ];
  loadAdapters(context);

  const adapter = context.window.JobPilotAutofill.registry.getAdapter('https://jobs.lever.co/example/1');
  const fields = adapter.scanFields();

  assert.equal(adapter.id, 'lever');
  assert.equal(fields[0].platform, 'lever');
  assert.equal(fields[0].adapterName, 'Lever');
  assert.equal(fields[0].sectionItemKey, 'internship:1');
});
