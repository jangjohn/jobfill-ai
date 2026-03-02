/**
 * JobFill AI - Background Service Worker
 * Handles: Side Panel, API calls, message routing
 */

// Open Side Panel on extension icon click
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// Ensure side panel opens even when default behavior is overridden
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

// Handle keyboard shortcut for floating panel toggle
chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-panel') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'TOGGLE_FLOATING_PANEL' }).catch(() => {});
      }
    });
  }
});

/**
 * Call DeepSeek API - API key never exposed to content scripts
 */
async function callDeepSeekAPI(messages, options = {}) {
  const { apiKey } = await chrome.storage.local.get('apiKey');
  if (!apiKey) {
    throw new Error('API key not configured. Please add your DeepSeek API key in Settings.');
  }

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: options.model || 'deepseek-chat',
      messages,
      max_tokens: options.max_tokens || 4096,
      temperature: options.temperature ?? 0.3,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    let errMsg = `API error (${response.status})`;
    try {
      const errJson = JSON.parse(errText);
      errMsg = errJson.error?.message || errMsg;
    } catch (_) {}
    throw new Error(errMsg);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Empty response from API');
  }
  return content;
}

/**
 * Message handler - routes between content script and API
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handlers = {
    async CALL_DEEPSEEK(payload) {
      const { messages, options } = payload;
      const content = await callDeepSeekAPI(messages, options || {});
      return { success: true, content };
    },

    async SCAN_FIELDS() {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return { success: false, error: 'No active tab' };
      try {
        const result = await chrome.tabs.sendMessage(tab.id, { type: 'SCAN_FIELDS' });
        return { success: true, fields: result?.fields || [] };
      } catch (e) {
        return { success: false, error: e?.message || 'Content script not ready' };
      }
    },

    async FILL_FIELDS(payload) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return { success: false, error: 'No active tab' };
      try {
        const result = await chrome.tabs.sendMessage(tab.id, {
          type: 'FILL_FIELDS',
          fillMap: payload.fillMap || payload || {},
        });
        return { success: true, filled: result?.filled ?? 0 };
      } catch (e) {
        return { success: false, error: e?.message || 'Content script not ready' };
      }
    },

    async REQUEST_FILL_ALL() {
      const { fillMap = {} } = await chrome.storage.local.get('fillMap');
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return { success: false, error: 'No active tab' };
      try {
        const result = await chrome.tabs.sendMessage(tab.id, {
          type: 'FILL_FIELDS',
          fillMap,
        });
        if (result?.filled > 0) {
          await chrome.tabs.sendMessage(tab.id, { type: 'UPDATE_FILL_PROGRESS', percent: 100 });
        }
        return { success: true, filled: result?.filled ?? 0 };
      } catch (e) {
        return { success: false, error: e?.message || 'Content script not ready' };
      }
    },

    async OPEN_SIDEPANEL() {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.windowId) {
        await chrome.sidePanel.open({ windowId: tab.windowId });
      }
      return { success: true };
    },
  };

  const handler = handlers[message.type];
  if (!handler) {
    sendResponse({ success: false, error: 'Unknown message type' });
    return false;
  }

  const payload = message.payload !== undefined ? message.payload : message;
  handler(payload)
    .then(sendResponse)
    .catch((err) => sendResponse({ success: false, error: err?.message || 'Unknown error' }));
  return true; // async response
});
