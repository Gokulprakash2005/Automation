'use client';

import { useState } from 'react';

export default function ConnectLinkedIn() {
  const [profileUrl, setProfileUrl] = useState('');
  const [message, setMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  const handleSendMessage = async () => {
    try {
      // Always call API first to save to database
      const response = await fetch('/api/linkedin/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ profileUrl, message })
      });
      
      if (response.ok) {
        console.log('Message saved to database');
        
        // Then try to communicate with extension
        if (typeof chrome !== 'undefined' && chrome.runtime) {
          chrome.runtime.sendMessage('ieigalmhmnhikodnabhhmlbniheheeae', {
            type: 'SEND_MESSAGE',
            payload: { profileUrl, message }
          });
        }
        
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900">AI Sales OS</h1>
        </div>
      </header>
      
      <main className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            Connect Your LinkedIn Account
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            We use a Chrome Extension to safely automate your LinkedIn account. 
            Your credentials stay secure in your browser.
          </p>
          
          <div className="space-y-4">
            <button className="w-full bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
              Install Chrome Extension
            </button>
            <button className="w-full bg-gray-100 text-gray-900 px-8 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors">
              I've installed it
            </button>
          </div>
        </div>

        <div className="border-t pt-12">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Test Message Sending</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                LinkedIn Profile URL
              </label>
              <input 
                type="url" 
                value={profileUrl}
                onChange={(e) => setProfileUrl(e.target.value)}
                placeholder="https://www.linkedin.com/in/username"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message
              </label>
              <textarea 
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Hi, I'd like to connect..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button 
              onClick={handleSendMessage}
              className="w-full bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
            >
              Send Test Message
            </button>
          </div>
        </div>
      </main>

      {showToast && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg">
          Message sent successfully!
        </div>
      )}
    </div>
  );
}