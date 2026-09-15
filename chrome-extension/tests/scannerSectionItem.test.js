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

class FakeElement {
  constructor(tagName, options = {}) {
    this.tagName = tagName.toUpperCase();
    this.nodeType = 1;
    this.children = [];
    this.parentElement = null;
    this.innerText = options.text || '';
    this.textContent = options.text || '';
    this.className = options.className || '';
    this.id = options.id || '';
    this.name = options.name || '';
    this.placeholder = options.placeholder || '';
    this.disabled = false;
    this.readOnly = false;
    this.required = false;
  }

  append(...children) {
    for (const child of children) {
      child.parentElement = this;
      this.children.push(child);
    }
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
    if (selector === '*') return descendants;
    if (/input|textarea|select/.test(selector)) {
      return descendants.filter((item) => ['INPUT', 'TEXTAREA', 'SELECT'].includes(item.tagName));
    }
    if (/h1|h2|h3|h4|legend|\[data-section-title\]|\[class\*="title"\]/i.test(selector)) {
      return descendants.filter((item) => /^H[1-4]$/.test(item.tagName) || item.tagName === 'LEGEND' || /title/i.test(item.className));
    }
    if (selector === 'form') return descendants.filter((item) => item.tagName === 'FORM');
    return descendants;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  closest(selector) {
    let current = this;
    while (current) {
      if (selector === 'label' && current.tagName === 'LABEL') return current;
      if (selector === 'form' && current.tagName === 'FORM') return current;
      if (selector === 'button' && current.tagName === 'BUTTON') return current;
      current = current.parentElement;
    }
    return null;
  }

  matches(selector) {
    if (selector.includes('fieldset')) return this.tagName === 'FIELDSET';
    if (selector.includes('.repeater-item')) return /repeater-item/.test(this.className);
    return false;
  }

  hasAttribute(name) {
    return Boolean(this.getAttribute(name));
  }

  getAttribute(name) {
    if (name === 'name') return this.name;
    if (name === 'id') return this.id;
    if (name === 'placeholder') return this.placeholder;
    if (name === 'class') return this.className;
    return '';
  }

  getBoundingClientRect() {
    return { width: 120, height: 24 };
  }

  getClientRects() {
    return [this.getBoundingClientRect()];
  }

  compareDocumentPosition() {
    return 0;
  }
}

function createContext() {
  const body = new FakeElement('body');
  const context = {
    window: {
      JobPilotAutofill: {},
      getComputedStyle() {
        return { display: 'block', visibility: 'visible', opacity: '1' };
      },
    },
    document: {
      body,
      querySelector() {
        return null;
      },
      querySelectorAll(selector) {
        return body.querySelectorAll(selector);
      },
      getElementById() {
        return null;
      },
    },
    location: { href: 'https://talent.baidu.com/apply' },
    CSS: {
      escape(value) {
        return String(value);
      },
    },
    Node: {
      ELEMENT_NODE: 1,
      DOCUMENT_POSITION_FOLLOWING: 4,
    },
    HTMLInputElement: FakeElement,
  };
  context.window.window = context.window;
  context.window.document = context.document;
  vm.createContext(context);
  return context;
}

test('generic scanner captures plain visible repeater item title as section item context', () => {
  const context = createContext();
  const body = context.document.body;
  const item = new FakeElement('div');
  const itemTitle = new FakeElement('div', { text: '项目-1（可填写科研、课程、实习、实践等项目）' });
  const fieldRow = new FakeElement('div');
  const label = new FakeElement('label', { text: '* 项目名称' });
  const input = new FakeElement('input', { name: 'subjectName0', placeholder: '请输入' });

  fieldRow.append(label, input);
  item.append(itemTitle, fieldRow);
  body.append(item);

  loadScript(context, 'src/content/core/scanner.js');
  const fields = context.window.JobPilotAutofill.scanner.scanFields({ id: 'generic', name: 'Generic Careers' });

  assert.equal(fields.length, 1);
  assert.equal(fields[0].section, '项目-1（可填写科研、课程、实习、实践等项目）');
  assert.equal(fields[0].sectionType, 'project');
  assert.equal(fields[0].itemIndex, 0);
  assert.equal(fields[0].sectionItemKey, 'project:0');
  assert.match(fields[0].itemText, /项目-1/);
});
