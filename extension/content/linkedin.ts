declare const chrome: any;
console.log('LinkedIn content script active');

chrome.runtime.onMessage.addListener(async (command: any) => {
  console.log('Content script received command:', command);
  
  switch (command.type) {
    case 'SEND_MESSAGE':
      await sendMessage(command.payload);
      break;
  }
});

async function sendMessage({ profileUrl, message }: { profileUrl: string; message: string }) {
  console.log('Sending message to:', profileUrl, 'Message:', message);
  // Implementation will be added later
}