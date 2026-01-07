console.log('LinkedIn content script active');

// Send startup message to terminal
fetch('http://localhost:3000/api/extension/debug', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    message: '🚀 CONTENT SCRIPT: Started on ' + window.location.href
  })
}).catch(() => {});

// Processed messages to avoid duplicates
const processedMessages = new Set();

console.log('🚀 LinkedIn inbox poller started');
setInterval(pollInbox, 30000); // Every 30 seconds
setTimeout(pollInbox, 3000); // Initial check

// Test function to manually trigger message sending
window.testSendMessage = function(profileUrl, message) {
  console.log('Manual test triggered:', profileUrl, message);
  sendMessage({ profileUrl, message });
};

// Also listen for direct function calls
window.sendLinkedInMessage = async function(profileUrl, message) {
  console.log('Direct function call:', profileUrl, message);
  await sendMessage({ profileUrl, message });
};

chrome.runtime.onMessage.addListener(async (command) => {
  console.log('Content script received command:', command);
  
  // Send debug to terminal
  fetch('http://localhost:3000/api/extension/debug', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      message: '📨 CONTENT SCRIPT: Received command',
      payload: command
    })
  }).catch(() => {});
  
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
    fetch('http://localhost:3000/api/extension/debug', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: '📨 ON MESSAGING THREAD - Extracting real message data...'
      })
    }).catch(() => {});
    
    const senderNameEl = document.querySelector('.msg-thread__topbar-title h2') ||
                        document.querySelector('.msg-thread__topbar-title') ||
                        document.querySelector('[data-test-id="thread-detail-header-entity-name"]') ||
                        document.querySelector('.msg-thread__topbar .msg-thread__topbar-title');
    
    const senderProfileLink = document.querySelector('.msg-thread__topbar-title a') ||
                             document.querySelector('[data-test-id="thread-detail-header-entity-name"] a') ||
                             document.querySelector('.msg-thread__topbar a[href*="/in/"]');
    
    if (senderNameEl && senderProfileLink) {
      const senderName = senderNameEl.textContent.trim();
      const profileUrl = senderProfileLink.href;
      
      // Get latest message from the thread
      const messageElements = document.querySelectorAll('.msg-s-message-list__event');
      const latestMessage = messageElements[messageElements.length - 1];
      const messageText = latestMessage?.querySelector('.msg-s-event-listitem__body')?.textContent?.trim() || 
                         latestMessage?.querySelector('.msg-s-event-listitem__message')?.textContent?.trim() ||
                         'New message';
      
      fetch('http://localhost:3000/api/extension/debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: '✅ REAL MESSAGE EXTRACTED FROM THREAD',
          payload: { senderName, profileUrl, messageText }
        })
      }).catch(() => {});
      
      const messageId = `thread-${senderName}-${Date.now()}`;
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
    } else {
      // Debug: Find all possible elements that might contain sender info
      const allH1 = document.querySelectorAll('h1');
      const allH2 = document.querySelectorAll('h2');
      const allH3 = document.querySelectorAll('h3');
      const allSpans = document.querySelectorAll('span');
      const allLinks = document.querySelectorAll('a[href*="/in/"]');
      
      const possibleSenderElements = [];
      
      // Check headers
      [...allH1, ...allH2, ...allH3].forEach(el => {
        if (el.textContent && el.textContent.trim().length > 0 && el.textContent.trim().length < 50) {
          possibleSenderElements.push({
            type: 'header',
            tag: el.tagName,
            text: el.textContent.trim(),
            className: el.className
          });
        }
      });
      
      // Check profile links
      allLinks.forEach(link => {
        if (link.href.includes('/in/')) {
          // Convert LinkedIn internal IDs to vanity URLs if possible
          let profileUrl = link.href;
          const profileId = profileUrl.match(/\/in\/([^\/?]+)/)?.[1];
          
          // If it's an internal LinkedIn ID, try to get the vanity URL from the link text or data attributes
          if (profileId?.startsWith('ACoAA')) {
            // Try to find vanity URL in the page
            const vanityUrlElement = document.querySelector('a[href*="/in/"][href*="-"]');
            if (vanityUrlElement && vanityUrlElement.href.includes('-')) {
              profileUrl = vanityUrlElement.href;
            }
          }
          
          possibleSenderElements.push({
            type: 'profile-link',
            href: profileUrl,
            text: link.textContent?.trim(),
            className: link.className
          });
        }
      });
      
      fetch('http://localhost:3000/api/extension/debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: '🔍 DEBUG: Available elements on thread page',
          payload: { possibleSenderElements: possibleSenderElements.slice(0, 10) }
        })
      }).catch(() => {});
      
      // Try to extract from any available elements - prioritize actual sender name
      if (possibleSenderElements.length > 0) {
        // Look for profile link first to get the real sender
        const linkElement = possibleSenderElements.find(el => el.type === 'profile-link' && el.text && el.text !== 'Messaging');
        
        // Find name element that's not "Messaging" and has reasonable length
        const nameElement = possibleSenderElements.find(el => 
          el.type === 'header' && 
          el.text && 
          el.text !== 'Messaging' && 
          el.text.length > 2 && 
          el.text.length < 30 &&
          !el.text.includes('message') &&
          !el.text.toLowerCase().includes('linkedin')
        );
        
        if (linkElement) {
          // Use profile link text as sender name if available
          let senderName = linkElement.text || 'LinkedIn User';
          let profileUrl = linkElement.href;
          
          // If we have an internal LinkedIn ID, try to find the vanity URL
          const profileId = profileUrl.match(/\/in\/([^\/?]+)/)?.[1];
          if (profileId?.startsWith('ACoAA')) {
            // Look for vanity URL in the current page
            const vanityLink = document.querySelector('a[href*="/in/"][href*="-"]:not([href*="ACoAA"])');
            if (vanityLink) {
              profileUrl = vanityLink.href;
              console.log('🔄 Converted internal ID to vanity URL:', profileUrl);
            }
          }
          
          // Try to get actual message content
          const messageElements = document.querySelectorAll('.msg-s-event-listitem__body, .msg-s-event-listitem__message, [data-test-id="message-text"]');
          const latestMessage = messageElements[messageElements.length - 1];
          const messageText = latestMessage?.textContent?.trim() || 'New message';
          
          fetch('http://localhost:3000/api/extension/debug', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              message: '✅ REAL SENDER EXTRACTED FROM PROFILE LINK',
              payload: { senderName, profileUrl, messageText }
            })
          }).catch(() => {});
          
          const messageId = `real-${senderName}-${Date.now()}`;
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
        } else if (nameElement) {
          // Fallback to header element if no profile link text
          const senderName = nameElement.text;
          const profileUrl = possibleSenderElements.find(el => el.type === 'profile-link')?.href || '';
          const messageText = 'New message from thread';
          
          fetch('http://localhost:3000/api/extension/debug', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              message: '✅ SENDER EXTRACTED FROM HEADER',
              payload: { senderName, profileUrl, messageText }
            })
          }).catch(() => {});
          
          const messageId = `header-${senderName}-${Date.now()}`;
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
        }
      }
    }
  }
  
  // Look for ANY element with "1" text (notification badges)
  const allElements = document.querySelectorAll('*');
  const badgeElements = [];
  
  allElements.forEach(el => {
    const text = el.textContent?.trim();
    if (text && /^[1-9]\d*$/.test(text) && el.children.length === 0) {
      // Check if it's specifically near messaging elements
      const parent = el.closest('[data-test-app-aware-link="/messaging/"]') ||
                    el.closest('a[href="/messaging/"]') ||
                    el.closest('a[href*="messaging"]');
      
      if (parent && parent.textContent?.toLowerCase().includes('messaging')) {
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
      message: `🔍 Found ${badgeElements.length} notification badges with numbers`,
      payload: { badges: badgeElements.map(b => ({ parentHref: b.parentHref, parentText: b.parentText, badgeText: b.element.textContent })) }
    })
  }).catch(() => {});
  
  // If we found messaging badges, create unread message
  const messagingBadges = badgeElements.filter(b => 
    b.parentHref?.includes('messaging') || 
    b.parentText?.toLowerCase().includes('messaging')
  );
  
  if (messagingBadges.length > 0) {
    // Try to get messaging data without redirect
    // Method 1: Check if messaging overlay is already open
    const messagingOverlay = document.querySelector('.msg-overlay-list-bubble__conversations-list');
    if (messagingOverlay) {
      const unreadItems = messagingOverlay.querySelectorAll('.msg-conversation-listitem--unread');
      
      unreadItems.forEach(item => {
        const nameEl = item.querySelector('.msg-conversation-listitem__participant-names');
        const messageEl = item.querySelector('.msg-conversation-listitem__summary');
        const profileLink = item.querySelector('a[href*="/in/"]');
        
        if (nameEl && messageEl) {
          const senderName = nameEl.textContent.trim();
          const message = messageEl.textContent.trim();
          const profileUrl = profileLink?.href || '';
          
          const messageId = `overlay-${senderName}-${message.substring(0,20)}`;
          if (!processedMessages.has(messageId)) {
            processedMessages.add(messageId);
            
            chrome.runtime.sendMessage({
              type: 'UNREAD_MESSAGE',
              payload: {
                name: senderName,
                message: message,
                profileUrl: profileUrl,
                receivedAt: new Date().toISOString()
              }
            });
          }
        }
      });
      return;
    }
    
    // Method 2: Fetch from LinkedIn API
    fetch('http://localhost:3000/api/extension/debug', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: '🔍 Trying LinkedIn API to get unread messages...'
      })
    }).catch(() => {});
    
    fetch('/voyager/api/messaging/conversations?keyVersion=LEGACY_INBOX', {
      credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
      fetch('http://localhost:3000/api/extension/debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: '✅ LinkedIn API response received',
          payload: { conversationCount: data.elements?.length || 0 }
        })
      }).catch(() => {});
      
      const conversations = data.elements || [];
      
      conversations.forEach(conv => {
        if (!conv.unreadCount || conv.unreadCount === 0) return;
        
        const participant = conv.participants?.find(p => p.entityUrn !== conv.viewerParticipant?.entityUrn);
        if (!participant) return;
        
        const senderName = participant.firstName + ' ' + (participant.lastName || '');
        const profileUrl = `https://www.linkedin.com/in/${participant.publicIdentifier}`;
        const lastMessage = conv.events?.[0]?.eventContent?.attributedBody?.text || 'New message';
        
        fetch('http://localhost:3000/api/extension/debug', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            message: '📨 REAL MESSAGE EXTRACTED FROM API',
            payload: { senderName, lastMessage, profileUrl }
          })
        }).catch(() => {});
        
        const messageId = `api-${senderName}-${lastMessage.substring(0,20)}`;
        if (!processedMessages.has(messageId)) {
          processedMessages.add(messageId);
          
          chrome.runtime.sendMessage({
            type: 'UNREAD_MESSAGE',
            payload: {
              name: senderName,
              message: lastMessage,
              profileUrl: profileUrl,
              receivedAt: new Date().toISOString()
            }
          });
        }
      });
    })
    .catch((error) => {
      fetch('http://localhost:3000/api/extension/debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: '❌ LinkedIn API failed, trying fallback navigation',
          payload: { error: error.message }
        })
      }).catch(() => {});
      
      // Fallback: Navigate to messaging page
      if (!window.location.href.includes('/messaging/')) {
        window.location.href = 'https://www.linkedin.com/messaging/';
      }
    });
  }
}



