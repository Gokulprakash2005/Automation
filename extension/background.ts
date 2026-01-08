declare const chrome: any;

chrome.runtime.onMessage.addListener((command: any, sender: any, sendResponse: any) => {
  console.log('Background received command:', command);
  
  if (command.type === 'SEND_MESSAGE') {
    // Forward to content script
    chrome.tabs.sendMessage(sender.tab!.id!, command);
  }
  
  return true;
});