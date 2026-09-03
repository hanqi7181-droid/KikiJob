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

function createContext(url = 'https://app.mokahr.com/campus-recruitment/demo/apply') {
  const root = {
    utils: {
      norm(value = '') {
        return String(value).toLowerCase().replace(/[\s/_\-:：*（）()[\]{}]+/g, '');
      },
    },
    scanner: {
      scanFields(adapter) {
        return [
          {
            label: '邮箱',
            name: 'email',
            id: '',
            placeholder: '请输入邮箱',
            nearbyText: '邮箱',
            adapterName: adapter.name,
          },
        ];
      },
    },
    filler: {
      fillControl(target, value) {
        if (target) target.value = value;
        return true;
      },
      setValue(target, value) {
        if (target) target.value = value;
      },
      fillSteps() {
        return [];
      },
    },
  };
  const context = {
    window: { JobPilotAutofill: root },
    location: { href: url },
    document: {
      body: { innerText: '' },
      querySelector() {
        return null;
      },
    },
    MutationObserver: class {
      observe() {}
      disconnect() {}
    },
    URL,
    RegExp,
  };
  context.window.window = context.window;
  vm.createContext(context);
  return context;
}

class FakeElement {
  constructor(tagName, options = {}) {
    this.tagName = tagName.toUpperCase();
    this.innerText = options.text || '';
    this.textContent = options.text || '';
    this.className = options.className || '';
    this.type = options.type || '';
    this.name = options.name || '';
    this.id = options.id || '';
    this.placeholder = options.placeholder || '';
    this.value = options.value || '';
    this.dataset = {};
    this.disabled = false;
    this.children = [];
    this.parentElement = null;
    this.clicked = 0;
    this.onClick = options.onClick || null;
    this.options = options.options || [];
    this.selectedOptions = [];
  }

  append(...children) {
    for (const child of children) {
      child.parentElement = this;
      this.children.push(child);
    }
    this.refreshText();
  }

  refreshText() {
    const childText = this.children.map((child) => child.innerText || child.textContent || '').filter(Boolean).join(' ');
    if (childText && !this._ownText) {
      this.innerText = childText;
      this.textContent = childText;
    } else if (this._ownText) {
      this.innerText = `${this._ownText} ${childText}`.trim();
      this.textContent = this.innerText;
    }
    this.parentElement?.refreshText?.();
  }

  setOwnText(text) {
    this._ownText = text;
    this.refreshText();
  }