async function sendMessage({ profileUrl, message }) {
  // Send debug to terminal
  fetch('http://localhost:3000/api/extension/debug', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      message: '🚀 SEND MESSAGE FUNCTION CALLED',
      payload: { profileUrl, message, currentUrl: window.location.href }
    })
  }).catch(() => {});
  
  try {
    // Navigate to profile
    if (window.location.href !== profileUrl) {
      fetch('http://localhost:3000/api/extension/debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: '📍 Navigating to profile...' })
      }).catch(() => {});
      
      window.location.href = profileUrl;
      return;
    }
    
    fetch('http://localhost:3000/api/extension/debug', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '✅ Already on profile page' })
    }).catch(() => {});
    
    // Wait for page to load and find Message button
    fetch('http://localhost:3000/api/extension/debug', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '🔍 Looking for Message button...' })
    }).catch(() => {});
    
    await waitForElement('button[aria-label*="Message"]');
    
    // Click Message button
    const messageButton = document.querySelector('button[aria-label*="Message"]');
    if (messageButton) {
      fetch('http://localhost:3000/api/extension/debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: '📨 Found Message button, clicking...' })
      }).catch(() => {});
      
      messageButton.click();
      
      // Wait for message modal and find input
      fetch('http://localhost:3000/api/extension/debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: '⏳ Waiting for message modal...' })
      }).catch(() => {});
      
      await sleep(2000);
      
      const messageInput = document.querySelector('.msg-form__contenteditable') ||
                          document.querySelector('[contenteditable="true"][role="textbox"]') ||
                          document.querySelector('div[contenteditable="true"]');
      
      if (!messageInput) {
        fetch('http://localhost:3000/api/extension/debug', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: '❌ Message input not found' })
        }).catch(() => {});
        return;
      }
      
      fetch('http://localhost:3000/api/extension/debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: '✅ Found message input',
          payload: { tag: messageInput.tagName, className: messageInput.className }
        })
      }).catch(() => {});
      
      // Type message using production-grade simulation
      await simulateHumanTyping(messageInput, message);
      
      // Wait 1 second before checking Send button
      await new Promise(r => setTimeout(r, 1000));
      
      const sendButton = document.querySelector('button.msg-form__send-button');
      
      fetch('http://localhost:3000/api/extension/debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: '🚀 Send button check',
          payload: { found: !!sendButton, disabled: sendButton?.disabled }
        })
      }).catch(() => {});
      
      if (sendButton && !sendButton.disabled) {
        sendButton.click();
        fetch('http://localhost:3000/api/extension/debug', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: '✅ Message sent successfully' })
        }).catch(() => {});
      } else {
        fetch('http://localhost:3000/api/extension/debug', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: '⚠️ Send button still disabled' })
        }).catch(() => {});
      }
      
    } else {
      fetch('http://localhost:3000/api/extension/debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: '❌ Message button not found' })
      }).catch(() => {});
    }
    
  } catch (error) {
    fetch('http://localhost:3000/api/extension/debug', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: '❌ Error in sendMessage',
        payload: { error: error.message }
      })
    }).catch(() => {});
  }
}

