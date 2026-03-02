/**
 * JobFill AI - Content Script
 * Form detection engine + field filler + floating panel
 */
console.log('[JobFill] Content script loaded');

(function () {
  'use strict';

  const FIELD_CATEGORIES = {
    PERSONAL: [
      'name', 'full name', 'first name', 'last name', 'email', 'phone', 'tel', 'address',
      'city', 'zip', 'postal', 'linkedin', 'website', 'url', 'location', 'country', 'state'
    ],
    EXPERIENCE: [
      'experience', 'work history', 'years', 'title', 'job title', 'company', 'employer',
      'position', 'duration', 'responsibilities', 'achievements', 'skills'
    ],
    APPLICATION: [
      'cover letter', 'why', 'reason', 'salary', 'desired', 'expected', 'compensation',
      'referral', 'source', 'how did you hear', 'portfolio', 'github',
      'additional', 'additional information', 'additional info', 'message', 'comments'
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

  function getOwnText(element) {
    let text = '';
    for (const node of element.childNodes) {
      if (node.nodeType === 3) {
        text += node.textContent;
      }
    }
    return text.trim();
  }

  function cleanLabelText(label, el) {
    if (!label || typeof label !== 'string') return '';
    let out = label
      .split('\n')[0]
      .split('*')[0]
      .replace(/\[.*?\]/g, '')
      .trim()
      .replace(/\/$/, '')
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, 60);
    if (!out && el) {
      const name = (el.getAttribute?.('name') || el.name || '').trim();
      out = name ? humanize(name) : 'File Upload';
    }
    return out || 'File Upload';
  }

  function getCleanLabelText(sourceEl, formEl) {
    if (!sourceEl) return formEl ? (formEl.getAttribute?.('name') ? humanize(formEl.name) : 'File Upload') : '';
    const raw = getOwnText(sourceEl).replace(/\s+/g, ' ');
    return cleanLabelText(raw, formEl);
  }

  const UUID_LABEL_PATTERN = /\[?[0-9a-f]{8}[-\s][0-9a-f]{4}/i;

  function findLabelForUuidField(el) {
    let node = el.parentElement;
    for (let level = 0; level < 3 && node; level++) {
      if (node.matches && node.matches('h1, h2, h3, h4, h5, h6, legend')) {
        const t = getCleanLabelText(node, el);
        if (t) return t;
      }
      const heading = node.querySelector?.('h1, h2, h3, h4, h5, h6, legend');
      if (heading) {
        const t = getCleanLabelText(heading, el);
        if (t) return t;
      }
      const dataName = node.getAttribute?.('data-field-name') || node.getAttribute?.('data-label');
      if (dataName) return dataName.trim().slice(0, 60);
      node = node.parentElement;
    }
    return null;
  }

  function sanitizeLabelIfUuid(el, label) {
    if (!label || UUID_LABEL_PATTERN.test(label)) {
      const alt = findLabelForUuidField(el);
      if (alt) return alt;
      return label && UUID_LABEL_PATTERN.test(label) ? 'Custom Field' : label;
    }
    return label;
  }

  function resolveLabel(el) {
    const id = el.id;
    const ariaLabel = el.getAttribute('aria-label');
    const ariaLabelledby = el.getAttribute('aria-labelledby');
    const placeholder = el.placeholder;
    const name = el.name;

    let result = '';

    if (id) {
      const labelFor = document.querySelector(`label[for="${CSS.escape(id)}"]`);
      if (labelFor) {
        result = getCleanLabelText(labelFor, el);
        if (result) return sanitizeLabelIfUuid(el, result);
      }
    }

    let parent = el.parentElement;
    while (parent && parent !== document.body) {
      if (parent.tagName?.toLowerCase() === 'label') {
        result = getCleanLabelText(parent, el);
        if (result) return sanitizeLabelIfUuid(el, result);
      }
      parent = parent.parentElement;
    }

    if (ariaLabel) return sanitizeLabelIfUuid(el, cleanLabelText(ariaLabel, el) || ariaLabel.trim().slice(0, 60));

    if (ariaLabelledby) {
      const ref = document.getElementById(ariaLabelledby);
      if (ref) {
        result = getCleanLabelText(ref, el);
        if (result) return sanitizeLabelIfUuid(el, result);
      }
    }

    const prev = el.previousElementSibling;
    if (prev) {
      result = getCleanLabelText(prev, el);
      if (result) return sanitizeLabelIfUuid(el, result);
    }

    const dataLabel = el.getAttribute('data-label') || el.getAttribute('data-placeholder');
    if (dataLabel) return sanitizeLabelIfUuid(el, cleanLabelText(dataLabel, el) || dataLabel.trim().slice(0, 60));

    if (placeholder) return cleanLabelText(placeholder, el) || placeholder.trim().slice(0, 60);

    if (name) {
      result = humanize(name);
      return sanitizeLabelIfUuid(el, cleanLabelText(result, el) || result);
    }

    return 'Unknown Field';
  }

  function getFieldType(el) {
    const tag = (el.tagName || '').toLowerCase();
    const type = (el.type || 'text').toLowerCase();
    const role = (el.getAttribute('role') || '').toLowerCase();

    if (tag === 'select') return 'select';
    if (tag === 'textarea') return 'textarea';
    if (type === 'file') return 'manual';
    if (type === 'radio') return 'radio';
    if (type === 'checkbox') return 'checkbox';
    if (type === 'email') return 'email';
    if (type === 'tel') return 'tel';
    if (type === 'number') return 'number';
    if (['date', 'datetime-local', 'month', 'week'].includes(type)) return 'date';
    return 'text';
  }

  function queryAllIncludingShadow(root, selector) {
    const results = [];
    const els = root.querySelectorAll(selector);
    results.push(...els);
    const all = root.querySelectorAll('*');
    all.forEach((el) => {
      if (el.shadowRoot) {
        results.push(...queryAllIncludingShadow(el.shadowRoot, selector));
      }
    });
    return results;
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

  function normalizeLabel(label) {
    if (!label || typeof label !== 'string') return '';
    return label
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function labelSimilarity(a, b) {
    const na = normalizeLabel(a);
    const nb = normalizeLabel(b);
    if (!na || !nb) return 0;
    if (na === nb) return 1;
    if (na.includes(nb) || nb.includes(na)) return 1;
    const [shorter, longer] = na.length <= nb.length ? [na, nb] : [nb, na];
    if (longer.length >= shorter.length * 0.8) {
      for (let i = 0; i <= longer.length - shorter.length; i++) {
        if (longer.slice(i, i + shorter.length) === shorter) return 1;
      }
      const subLen = Math.ceil(shorter.length * 0.8);
      for (let i = 0; i <= shorter.length - subLen; i++) {
        const sub = shorter.slice(i, i + subLen);
        if (longer.includes(sub)) return 0.85;
      }
    }
    const maxLen = Math.max(na.length, nb.length);
    const distance = levenshteinDistance(na, nb);
    return 1 - distance / maxLen;
  }

  function levenshteinDistance(a, b) {
    const m = a.length, n = b.length;
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
      }
    }
    return dp[m][n];
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

  function staticScan(root = null) {
    const scope = root || document;
    const useShadow = !root;
    const inputs = useShadow
      ? Array.from(queryAllIncludingShadow(document, 'input')).filter(
          (el) => !['hidden', 'submit', 'button', 'reset', 'image'].includes((el.type || '').toLowerCase())
        )
      : Array.from(scope.querySelectorAll?.('input') || []).filter(
          (el) => !['hidden', 'submit', 'button', 'reset', 'image'].includes((el.type || '').toLowerCase())
        );
    const textareas = useShadow
      ? Array.from(queryAllIncludingShadow(document, 'textarea'))
      : Array.from(scope.querySelectorAll?.('textarea') || []);
    const selects = useShadow
      ? Array.from(queryAllIncludingShadow(document, 'select'))
      : Array.from(scope.querySelectorAll?.('select') || []);

    const seen = new Set();
    const fields = [];

    function addEl(el, idx) {
      if ((el.type || '').toLowerCase() === 'file') {
        const key = `INPUT-${el.name || ''}-${el.id || ''}-${idx}`;
        if (seen.has(key)) return;
        seen.add(key);
        const labelEl = el.closest('form, .application-question, .field-wrapper')
          ?.querySelector('label, h3, h4, .field-label');
        const rawLabel = labelEl ? getOwnText(labelEl) : '';
        const label = cleanLabelText(rawLabel || 'Resume/CV', el) || 'Resume/CV';
        const selector = generateSelector(el);
        fields.push({
          id: `field_${fields.length}`,
          label,
          name: (el.name || '').trim(),
          category: categorizeField(label, el.name || ''),
          type: 'file',
          required: el.required || el.getAttribute('aria-required') === 'true',
          options: null,
          selector,
          currentValue: '',
          aiValue: null,
          userEdited: false,
          element: el,
          manual: true
        });
        return;
      }

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

    const contentEditables = Array.from(scope.querySelectorAll?.('[contenteditable="true"]') || []).filter(
      (el) => el.isContentEditable && (el.getAttribute('role') === 'textbox' || !el.closest('[role="listbox"]'))
    );
    contentEditables.forEach((el, i) => {
      const key = `ce-${el.id || el.className || i}-${(el.getAttribute('aria-label') || el.placeholder || '').slice(0, 30)}`;
      if (seen.has(key)) return;
      seen.add(key);
      const label = el.getAttribute('aria-label') || el.placeholder || resolveLabel(el) || 'Text';
      const selector = generateSelector(el);
      fields.push({
        id: `field_${fields.length}`,
        label,
        name: el.name || el.getAttribute('name') || '',
        category: categorizeField(label, el.name || ''),
        type: 'contenteditable',
        required: el.getAttribute('aria-required') === 'true',
        options: null,
        selector,
        currentValue: (el.textContent || '').trim(),
        aiValue: null,
        userEdited: false,
        element: el
      });
    });

    const comboboxTriggers = (scope.querySelectorAll?.('[role="combobox"]:not(select), [aria-haspopup="listbox"]:not(select)') || []);
    comboboxTriggers.forEach((el, i) => {
      const key = `combobox-${el.id || (el.className && String(el.className).slice(0, 30)) || i}-${el.getAttribute('aria-label') || ''}`;
      if (seen.has(key)) return;
      if (el.closest('[role="listbox"]')) return;
      seen.add(key);
      const label = el.getAttribute('aria-label') || el.getAttribute('placeholder') || resolveLabel(el) || 'Dropdown';
      const selector = generateSelector(el);
      fields.push({
        id: `field_${fields.length}`,
        label,
        name: el.name || el.getAttribute('name') || '',
        category: categorizeField(label, el.name || ''),
        type: 'custom-select',
        required: el.getAttribute('aria-required') === 'true',
        options: null,
        selector,
        currentValue: (el.textContent || el.value || el.innerText || '').trim().replace(/\s+/g, ' '),
        aiValue: null,
        userEdited: false,
        element: el,
        comboboxTrigger: true
      });
    });

    const beforeCount = fields.length;
    const deduplicated = deduplicateFields(fields);
    deduplicated.forEach((f, i) => { f.id = `field_${i}`; });
    console.log(`[JobFill] Scanned ${beforeCount} fields, deduplicated to ${deduplicated.length} fields`);
    return deduplicated;
  }

  function deduplicateFields(fields) {
    const byElement = new Map();
    for (const f of fields) {
      let el = null;
      try {
        el = document.querySelector(f.selector) || f.element;
      } catch (_) {}
      const key = el || f.selector;
      if (byElement.has(key)) {
        const existing = byElement.get(key);
        if ((f.label || '').length > (existing.label || '').length) {
          byElement.set(key, f);
        }
      } else {
        byElement.set(key, f);
      }
    }
    let result = Array.from(byElement.values());
    result = deduplicateByLabelSimilarity(result);
    return result;
  }

  function deduplicateByLabelSimilarity(fields) {
    const result = [];
    for (const f of fields) {
      let merged = false;
      for (let i = 0; i < result.length; i++) {
        const existing = result[i];
        if (labelSimilarity(f.label, existing.label) >= 0.8) {
          if ((f.label || '').length > (existing.label || '').length) {
            result[i] = f;
          }
          merged = true;
          break;
        }
      }
      if (!merged) result.push(f);
    }
    return result;
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
      const v = String(value || '').trim().toLowerCase();
      el.checked = ['true', '1', 'yes', 'on'].includes(v);
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

    if (tag === 'input' || tag === 'textarea') {
      fillInput(el, value ?? '');
      return;
    }
    if (el.isContentEditable || el.getAttribute?.('contenteditable') === 'true') {
      fillContentEditable(el, value ?? '');
      return;
    }
  }

  function fillContentEditable(el, value) {
    el.focus();
    el.textContent = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
  }

  function fillInput(el, value) {
    el.focus();
    const nativeInputSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement?.prototype || HTMLInputElement.prototype, 'value')?.set;
    const nativeTextareaSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement?.prototype || HTMLTextAreaElement.prototype, 'value')?.set;
    const setter = (el.tagName || '').toUpperCase() === 'TEXTAREA' ? nativeTextareaSetter : nativeInputSetter;
    const val = value ?? '';
    if (setter) {
      setter.call(el, val);
    } else {
      el.value = val;
    }
    const inputEvt = new Event('input', { bubbles: true });
    if (typeof InputEvent !== 'undefined') {
      Object.defineProperty(inputEvt, 'inputType', { value: 'insertText', configurable: true });
    }
    el.dispatchEvent(inputEvt);
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
    el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  function fillCustomSelect(triggerEl, value) {
    const valStr = String(value || '').trim().toLowerCase();
    if (!valStr) return false;
    triggerEl.click();
    return new Promise((resolve) => {
      setTimeout(() => {
        const listbox = document.querySelector('[role="listbox"]');
        let option = null;
        if (listbox) {
          const opts = listbox.querySelectorAll('[role="option"]');
          for (const o of opts) {
            const txt = (o.textContent || o.innerText || '').trim().toLowerCase();
            const dataVal = (o.getAttribute('data-value') || '').toLowerCase();
            if (txt === valStr || dataVal === valStr || txt.includes(valStr) || valStr.includes(txt)) {
              option = o;
              break;
            }
          }
          if (!option && opts.length) option = opts[0];
        }
        if (option) {
          option.click();
          resolve(true);
        } else {
          resolve(false);
        }
      }, 300);
    });
  }

  function normalizeCheckboxValue(value) {
    if (value == null) return 'false';
    const v = String(value).trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(v)) return 'true';
    return 'false';
  }

  async function fillField(el, value, fieldMeta) {
    if (fieldMeta?.type === 'checkbox') {
      value = normalizeCheckboxValue(value);
    }
    if (fieldMeta?.type === 'custom-select' || el?.getAttribute?.('role') === 'combobox') {
      const ok = await fillCustomSelect(el, value);
      if (ok) {
        el.style.transition = 'box-shadow 0.3s ease';
        el.style.boxShadow = '0 0 0 2px #22c55e';
        setTimeout(() => { el.style.boxShadow = ''; }, 2500);
      }
      return ok;
    }
    setNativeValue(el, value);
    el.style.transition = 'box-shadow 0.3s ease';
    el.style.boxShadow = '0 0 0 2px #22c55e';
    setTimeout(() => {
      el.style.boxShadow = '';
    }, 2500);
    return true;
  }

  async function fillFields(fillMap, onProgress) {
    let filled = 0;
    const filledIds = [];
    const fields = staticScan();
    const fillable = fields.filter((f) => {
      const val = fillMap[f.id] ?? fillMap[f.label] ?? null;
      return val != null;
    });
    const total = fillable.length;
    for (const f of fields) {
      const key = f.id;
      let val = fillMap[key] ?? fillMap[f.label] ?? null;
      if (val == null) continue;
      if (f.type === 'manual' || f.type === 'file' || f.manual) continue;
      try {
        const el = document.querySelector(f.selector) || f.element;
        if (el) {
          const ok = await fillField(el, val, f);
          const valStr = String(val || '').trim();
          const isNonEmptyFill = f.type === 'checkbox' || valStr !== '';
          if (ok && isNonEmptyFill) {
            filled++;
            filledIds.push(key);
            if (onProgress) onProgress(filled, total);
          }
        }
      } catch (_) {}
    }
    return { filled, filledIds };
  }

  function showPageToast(message) {
    const id = 'jobfill-page-toast';
    let el = document.getElementById(id);
    if (el) el.remove();
    el = document.createElement('div');
    el.id = id;
    el.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#000;color:#fff;padding:12px 20px;border-radius:8px;font-family:system-ui,sans-serif;font-size:14px;font-weight:500;box-shadow:0 4px 20px rgba(0,0,0,0.3);z-index:2147483647;border:1px solid #333;opacity:0;transition:opacity 0.3s ease;';
    el.textContent = message;
    document.body.appendChild(el);
    el.style.opacity = '1';
    setTimeout(() => {
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 350);
    }, 2500);
  }

  // --- Floating Panel (Shadow DOM) ---
  let floatingHost = null;
  let panelVisible = true;
  let doneResetTimer = null;

  const panelStrings = {
    en: { scan: 'Scan', scanPage: 'Scan Page', scanning: 'Scanning...', fieldsFound: 'fields found', fields: 'fields', openPanel: 'Open panel' },
    zh: { scan: '扫描', scanPage: '扫描页面', scanning: '扫描中...', fieldsFound: '个字段已找到', fields: '个字段', openPanel: '打开面板' }
  };

  let isDragging = false;
  let dragStartX, dragStartY, panelStartX, panelStartY;
  let panelLang = 'en';

  function setPanelState(state, fieldCount = 0) {
    if (!floatingHost?.shadowRoot) return;
    const root = floatingHost.shadowRoot;
    const scanBtn = root.querySelector('[data-action="scan"]');
    const statusEl = root.querySelector('[data-status]');
    if (!scanBtn || !statusEl) return;

    clearTimeout(doneResetTimer);
    const s = panelStrings[panelLang];

    if (state === 'IDLE') {
      scanBtn.textContent = s.scan;
      scanBtn.style.display = '';
      scanBtn.disabled = false;
      statusEl.textContent = '';
      statusEl.style.display = 'none';
      const arrowEl = root.querySelector('#jobfill-open-btn');
      if (arrowEl) arrowEl.style.display = 'none';
    } else if (state === 'SCANNING') {
      scanBtn.textContent = s.scanning;
      scanBtn.disabled = true;
      statusEl.style.display = 'none';
      const arrowEl = root.querySelector('#jobfill-open-btn');
      if (arrowEl) arrowEl.style.display = 'none';
    } else if (state === 'DONE') {
      scanBtn.style.display = 'none';
      statusEl.textContent = `✓ ${fieldCount} ${s.fields}`;
      statusEl.style.display = '';
      const arrowEl = root.querySelector('#jobfill-open-btn');
      if (arrowEl) {
        arrowEl.style.display = fieldCount > 0 ? '' : 'none';
      }
      doneResetTimer = setTimeout(() => setPanelState('IDLE'), 3000);
    }
  }

  function createFloatingPanel() {
    chrome.storage.local.get('language', (r) => {
      panelLang = r?.language === 'zh' ? 'zh' : 'en';
      initPanel(panelLang);
    });
  }

  function initPanel(lang) {
    const s = panelStrings[lang || 'en'];

    if (floatingHost) {
      const scanBtn = floatingHost.shadowRoot?.querySelector('#jobfill-scan-btn');
      const arrowEl = floatingHost.shadowRoot?.querySelector('#jobfill-open-btn');
      if (scanBtn) scanBtn.textContent = s.scan;
      if (arrowEl) arrowEl.title = s.openPanel;
      return floatingHost;
    }

    const hostContainer = document.createElement('div');
    hostContainer.id = 'jobfill-ai-floating-host';
    hostContainer.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 2147483647;
      pointer-events: none;
    `;
    document.body.appendChild(hostContainer);

    const shadow = hostContainer.attachShadow({ mode: 'open' });

    const pill = document.createElement('div');
    pill.className = 'jobfill-pill';
    pill.style.pointerEvents = 'auto';
    pill.tabIndex = -1;
    pill.innerHTML = `
      <span class="jobfill-logo">J</span>
      <span class="jobfill-name">JobFill</span>
      <span class="jobfill-status" data-status style="display:none"></span>
      <span class="jobfill-arrow" id="jobfill-open-btn" data-action="openPanel" style="display:none" title="${s.openPanel}">→</span>
      <button type="button" id="jobfill-scan-btn" class="jobfill-scan-btn" data-action="scan">${s.scan}</button>
    `;

    const css = `
      .jobfill-pill {
        display: flex;
        align-items: center;
        gap: 10px;
        pointer-events: auto;
        width: 200px;
        height: 48px;
        padding: 0 16px;
        background: #000;
        color: #fff;
        border-radius: 24px;
        border: 1px solid #333;
        font-family: system-ui, sans-serif;
        font-size: 13px;
      }
      .jobfill-logo {
        width: 28px;
        height: 28px;
        border-radius: 6px;
        background: #fff;
        color: #000;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 14px;
        flex-shrink: 0;
      }
      .jobfill-name {
        font-weight: 500;
        flex: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .jobfill-status {
        font-size: 12px;
        color: #22c55e;
        white-space: nowrap;
      }
      .jobfill-arrow {
        font-size: 14px;
        color: #fff;
        cursor: pointer;
        padding: 4px;
        flex-shrink: 0;
      }
      .jobfill-arrow:hover {
        color: #22c55e;
      }
      .jobfill-scan-btn {
        background: #fff;
        color: #000;
        border: none;
        padding: 6px 14px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        flex-shrink: 0;
      }
      .jobfill-scan-btn:hover {
        background: #e5e5e5;
      }
      .jobfill-scan-btn:disabled {
        opacity: 0.7;
        cursor: not-allowed;
      }
    `;

    const style = document.createElement('style');
    style.textContent = css;
    shadow.appendChild(style);
    shadow.appendChild(pill);
    floatingHost = hostContainer;

    chrome.storage.local.get('floatingPanelPosition', (r) => {
      const pos = r.floatingPanelPosition;
      if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
        hostContainer.style.right = '';
        hostContainer.style.bottom = '';
        hostContainer.style.left = pos.x + 'px';
        hostContainer.style.top = pos.y + 'px';
      }
    });

    pill.addEventListener('pointerdown', (e) => {
      if (e.target?.id === 'jobfill-scan-btn' || e.target?.closest?.('[data-action="scan"]') || e.target?.closest?.('[data-action="openPanel"]')) return;
      if (e.button !== 0) return;
      isDragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      const rect = hostContainer.getBoundingClientRect();
      panelStartX = rect.left;
      panelStartY = rect.top;
      e.preventDefault();
      pill.setPointerCapture(e.pointerId);
    });

    function handleDragMove(e) {
      if (!isDragging) return;
      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;
      const newX = Math.max(0, Math.min(window.innerWidth - 220, panelStartX + dx));
      const newY = Math.max(0, Math.min(window.innerHeight - 60, panelStartY + dy));
      hostContainer.style.left = newX + 'px';
      hostContainer.style.top = newY + 'px';
      hostContainer.style.right = 'auto';
      hostContainer.style.bottom = 'auto';
    }
    document.addEventListener('mousemove', handleDragMove);
    pill.addEventListener('pointermove', handleDragMove);

    document.addEventListener('mouseup', () => {
      if (!isDragging) return;
      isDragging = false;
      const rect = hostContainer.getBoundingClientRect();
      chrome.storage.local.set({ floatingPanelPosition: { x: rect.left, y: rect.top } });
    });

    document.addEventListener('mouseleave', () => {
      isDragging = false;
    });

    pill.addEventListener('pointerup', (e) => {
      if (isDragging) {
        isDragging = false;
        const rect = hostContainer.getBoundingClientRect();
        chrome.storage.local.set({ floatingPanelPosition: { x: rect.left, y: rect.top } });
      }
    });

    function handleScan() {
      console.log('[JobFill] Scan button clicked');
      setPanelState('SCANNING');
      chrome.runtime.sendMessage({ type: 'SCAN_FIELDS' }, (res) => {
        if (chrome.runtime.lastError) {
          console.log('[JobFill] Scan failed:', chrome.runtime.lastError);
          setPanelState('IDLE');
          return;
        }
        const count = res?.fields?.length ?? 0;
        const flds = res?.fields || [];
        chrome.storage.local.set({ scannedFields: flds, lastScannedFields: flds, scannedAt: Date.now() });
        setPanelState('DONE', count);
        try {
          chrome.runtime.sendMessage({ type: 'OPEN_SIDEPANEL' }, () => {
            if (chrome.runtime.lastError) console.log('[JobFill] Open sidepanel error:', chrome.runtime.lastError);
          });
        } catch (err) {
          console.log('[JobFill] Could not open sidepanel:', err);
        }
      });
    }

    setTimeout(() => {
      const scanBtn = shadow.querySelector('#jobfill-scan-btn');
      if (scanBtn) {
        scanBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          handleScan();
          scanBtn.blur();
        });
        console.log('[JobFill] Scan button listener attached');
      } else {
        console.error('[JobFill] Scan button not found in shadow DOM');
      }
      const arrowBtn = shadow.querySelector('#jobfill-open-btn');
      if (arrowBtn) {
        arrowBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          console.log('[JobFill] Arrow clicked, opening sidepanel');
          chrome.runtime.sendMessage({ type: 'OPEN_SIDEPANEL' }, (response) => {
            if (chrome.runtime.lastError) {
              console.error('[JobFill] Failed:', chrome.runtime.lastError.message);
            }
          });
          arrowBtn.blur();
        });
        console.log('[JobFill] Arrow button listener attached');
      }
    }, 100);

    return hostContainer;
  }

  function updateFillProgress(percent) {
    if (!floatingHost?.shadowRoot) return;
  }

  function togglePanel() {
    panelVisible = !panelVisible;
    if (floatingHost) floatingHost.style.display = panelVisible ? '' : 'none';
  }

  function injectPanel() {
    function init() {
      createFloatingPanel();
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && floatingHost && changes.language) {
      panelLang = changes.language.newValue === 'zh' ? 'zh' : 'en';
      const scanBtn = floatingHost.shadowRoot?.querySelector('[data-action="scan"]');
      if (scanBtn) scanBtn.textContent = panelStrings[panelLang].scan;
    }
  });

  injectPanel();

  function serializeField(f) {
    const { element, ...rest } = f;
    return rest;
  }

  function hasFormElements(nodes) {
    const tags = ['INPUT', 'TEXTAREA', 'SELECT'];
    for (const node of nodes) {
      if (node.nodeType === 1) {
        if (tags.includes(node.tagName)) return true;
        if (node.querySelector && node.querySelector(tags.join(','))) return true;
        if (node.getAttribute?.('contenteditable') === 'true') return true;
      }
    }
    return false;
  }

  const LINKEDIN_EASY_APPLY_SELECTORS = [
    '[data-test-modal]',
    '.jobs-easy-apply-modal',
    '.jobs-apply-modal',
    'div[data-test-id="jobs-apply-modal"]',
    'section.artdeco-modal[aria-label*="Apply"]',
    '.artdeco-modal[data-test-modal]'
  ];

  function hasLinkedInEasyApplyModal(nodes) {
    if (!/linkedin\.com/i.test(window.location.hostname)) return false;
    const check = (el) => {
      if (!el || el.nodeType !== 1) return false;
      for (const sel of LINKEDIN_EASY_APPLY_SELECTORS) {
        try {
          if (el.matches?.(sel)) return true;
          if (el.querySelector?.(sel)) return true;
          if (el.closest?.(sel)) return true;
        } catch (_) {}
      }
      return false;
    };
    for (const node of nodes) {
      if (node.nodeType === 1 && check(node)) return true;
      if (node.nodeType === 1 && node.childNodes) {
        for (const child of node.childNodes) {
          if (child.nodeType === 1 && check(child)) return true;
        }
      }
    }
    return false;
  }

  function findLinkedInEasyApplyModal() {
    if (!/linkedin\.com/i.test(window.location.hostname)) return null;
    for (const sel of LINKEDIN_EASY_APPLY_SELECTORS) {
      try {
        const el = document.querySelector(sel);
        if (el) return el;
      } catch (_) {}
    }
    return null;
  }

  function showToast(message) {
    if (!floatingHost?.shadowRoot) return;
    const count = typeof message === 'number' ? message : (message?.count ?? 0);
    if (count > 0) setPanelState('DONE', count);
  }

  function mergeFields(previous, current) {
    const selectorSet = new Set((previous || []).map((f) => f.selector));
    const merged = [...(previous || [])];
    let nextId = merged.length;
    for (const f of current) {
      if (!selectorSet.has(f.selector)) {
        selectorSet.add(f.selector);
        merged.push({ ...f, id: `field_${nextId++}` });
      }
    }
    return merged;
  }

  function performRescan(mergeWithPrevious = false) {
    const modalRoot = /linkedin\.com/i.test(window.location.hostname) ? findLinkedInEasyApplyModal() : null;
    const current = (modalRoot ? staticScan(modalRoot) : staticScan()).map(serializeField);
    if (current.length === 0) return;
    if (mergeWithPrevious) {
      chrome.storage.local.get('lastScannedFields', (r) => {
        const prev = r.lastScannedFields || [];
        const merged = mergeFields(prev, current);
        const newCount = merged.length - prev.length;
        chrome.storage.local.set({ lastScannedFields: merged, scannedFields: merged });
        if (newCount > 0) showToast(merged.length);
      });
    } else {
      chrome.storage.local.set({ lastScannedFields: current, scannedFields: current });
    }
  }

  let debounceTimer = null;
  let linkedInEasyApplyTimer = null;
  const DEBOUNCE_MS = 800;
  const LINKEDIN_DEBOUNCE_MS = 500;

  function runScanAndNotify(mergeWithPrevious, isLinkedInEasyApply = false) {
    const modalRoot = isLinkedInEasyApply ? findLinkedInEasyApplyModal() : null;
    const current = (modalRoot ? staticScan(modalRoot) : staticScan()).map(serializeField);
    if (current.length === 0) return;
    chrome.storage.local.get('lastScannedFields', (r) => {
      const prev = r.lastScannedFields || [];
      const merged = mergeWithPrevious ? mergeFields(prev, current) : current;
      const newCount = merged.length - (mergeWithPrevious ? prev.length : 0);
      chrome.storage.local.set({ lastScannedFields: merged });
      if (isLinkedInEasyApply || newCount > 0) {
        showToast(merged.length);
      }
    });
  }

  const observer = new MutationObserver((mutations) => {
    const addedNodes = [];
    for (const m of mutations) addedNodes.push(...Array.from(m.addedNodes || []));

    const hasLinkedInModal = hasLinkedInEasyApplyModal(addedNodes);
    if (hasLinkedInModal) {
      clearTimeout(linkedInEasyApplyTimer);
      linkedInEasyApplyTimer = setTimeout(() => {
        if (findLinkedInEasyApplyModal()) {
          runScanAndNotify(false, true);
        }
      }, LINKEDIN_DEBOUNCE_MS);
      return;
    }

    const addedFormElements = hasFormElements(addedNodes);
    if (!addedFormElements) return;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      chrome.storage.local.get('lastScannedFields', (r) => {
        const prev = r.lastScannedFields || [];
        const current = staticScan().map(serializeField);
        if (current.length === 0) return;
        const merged = mergeFields(prev, current);
        const newCount = merged.length - prev.length;
        if (newCount > 0) {
          chrome.storage.local.set({ lastScannedFields: merged, scannedFields: merged });
          showToast(merged.length);
        }
      });
    }, DEBOUNCE_MS);
  });

  observer.observe(document.body, { childList: true, subtree: true });

  const NEXT_BUTTON_TEXT = ['next', 'continue', 'proceed', '下一步', '继续', 'review'];
  document.addEventListener('click', (e) => {
    const text = (e.target?.textContent || e.target?.innerText || '').trim().toLowerCase();
    const btn = e.target?.closest?.('button') || e.target?.closest?.('[role="button"]');
    if (btn && NEXT_BUTTON_TEXT.some((t) => text === t || text.includes(t))) {
      const isOnLinkedIn = /linkedin\.com/i.test(window.location.hostname);
      setTimeout(() => performRescan(true), isOnLinkedIn ? 1200 : 1500);
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
      const onProgress = (current, total) => {
        chrome.storage.local.set({ fillProgress: { current, total } });
      };
      fillFields(msg.fillMap || {}, onProgress).then((result) => {
        chrome.storage.local.remove('fillProgress');
        sendResponse({ filled: result.filled, filledIds: result.filledIds || [] });
      });
      return true;
    }
    if (msg.type === 'SHOW_PAGE_TOAST') {
      showPageToast(msg.message || '');
      sendResponse({});
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