  querySelectorAll(selector) {
    const descendants = [];
    const visit = (node) => {
      for (const child of node.children) {
        descendants.push(child);
        visit(child);
      }
    };
    visit(this);
    return descendants.filter((element) => matchesSelectorBucket(element, selector));
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  getAttribute(name) {
    if (name === 'type') return this.type;
    if (name === 'aria-label' || name === 'title') return '';
    return '';
  }

  getBoundingClientRect() {
    return { width: 100, height: 24 };
  }

  getClientRects() {
    return [this.getBoundingClientRect()];
  }

  scrollIntoView() {}

  click() {
    this.clicked += 1;
    this.onClick?.();
  }
}

function fakeOptions(labels = []) {
  return labels.map((label) => ({
    value: label,
    label,
    textContent: label,
  }));
}

function matchesSelectorBucket(element, selector) {
  const tag = element.tagName.toLowerCase();
  if (selector.includes('input') || selector.includes('textarea') || selector.includes('select')) {
    return ['input', 'textarea', 'select'].includes(tag);
  }
  if (selector.includes('button') || selector.includes('ant-btn')) {
    return tag === 'button' || element.className.includes('ant-btn');
  }
  if (selector.includes('h1') || selector.includes('legend') || selector.includes('title')) {
    return /^h[1-5]$/.test(tag) || tag === 'legend' || element.className.includes('title');
  }
  if (selector.includes('section') || selector.includes('fieldset') || selector.includes('form') || selector.includes('div')) {
    return ['section', 'fieldset', 'form', 'div'].includes(tag);
  }
  return true;
}

function createRepeaterContext({ education = 0, internships = 0, projects = 0, addButtons = true, addWorks = true } = {}) {
  const context = createContext();
  const rootElement = new FakeElement('div');
  const sections = {};

  const root = context.window.JobPilotAutofill;
  root.scanner = {
    isVisible() {
      return true;
    },
    controls(_adapter, scope = context.document) {
      const rootNode = scope.body || scope;
      return rootNode.querySelectorAll('input,textarea,select');
    },
    textAround(element) {
      return element.placeholder || element.name || element.parentElement?.innerText || '';
    },
    scanFields() {
      return [];
    },
  };
  root.filler = {
    fillControl(target, value) {
      target.value = String(value);
      return true;
    },
    setValue(target, value) {
      target.value = String(value);
      if (target.tagName === 'SELECT') {
        const selected = Array.from(target.options || []).find((option) => option.value === value);
        target.selectedOptions = selected ? [selected] : [];
      }
    },
    fillStepsScoped() {
      return [];
    },
  };

  context.window.setInterval = setInterval;
  context.window.clearInterval = clearInterval;
  context.setInterval = setInterval;
  context.clearInterval = clearInterval;
  context.MutationObserver = class {
    observe() {}
    disconnect() {}
  };

  function makeItem(type) {
    const item = new FakeElement('div', { className: `${type}-item` });
    item.setOwnText(type === 'education' ? '学校名称 专业 学历 起止时间' : type === 'workExperience' ? '公司名称 职位名称 工作职责 起止时间' : '项目名称 项目描述 项目中职责 起止时间');
    if (type === 'education') {
      item.append(
        new FakeElement('input', { placeholder: '学校名称' }),
        new FakeElement('select', { placeholder: '学历', options: fakeOptions(['本科', '硕士研究生', '博士']) }),
        new FakeElement('input', { placeholder: '专业' }),
        new FakeElement('input', { placeholder: '开始时间' }),
        new FakeElement('input', { placeholder: '结束时间' })
      );
    } else if (type === 'workExperience') {
      item.append(
        new FakeElement('input', { placeholder: '公司名称' }),
        new FakeElement('input', { placeholder: '部门' }),
        new FakeElement('input', { placeholder: '职位名称' }),
        new FakeElement('input', { placeholder: '开始时间' }),
        new FakeElement('input', { placeholder: '结束时间' }),
        new FakeElement('textarea', { placeholder: '工作职责' })
      );
    } else {
      item.append(
        new FakeElement('input', { placeholder: '项目名称' }),
        new FakeElement('input', { placeholder: '项目角色' }),
        new FakeElement('input', { placeholder: '开始时间' }),
        new FakeElement('input', { placeholder: '结束时间' }),
        new FakeElement('textarea', { placeholder: '项目描述' }),
        new FakeElement('textarea', { placeholder: '项目中职责' })
      );
    }
    return item;
  }

  function makeSection(type, label, count) {
    const section = new FakeElement('section');
    const heading = new FakeElement('h3', { text: label });
    section.append(heading);
    for (let index = 0; index < count; index += 1) section.append(makeItem(type));
    if (addButtons) {
      section.append(new FakeElement('button', {
        text: '添加',
        onClick: () => {
          if (addWorks) section.append(makeItem(type));
        },
      }));
    }
    rootElement.append(section);
    sections[type] = section;
  }

  makeSection('education', '教育背景', education);
  makeSection('workExperience', '工作经历', internships);
  makeSection('projectExperience', '项目经历', projects);

  context.document = {
    body: rootElement,
    querySelector(selector) {
      return rootElement.querySelector(selector);
    },
    querySelectorAll(selector) {
      return rootElement.querySelectorAll(selector);
    },
  };
  context.window.document = context.document;
  context.getSection = (type) => sections[type];
  return context;
}

function loadMokaWithFakeDom(context) {
  loadScript(context, 'src/content/adapters/moka.js');
  const adapter = context.window.JobPilotAutofill.adapters.moka;
  adapter.testWaitMs = 20;
  return adapter;
}

function controlValue(item, placeholder) {
  const control = item.element.querySelectorAll('input,textarea,select').find((element) => element.placeholder === placeholder);
  return control?.value || '';
}

test('MokaHR adapter detects MokaHR URLs', () => {
  const context = createContext();
  loadScript(context, 'src/content/adapters/moka.js');

  const adapter = context.window.JobPilotAutofill.adapters.moka;
  assert.equal(adapter.detect('https://app.mokahr.com/campus-recruitment/demo/apply'), true);
  assert.equal(adapter.detect('https://jobs.example.com/apply'), false);
});

test('MokaHR adapter normalizes scanned fields', () => {
  const context = createContext();
  loadScript(context, 'src/content/adapters/moka.js');

  const adapter = context.window.JobPilotAutofill.adapters.moka;
  const field = adapter.normalizeField({ label: '手机号码', name: 'mobile', nearbyText: '手机号码' });

  assert.equal(field.adapterName, 'MokaHR');
  assert.equal(field.platform, 'mokahr');
  assert.equal(field.mokaFieldKind, 'phone');
});

test('MokaHR adapter centralizes internal field filtering', () => {
  const context = createContext();
  loadScript(context, 'src/content/adapters/moka.js');

  const adapter = context.window.JobPilotAutofill.adapters.moka;
  const element = {
    name: 'moka-version',
    id: '',
    placeholder: '',
    getAttribute() {
      return '';
    },
  };

  assert.equal(adapter.isInternalField(element), true);
});

test('MokaHR scanFields composes generic scanner with adapter normalization', () => {
  const context = createContext();
  loadScript(context, 'src/content/adapters/moka.js');

  const adapter = context.window.JobPilotAutofill.adapters.moka;
  const fields = adapter.scanFields();

  assert.equal(fields.length, 1);
  assert.equal(fields[0].adapterName, 'MokaHR');
  assert.equal(fields[0].mokaFieldKind, 'email');
});

test('registry falls back to generic when adapter detection fails', () => {
  const context = createContext('https://jobs.example.com/apply');
  context.window.JobPilotAutofill.adapters = {
    moka: {
      id: 'mokahr',
      detect() {
        throw new Error('bad adapter');
      },
    },
    generic: {
      id: 'generic',
      detect() {
        return true;
      },
    },
  };

  loadScript(context, 'src/content/adapters/registry.js');
  const adapter = context.window.JobPilotAutofill.registry.getAdapter('https://jobs.example.com/apply');

  assert.equal(adapter.id, 'generic');
});

test('MokaHR repeater adds one education item and fills each school separately', async () => {
  const context = createRepeaterContext({ education: 1, internships: 0, projects: 0 });
  const adapter = loadMokaWithFakeDom(context);
  const steps = [
    { id: 'education1School', field: '教育经历1-学校', sourceLabel: '教育经历1-学校', value: '香港城市大学', requiresUserCheck: false },
    { id: 'education2School', field: '教育经历2-学校', sourceLabel: '教育经历2-学校', value: '大连交通大学', requiresUserCheck: false },
  ];

  const results = await adapter.fillSteps(steps);
  const items = adapter.detectRepeaterSection('education').getItems();

  assert.equal(items.length, 2);
  assert.equal(controlValue(items[0], '学校名称'), '香港城市大学');
  assert.equal(controlValue(items[1], '学校名称'), '大连交通大学');
  assert.ok(results.some((item) => item.status === 'repeater_status' && item.reason.includes('需要新增 1 条')));
});

test('MokaHR repeater adds two internships and fills three companies separately', async () => {
  const context = createRepeaterContext({ education: 0, internships: 1, projects: 0 });
  const adapter = loadMokaWithFakeDom(context);
  const steps = [
    { id: 'internship1Company', field: '实习经历1-公司名称', sourceLabel: '实习经历1-公司名称', value: '大连商品交易所·飞创信息技术有限公司', requiresUserCheck: false },
    { id: 'internship2Company', field: '实习经历2-公司名称', sourceLabel: '实习经历2-公司名称', value: '招商局集团 ·招商局金融科技有限公司', requiresUserCheck: false },
    { id: 'internship3Company', field: '实习经历3-公司名称', sourceLabel: '实习经历3-公司名称', value: '中国联通(辽宁)产业互联网有限公司', requiresUserCheck: false },
  ];

  await adapter.fillSteps(steps);
  const items = adapter.detectRepeaterSection('workExperience').getItems();

  assert.equal(items.length, 3);
  assert.equal(controlValue(items[0], '公司名称'), '大连商品交易所·飞创信息技术有限公司');
  assert.equal(controlValue(items[1], '公司名称'), '招商局集团 ·招商局金融科技有限公司');
  assert.equal(controlValue(items[2], '公司名称'), '中国联通(辽宁)产业互联网有限公司');
});

test('MokaHR repeater matches select degree with normalized value and keeps debug report', async () => {
  const context = createRepeaterContext({ education: 1, internships: 0, projects: 0 });
  const adapter = loadMokaWithFakeDom(context);
  const steps = [
    { id: 'education1Degree', field: '教育经历1-学历', sourceLabel: '教育经历1-学历', value: '硕士', requiresUserCheck: false },
  ];

  const results = await adapter.fillSteps(steps);
  const items = adapter.detectRepeaterSection('education').getItems();
  const degreeResult = results.find((item) => item.canonicalField === 'degreeLevel');

  assert.equal(controlValue(items[0], '学历'), '硕士研究生');
  assert.equal(degreeResult.status, 'filled');
  assert.match(degreeResult.debugReport, /canonicalField = degreeLevel/);
  assert.match(degreeResult.debugReport, /select option/);
});

test('MokaHR repeater normalizes dates before filling item-local controls', async () => {
  const context = createRepeaterContext({ education: 1, internships: 0, projects: 0 });
  const adapter = loadMokaWithFakeDom(context);
  const steps = [
    { id: 'education1StartDate', field: '教育经历1-开始时间', sourceLabel: '教育经历1-开始时间', value: '2025.09', requiresUserCheck: false },
    { id: 'education1EndDate', field: '教育经历1-结束时间', sourceLabel: '教育经历1-结束时间', value: '2026/07', requiresUserCheck: false },
  ];

  await adapter.fillSteps(steps);
  const items = adapter.detectRepeaterSection('education').getItems();

  assert.equal(controlValue(items[0], '开始时间'), '2025-09');
  assert.equal(controlValue(items[0], '结束时间'), '2026-07');
});

test('MokaHR repeater does not add duplicate items on second autofill run', async () => {
  const context = createRepeaterContext({ education: 1, internships: 0, projects: 0 });
  const adapter = loadMokaWithFakeDom(context);
  const steps = [
    { id: 'education1School', field: '教育经历1-学校', sourceLabel: '教育经历1-学校', value: '香港城市大学', requiresUserCheck: false },
    { id: 'education2School', field: '教育经历2-学校', sourceLabel: '教育经历2-学校', value: '大连交通大学', requiresUserCheck: false },
  ];

  await adapter.fillSteps(steps);
  await adapter.fillSteps(steps);

  assert.equal(adapter.detectRepeaterSection('education').getItems().length, 2);
});

test('MokaHR repeater does not click unrelated buttons when add button is missing', async () => {
  const context = createRepeaterContext({ education: 1, internships: 0, projects: 0, addButtons: false });
  const adapter = loadMokaWithFakeDom(context);
  const steps = [
    { id: 'education1School', field: '教育经历1-学校', sourceLabel: '教育经历1-学校', value: '香港城市大学', requiresUserCheck: false },
    { id: 'education2School', field: '教育经历2-学校', sourceLabel: '教育经历2-学校', value: '大连交通大学', requiresUserCheck: false },
  ];

  const results = await adapter.fillSteps(steps);

  assert.equal(adapter.detectRepeaterSection('education').getItems().length, 1);
  assert.ok(results.some((item) => item.status === 'needs_confirmation' && item.reason.includes('请手动点击添加')));
});

test('MokaHR repeater stops when add button click does not create a new item', async () => {
  const context = createRepeaterContext({ education: 1, internships: 0, projects: 0, addButtons: true, addWorks: false });
  const adapter = loadMokaWithFakeDom(context);
  const steps = [
    { id: 'education1School', field: '教育经历1-学校', sourceLabel: '教育经历1-学校', value: '香港城市大学', requiresUserCheck: false },
    { id: 'education2School', field: '教育经历2-学校', sourceLabel: '教育经历2-学校', value: '大连交通大学', requiresUserCheck: false },
  ];

  const results = await adapter.fillSteps(steps);

  assert.equal(adapter.detectRepeaterSection('education').getItems().length, 1);
  assert.ok(results.some((item) => item.status === 'needs_confirmation' && item.reason.includes('没有新增')));
});