async function simulateHumanTyping(element, text) {
  fetch('http://localhost:3000/api/extension/debug', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      message: '🎯 TYPING START - Using native approach',
      payload: { text, elementTag: element.tagName, elementClass: element.className }
    })
  }).catch(() => {});
  
  // Focus and clear
  element.focus();
  element.click();
  
  // Select all and delete
  document.execCommand('selectAll');
  document.execCommand('delete');
  
  // Type each character with proper events
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    
    // Create and dispatch keyboard events
    const keydownEvent = new KeyboardEvent('keydown', {
      key: char,
      code: `Key${char.toUpperCase()}`,
      bubbles: true,
      cancelable: true
    });
    
    const keypressEvent = new KeyboardEvent('keypress', {
      key: char,
      code: `Key${char.toUpperCase()}`,
      bubbles: true,
      cancelable: true
    });
    
    const inputEvent = new InputEvent('input', {
      data: char,
      inputType: 'insertText',
      bubbles: true,
      cancelable: true
    });
    
    const keyupEvent = new KeyboardEvent('keyup', {
      key: char,
      code: `Key${char.toUpperCase()}`,
      bubbles: true,
      cancelable: true
    });
    
    // Dispatch events in correct order
    element.dispatchEvent(keydownEvent);
    element.dispatchEvent(keypressEvent);
    
    // Insert the character
    document.execCommand('insertText', false, char);
    
    element.dispatchEvent(inputEvent);
    element.dispatchEvent(keyupEvent);
    
    await new Promise(r => setTimeout(r, 30));
  }
  
  // Final events
  element.dispatchEvent(new Event('change', { bubbles: true }));
  element.dispatchEvent(new Event('blur', { bubbles: true }));
  element.focus();
  
  fetch('http://localhost:3000/api/extension/debug', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      message: '🏁 TYPING COMPLETE',
      payload: { finalText: element.textContent, innerHTML: element.innerHTML }
    })
  }).catch(() => {});
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