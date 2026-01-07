// Send heartbeat when extension loads
fetch('http://localhost:3000/api/extension/heartbeat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ extensionId: chrome.runtime.id })
}).catch(err => console.log('Heartbeat failed:', err));

// Listen for external messages from webpage
chrome.runtime.onMessageExternal.addListener((command, sender, sendResponse) => {
  console.log('Background received external command:', command);
  
  // Send debug to terminal
  fetch('http://localhost:3000/api/extension/debug', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      message: '🌐 BACKGROUND: Received external message',
      payload: command
    })
  }).catch(() => {});
  
  if (command.type === 'SEND_MESSAGE') {
    handleSendMessage(command.payload);
    sendResponse({ status: 'received' });
  }
  
  return true;
});

// Listen for internal messages
chrome.runtime.onMessage.addListener((command, sender, sendResponse) => {
  console.log('Background received internal command:', command);
  
  if (command.type === 'SEND_MESSAGE') {
    handleSendMessage(command.payload);
  } else if (command.type === 'UNREAD_MESSAGE') {
    console.log('📨 New unread message detected:', command.payload);
    
    // Send to VS Code terminal
    fetch('http://localhost:3000/api/extension/debug', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: '📨 SERVICE WORKER: Forwarding unread message to backend',
        payload: command.payload
      })
    }).catch(() => {});
    
    fetch('http://localhost:3000/api/linkedin/inbox', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(command.payload)
    })
    .then(r => r.json())
    .then(data => {
      console.log('✅ Backend response:', data);
      // Send success to VS Code terminal
      fetch('http://localhost:3000/api/extension/debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: '✅ SERVICE WORKER: Message saved to database successfully'
        })
      }).catch(() => {});
    })
    .catch(err => {
      console.error('❌ Failed to save:', err);
      // Send error to VS Code terminal
      fetch('http://localhost:3000/api/extension/debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: `❌ SERVICE WORKER: Failed to save message - ${err.message}`
        })
      }).catch(() => {});
    });
  }
  
  return true;
});

async function handleSendMessage(payload) {
  // Send debug to terminal
  fetch('http://localhost:3000/api/extension/debug', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      message: '🚀 BACKGROUND: Handling send message',
      payload: payload
    })
  }).catch(() => {});
  
  try {
    // Find existing LinkedIn tab
    const tabs = await chrome.tabs.query({ url: 'https://www.linkedin.com/*' });
    
    if (tabs.length > 0) {
      // Use existing LinkedIn tab
      const tab = tabs[0];
      chrome.tabs.update(tab.id, { active: true });
      
      fetch('http://localhost:3000/api/extension/debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: '💬 BACKGROUND: Sending message to content script',
          payload: { tabId: tab.id }
        })
      }).catch(() => {});
      
      chrome.tabs.sendMessage(tab.id, { type: 'SEND_MESSAGE', payload });
    } else {
      // Create new LinkedIn tab
      const tab = await chrome.tabs.create({ 
        url: payload.profileUrl,
        active: true 
      });
      
      // Wait for tab to load, then send message
      chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
        if (tabId === tab.id && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          setTimeout(() => {
            chrome.tabs.sendMessage(tab.id, { type: 'SEND_MESSAGE', payload });
          }, 2000);
        }
      });
    }
  } catch (error) {
    console.error('Error handling send message:', error);
    
    fetch('http://localhost:3000/api/extension/debug', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: '❌ BACKGROUND: Error handling send message',
        payload: { error: error.message }
      })
    }).catch(() => {});
  }
}
