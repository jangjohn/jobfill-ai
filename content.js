/**
 * JobFill AI - Content Script
 * Form detection engine + field filler + floating panel
 */

(function () {
  'use strict';

  const FIELD_CATEGORIES = {
    PERSONAL: [
      'name', 'full name', 'first name', 'last name', 'email', 'phone', 'tel', 'address',
      'city', 'zip', 'postal', 'linkedin', 'website', 'location', 'country', 'state'
    ],
    EXPERIENCE: [
      'experience', 'work history', 'years', 'title', 'job title', 'company', 'employer',
      'position', 'duration', 'responsibilities', 'achievements', 'skills'
    ],
    APPLICATION: [
      'cover letter', 'why', 'reason', 'salary', 'desired', 'expected', 'compensation',
      'referral', 'source', 'how did you hear', 'portfolio', 'github'
    ],
    AVAILABILITY: [
      'availability', 'start date', 'when can you start', 'notice period', 'immediately'
    ]
  };

  const CATEGORY_ORDER = ['PERSONAL', 'EXPERIENCE', 'APPLICATION', 'AVAILABILITY', 'CUSTOM'];

  function categorizeField(label, name) {
    const text = ((label || '') + ' ' + (name || '')).toLowerCase();
    for (const [cat, keywords] of Object.entries(FIELD_CATEGORIES)) {
      if (keywords.some((kw) => text.includes(kw))) return cat;
    }
    return 'CUSTOM';
  }

  function humanize(str) {
    if (!str) return '';
    return str.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function resolveLabel(el) {
    const tag = (el.tagName || '').toLowerCase();
    const id = el.id;
    const ariaLabel = el.getAttribute('aria-label');
    const ariaLabelledby = el.getAttribute('aria-labelledby');
    const placeholder = el.placeholder;
    const name = el.name;

    if (id) {
      const labelFor = document.querySelector(`label[for="${CSS.escape(id)}"]`);
      if (labelFor) return (labelFor.textContent || '').trim().replace(/\s+/g, ' ');
    }

    let parent = el.parentElement;
    while (parent && parent !== document.body) {
      if (parent.tagName?.toLowerCase() === 'label') {
        const text = (parent.textContent || '').replace(el.value || '', '').trim().replace(/\s+/g, ' ');
        if (text) return text;
      }
      parent = parent.parentElement;
    }

    if (ariaLabel) return ariaLabel.trim();

    if (ariaLabelledby) {
      const ref = document.getElementById(ariaLabelledby);
      if (ref) return (ref.textContent || '').trim().replace(/\s+/g, ' ');
    }

    let prev = el.previousElementSibling;
    while (prev) {
      const text = (prev.textContent || '').trim().replace(/\s+/g, ' ');
      if (text && text.length < 100) return text;
      prev = prev.previousElementSibling;
    }

    if (placeholder) return placeholder;

    if (name) return humanize(name);

    return 'Unknown Field';
  }

  function getFieldType(el) {
    const tag = (el.tagName || '').toLowerCase();
    const type = (el.type || 'text').toLowerCase();
    const role = (el.getAttribute('role') || '').toLowerCase();

    if (tag === 'select') return 'select';
    if (tag === 'textarea') return 'textarea';
    if (type === 'radio') return 'radio';
    if (type === 'checkbox') return 'checkbox';
    if (type === 'email') return 'email';
    if (type === 'tel') return 'tel';
    if (type === 'number') return 'number';
    if (['date', 'datetime-local', 'month', 'week'].includes(type)) return 'date';
    return 'text';
  }

  function getOptions(el) {
    const tag = (el.tagName || '').toLowerCase();
    if (tag === 'select') {
      return Array.from(el.options).map((o) => ({ value: o.value, text: o.text.trim() }));
    }
    if (el.type === 'radio' || el.type === 'checkbox') {
      const name = el.name;
      if (!name) return null;
      const group = document.querySelectorAll(`input[name="${CSS.escape(name)}"]`);
      return Array.from(group).map((r) => ({
        value: r.value,
        label: (resolveLabel(r) || r.value || '').trim()
      }));
    }
    return null;
  }

  function generateSelector(el) {
    if (el.id && !document.querySelectorAll(`#${CSS.escape(el.id)}`)[1]) {
      return `#${el.id}`;
    }
    if (el.name && el.form) {
      const formId = el.form.id ? `#${el.form.id}` : '';
      const idx = Array.from(el.form.querySelectorAll(`[name="${CSS.escape(el.name)}"]`)).indexOf(el);
      const suffix = idx > 0 ? `:nth-of-type(${idx + 1})` : '';
      return `${formId}[name="${CSS.escape(el.name)}"]${suffix}`;
    }
    const path = [];
    let node = el;
    while (node && node !== document.body) {
      let sel = node.tagName?.toLowerCase() || 'div';
      if (node.id) sel = `#${node.id}`;
      else if (node.className && typeof node.className === 'string') {
        const cls = node.className.trim().split(/\s+/).filter(Boolean)[0];
        if (cls && !/^\d/.test(cls)) sel += '.' + cls.split(/\s+/)[0];
      }
      path.unshift(sel);
      node = node.parentElement;
      if (node?.querySelectorAll(path.join(' > '))?.length === 1) break;
    }
    return path.join(' > ') || 'input,textarea,select';
  }

  function staticScan() {
    const inputs = document.querySelectorAll(
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"])'
    );
    const textareas = document.querySelectorAll('textarea');
    const selects = document.querySelectorAll('select');

    const seen = new Set();
    const fields = [];

    function addEl(el, idx) {
      const type = getFieldType(el);
      if (type === 'radio') {
        const key = `radio-${el.name || idx}`;
        if (seen.has(key)) return;
        seen.add(key);
        const first = document.querySelector(`input[name="${CSS.escape(el.name)}"]`);
        el = first || el;
      } else if (type === 'checkbox') {
        const key = `checkbox-${el.name || el.id || idx}`;
        if (seen.has(key)) return;
        seen.add(key);
      } else {
        const key = `${el.tagName}-${el.name || ''}-${el.id || ''}-${idx}`;
        if (seen.has(key)) return;
        seen.add(key);
      }

      const label = resolveLabel(el);
      const name = (el.name || '').trim();
      const category = categorizeField(label, name);
      const options = getOptions(el);
      const required = el.required || el.getAttribute('aria-required') === 'true';
      const selector = generateSelector(el);
      let currentValue = '';
      if (el.type === 'checkbox' || el.type === 'radio') {
        const checked = document.querySelector(`input[name="${CSS.escape(el.name)}"]:checked`);
        currentValue = checked ? (checked.value || 'yes') : '';
      } else {
        currentValue = (el.value || '').trim();
      }

      fields.push({
        id: `field_${fields.length}`,
        label,
        name,
        category,
        type,
        required,
        options,
        selector,
        currentValue,
        aiValue: null,
        userEdited: false,
        element: el
      });
    }

    inputs.forEach((el, i) => addEl(el, i));
    textareas.forEach((el, i) => addEl(el, inputs.length + i));
    selects.forEach((el, i) => addEl(el, inputs.length + textareas.length + i));

    return fields;
  }

  function setNativeValue(el, value) {
    const tag = (el.tagName || '').toLowerCase();
    const type = (el.type || 'text').toLowerCase();

    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement?.prototype || HTMLInputElement.prototype,
      'value'
    )?.set;
    const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement?.prototype || HTMLTextAreaElement.prototype,
      'value'
    )?.set;
    const nativeSelectValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLSelectElement?.prototype || HTMLSelectElement.prototype,
      'value'
    )?.set;

    if (type === 'checkbox') {
      el.checked = ['true', '1', 'yes', 'on', value].includes(String(value).toLowerCase());
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }
    if (type === 'radio') {
      const name = el.name;
      const group = name ? document.querySelectorAll(`input[name="${CSS.escape(name)}"]`) : [el];
      const valStr = String(value || '').trim().toLowerCase();
      for (const r of group) {
        const rVal = (r.value || '').toLowerCase();
        const rLabel = (resolveLabel(r) || '').toLowerCase();
        if (rVal === valStr || rLabel === valStr ||
            rVal.includes(valStr) || rLabel.includes(valStr) ||
            valStr.includes(rVal) || valStr.includes(rLabel)) {
          r.checked = true;
          r.dispatchEvent(new Event('input', { bubbles: true }));
          r.dispatchEvent(new Event('change', { bubbles: true }));
          return;
        }
      }
      if (group.length && valStr) {
        group[0].checked = true;
        group[0].dispatchEvent(new Event('input', { bubbles: true }));
        group[0].dispatchEvent(new Event('change', { bubbles: true }));
      }
      return;
    }

    if (tag === 'select') {
      const opts = el.options;
      const valStr = String(value || '').trim();
      let matched = false;
      for (let i = 0; i < opts.length; i++) {
        const opt = opts[i];
        if (opt.value === valStr || opt.text.trim() === valStr) {
          nativeSelectValueSetter?.call(el, opt.value);
          matched = true;
          break;
        }
      }
      if (!matched) {
        for (let i = 0; i < opts.length; i++) {
          const opt = opts[i];
          if (opt.text.toLowerCase().includes(valStr.toLowerCase()) ||
              valStr.toLowerCase().includes(opt.text.toLowerCase())) {
            nativeSelectValueSetter?.call(el, opt.value);
            matched = true;
            break;
          }
        }
      }
      if (!matched && opts.length) {
        nativeSelectValueSetter?.call(el, opts[0].value);
      }
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }

    if (tag === 'textarea' && nativeTextAreaValueSetter) {
      nativeTextAreaValueSetter.call(el, value ?? '');
    } else if (nativeInputValueSetter) {
      nativeInputValueSetter.call(el, value ?? '');
    } else {
      el.value = value ?? '';
    }

    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  function fillField(el, value) {
    setNativeValue(el, value);
    el.style.transition = 'box-shadow 0.3s ease';
    el.style.boxShadow = '0 0 0 2px #22c55e';
    setTimeout(() => {
      el.style.boxShadow = '';
    }, 2500);
  }

  function fillFields(fillMap) {
    let filled = 0;
    const fields = staticScan();
    for (const f of fields) {
      const key = f.id;
      let val = fillMap[key] ?? fillMap[f.label] ?? null;
      if (val == null) continue;
      try {
        const el = document.querySelector(f.selector) || f.element;
        if (el) {
          fillField(el, val);
          filled++;
        }
      } catch (_) {}
    }
    return filled;
  }

  // --- Floating Panel (Shadow DOM) ---
  let floatingHost = null;
  let panelVisible = true;

  function createFloatingPanel() {
    if (floatingHost) return floatingHost;

    const host = document.createElement('div');
    host.id = 'jobfill-ai-floating-host';
    document.body.appendChild(host);

    const shadow = host.attachShadow({ mode: 'closed' });
    const container = document.createElement('div');
    container.id = 'jobfill-panel';
    container.className = 'jobfill-panel';
    container.innerHTML = `
      <div class="jobfill-header" data-draggable>
        <span class="jobfill-logo">JobFill</span>
      </div>
      <div class="jobfill-body">
        <div class="jobfill-state" data-state="IDLE">
          <p class="jobfill-message">Scan application forms</p>
          <button class="jobfill-btn" data-action="scan">Scan Page</button>
        </div>
        <div class="jobfill-state" data-state="SCANNING" style="display:none">
          <div class="jobfill-pulse"></div>
          <p class="jobfill-message"><span data-field-count>0</span> fields...</p>
        </div>
        <div class="jobfill-state" data-state="READY" style="display:none">
          <p class="jobfill-message"><span data-field-count>0</span> fields found</p>
          <button class="jobfill-btn" data-action="fillAll">Fill All</button>
          <a href="#" class="jobfill-link" data-action="openPanel">Open Panel</a>
        </div>
        <div class="jobfill-state" data-state="FILLING" style="display:none">
          <div class="jobfill-progress">
            <div class="jobfill-progress-bar" data-progress-bar></div>
          </div>
        </div>
        <div class="jobfill-state" data-state="DONE" style="display:none">
          <span class="jobfill-check">✓</span>
          <a href="#" class="jobfill-link" data-action="openPanel">View Results</a>
        </div>
      </div>
    `;

    fetch(chrome.runtime.getURL('floating.css'))
      .then((r) => r.text())
      .then((css) => {
        const style = document.createElement('style');
        style.textContent = css;
        shadow.appendChild(style);
      })
      .catch(() => {});

    shadow.appendChild(container);
    floatingHost = host;

    Object.assign(container.style, {
      position: 'fixed',
      right: '20px',
      bottom: '20px',
      zIndex: '2147483647'
    });

    let dragStart = null;
    container.querySelector('[data-draggable]').addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      const rect = host.getBoundingClientRect();
      dragStart = { x: e.clientX, y: e.clientY, left: rect.left, top: rect.top };
    });

    document.addEventListener('mousemove', (e) => {
      if (!dragStart) return;
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      host.style.right = '';
      host.style.bottom = '';
      host.style.left = (dragStart.left + dx) + 'px';
      host.style.top = (dragStart.top + dy) + 'px';
    });

    document.addEventListener('mouseup', () => { dragStart = null; });

    container.addEventListener('click', (e) => {
      const action = e.target?.closest('[data-action]')?.dataset?.action;
      if (!action) return;
      e.preventDefault();
      if (action === 'scan') {
        setPanelState('SCANNING');
        chrome.runtime.sendMessage({ type: 'SCAN_FIELDS' }, (res) => {
          const count = res?.fields?.length ?? 0;
          setPanelState('READY', count);
          const flds = res?.fields || [];
          chrome.storage.local.set({ lastScannedFields: flds });
        });
      } else if (action === 'fillAll') {
        setPanelState('FILLING');
        chrome.runtime.sendMessage({ type: 'REQUEST_FILL_ALL' });
      } else if (action === 'openPanel') {
        chrome.runtime.sendMessage({ type: 'OPEN_SIDEPANEL' });
      }
    });

    return host;
  }

  function setPanelState(state, fieldCount = 0) {
    if (!floatingHost?.shadowRoot) return;
    const root = floatingHost.shadowRoot;
    root.querySelectorAll('[data-state]').forEach((el) => {
      el.style.display = el.dataset.state === state ? '' : 'none';
    });
    root.querySelectorAll('[data-field-count]').forEach((el) => { el.textContent = fieldCount; });
    if (state === 'FILLING') {
      const bar = root.querySelector('[data-progress-bar]');
      if (bar) bar.style.width = '0%';
    }
  }

  function updateFillProgress(percent) {
    if (!floatingHost?.shadowRoot) return;
    const bar = floatingHost.shadowRoot.querySelector('[data-progress-bar]');
    if (bar) bar.style.width = percent + '%';
    if (percent >= 100) {
      setPanelState('DONE');
    }
  }

  function togglePanel() {
    panelVisible = !panelVisible;
    if (floatingHost) {
      floatingHost.style.display = panelVisible ? '' : 'none';
    }
  }

  function injectPanel() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => createFloatingPanel());
    } else {
      createFloatingPanel();
    }
  }

  injectPanel();

  // MutationObserver for dynamic forms
  const observer = new MutationObserver(() => {
    const fields = staticScan();
    if (fields.length > 0) {
      chrome.storage.local.set({ lastScannedFields: fields.map((f) => {
        const { element, ...rest } = f;
        return rest;
      }) });
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Listen for "Next" button clicks to rescan
  document.addEventListener('click', (e) => {
    const text = (e.target?.textContent || '').toLowerCase();
    if (['next', 'continue', '下一步'].some((t) => text.includes(t))) {
      setTimeout(() => {
        const fields = staticScan().map((f) => {
          const { element, ...rest } = f;
          return rest;
        });
        if (fields.length > 0) chrome.storage.local.set({ lastScannedFields: fields });
      }, 500);
    }
  }, true);

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === 'SCAN_FIELDS') {
      const fields = staticScan().map((f) => {
        const { element, ...rest } = f;
        return rest;
      });
      sendResponse({ fields });
      return false;
    }
    if (msg.type === 'FILL_FIELDS') {
      const filled = fillFields(msg.fillMap || {});
      sendResponse({ filled });
      return false;
    }
    if (msg.type === 'TOGGLE_FLOATING_PANEL') {
      togglePanel();
      sendResponse({});
      return false;
    }
    if (msg.type === 'UPDATE_FILL_PROGRESS') {
      updateFillProgress(msg.percent ?? 0);
      sendResponse({});
      return false;
    }
  });
})();
