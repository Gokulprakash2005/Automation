console.log('LinkedIn content script active');

// Processed messages to avoid duplicates
const processedMessages = new Set();

console.log('🚀 LinkedIn inbox poller started');
setInterval(pollInbox, 30000); // Every 30 seconds
setTimeout(pollInbox, 3000); // Initial check

// Test function to simulate receiving command from backend
window.testSendMessage = function(profileUrl, message) {
  sendMessage({ profileUrl, message });
};

chrome.runtime.onMessage.addListener(async (command) => {
  console.log('Content script received command:', command);
  
  switch (command.type) {
    case 'SEND_MESSAGE':
      await sendMessage(command.payload);
      break;
  }
});

// Inbox poller function
function pollInbox() {
  if (!window.location.href.includes('linkedin.com')) return;
  
  // Send polling status to VS Code terminal
  fetch('http://localhost:3000/api/extension/debug', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      message: `🔍 Polling LinkedIn inbox on ${window.location.href}` 
    })
  }).catch(() => {});
  
  console.log('🔍 Checking for unread messages...');
  
  // If on messaging thread page, extract sender info
  if (window.location.href.includes('/messaging/thread/')) {
    const senderNameEl = document.querySelector('.msg-thread__topbar-title h2') ||
                        document.querySelector('.msg-thread__topbar-title') ||
                        document.querySelector('[data-test-id="thread-detail-header-entity-name"]');
    
    const senderProfileLink = document.querySelector('.msg-thread__topbar-title a') ||
                             document.querySelector('[data-test-id="thread-detail-header-entity-name"] a');
    
    if (senderNameEl && senderProfileLink) {
      const senderName = senderNameEl.textContent.trim();
      const profileUrl = senderProfileLink.href;
      
      // Get latest message
      const messageElements = document.querySelectorAll('.msg-s-message-list__event');
      const latestMessage = messageElements[messageElements.length - 1];
      const messageText = latestMessage?.querySelector('.msg-s-event-listitem__body')?.textContent?.trim() || 'New message';
      
      fetch('http://localhost:3000/api/extension/debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: '📨 EXTRACTED FROM MESSAGING THREAD',
          payload: { senderName, profileUrl, messageText }
        })
      }).catch(() => {});
      
      const messageId = `thread-${Date.now()}`;
      if (!processedMessages.has(messageId)) {
        processedMessages.add(messageId);
        
        chrome.runtime.sendMessage({
          type: 'UNREAD_MESSAGE',
          payload: {
            name: senderName,
            message: messageText,
            profileUrl: profileUrl,
            receivedAt: new Date().toISOString()
          }
        });
      }
      return;
    }
  }
  
  // Look for ANY element with "1" text (notification badges)
  const allElements = document.querySelectorAll('*');
  const badgeElements = [];
  
  allElements.forEach(el => {
    const text = el.textContent?.trim();
    if (text === '1' && el.children.length === 0) {
      // Check if it's near messaging-related elements
      const parent = el.closest('[data-test-app-aware-link*="messaging"]') ||
                    el.closest('a[href*="messaging"]') ||
                    el.closest('.global-nav__primary-link');
      
      if (parent) {
        badgeElements.push({
          element: el,
          parent: parent,
          parentHref: parent.href || parent.getAttribute('data-test-app-aware-link'),
          parentText: parent.textContent?.trim()
        });
      }
    }
  });
  
  fetch('http://localhost:3000/api/extension/debug', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      message: `🔍 Found ${badgeElements.length} notification badges with "1"`,
      payload: { badges: badgeElements.map(b => ({ parentHref: b.parentHref, parentText: b.parentText })) }
    })
  }).catch(() => {});
  
  // If we found messaging badges, create unread message
  const messagingBadges = badgeElements.filter(b => 
    b.parentHref?.includes('messaging') || 
    b.parentText?.toLowerCase().includes('messaging')
  );
  
  if (messagingBadges.length > 0) {
    const messageId = `badge-${Date.now()}`;
    if (!processedMessages.has(messageId)) {
      processedMessages.add(messageId);
      
      fetch('http://localhost:3000/api/extension/debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: '🔔 MESSAGING BADGE DETECTED - Creating unread message',
          payload: { badgeCount: messagingBadges.length }
        })
      }).catch(() => {});
      
      chrome.runtime.sendMessage({
        type: 'UNREAD_MESSAGE',
        payload: {
          name: 'LinkedIn Contact',
          message: 'You have 1 new message',
          profileUrl: 'https://www.linkedin.com/messaging/',
          receivedAt: new Date().toISOString()
        }
      });
    }
  }
}

async function sendMessage({ profileUrl, message }) {
  console.log('Extension received SEND_MESSAGE command:');
  console.log('Profile URL:', profileUrl);
  console.log('Message:', message);
  
  try {
    // Navigate to profile
    if (window.location.href !== profileUrl) {
      console.log('Navigating to profile...');
      window.location.href = profileUrl;
      return;
    }
    
    // Wait for page to load and find Message button with updated selectors
    console.log('Looking for Message button...');
    await waitForElement('button[aria-label*="Message"], .pvs-profile-actions button, .pv-s-profile-actions button');
    
    // Click Message button with multiple selector attempts
    let messageButton = document.querySelector('button[aria-label*="Message"]');
    if (!messageButton) {
      messageButton = Array.from(document.querySelectorAll('button')).find(btn => 
        btn.textContent?.toLowerCase().includes('message') || 
        btn.getAttribute('aria-label')?.toLowerCase().includes('message')
      );
    }
    
    if (messageButton) {
      console.log('Clicking Message button...');
      messageButton.click();
      
      // Wait for message modal with updated selectors
      console.log('Waiting for message modal...');
      const messageInput = await waitForElement(
        '[contenteditable="true"][role="textbox"], ' +
        'textarea.msg-form__contenteditable, ' +
        'div[contenteditable="true"].msg-form__contenteditable',
        10000
      );
      console.log('Message modal opened');
      
      // Wait 2-4 seconds before typing (human-like)
      const delay = Math.random() * 2000 + 2000;
      console.log(`Waiting ${Math.round(delay)}ms before typing...`);
      await sleep(delay);
      
      // Type message using production-grade simulation
      console.log('Typing message...');
      await simulateHumanTyping(messageInput, message);
      
      // Wait 800ms before checking Send button
      console.log('Waiting 800ms before sending...');
      await sleep(800);
      
      // Find Send button with specific selector
      const sendButton = document.querySelector('button.msg-form__send-button');
      console.log('Send button disabled:', sendButton?.disabled);
      
      if (sendButton && !sendButton.disabled) {
        sendButton.click();
        console.log('Message sent successfully');
      } else {
        console.warn('Send button still disabled');
      }
      
    } else {
      console.log('Message button not found');
    }
    
  } catch (error) {
    console.error('Error sending message:', error.message || error);
  }
}

// Production-grade human typing simulation
async function simulateHumanTyping(element, text) {
  element.focus();

  const isCE = element.isContentEditable;
  console.log('Message input type:', isCE ? 'contenteditable' : 'textarea');

  if (isCE) {
    element.innerHTML = '';
  } else {
    element.value = '';
  }

  element.dispatchEvent(new Event('focus', { bubbles: true }));
  element.dispatchEvent(new Event('input', { bubbles: true }));

  for (const char of text) {
    element.dispatchEvent(
      new InputEvent('beforeinput', {
        data: char,
        inputType: 'insertText',
        bubbles: true,
        cancelable: true,
      })
    );

    if (isCE) {
      document.execCommand('insertText', false, char);
    } else {
      element.setRangeText(
        char,
        element.selectionStart ?? element.value.length,
        element.selectionEnd ?? element.value.length,
        'end'
      );
    }

    element.dispatchEvent(
      new InputEvent('input', {
        data: char,
        inputType: 'insertText',
        bubbles: true,
      })
    );

    await new Promise(r => setTimeout(r, 30 + Math.random() * 70));
  }

  element.dispatchEvent(new Event('change', { bubbles: true }));
}

// Sleep helper
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper function to wait for elements
function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }
    
    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector);
      if (element) {
        observer.disconnect();
        resolve(element);
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element ${selector} not found within ${timeout}ms`));
    }, timeout);
  });
}