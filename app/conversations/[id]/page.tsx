'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Message {
  id: string;
  content: string;
  sender: string;
  recipientName?: string;
  createdAt: string;
}

interface Conversation {
  id: string;
  lastMessageAt: string;
  lead: {
    name: string;
    profileUrl: string;
  };
  messages: Message[];
}

export default function ConversationDetailPage() {
  const params = useParams();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiDraft, setAiDraft] = useState('');
  const [showDraft, setShowDraft] = useState(false);
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [editingDraft, setEditingDraft] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchConversation(params.id as string);
    }
  }, [params.id]);

  const fetchConversation = async (id: string) => {
    try {
      console.log('Fetching conversation with ID:', id);
      const response = await fetch('/api/debug');
      const data = await response.json();
      
      // Group conversations by person and find the one with matching ID
      const groupedConversations = new Map();
      
      data.analysis.conversations.forEach((conv: any) => {
        const cleanName = conv.leadName.split('\n')[0].trim() || conv.leadName.substring(0, 50);
        const key = cleanName.toLowerCase();
        
        if (groupedConversations.has(key)) {
          // Merge messages from duplicate conversations
          const existing = groupedConversations.get(key);
          existing.messages = [...existing.messages, ...conv.messages];
          existing.ids.push(conv.id);
        } else {
          groupedConversations.set(key, {
            id: conv.id,
            ids: [conv.id], // Track all conversation IDs for this person
            leadName: cleanName,
            messages: conv.messages
          });
        }
      });
      
      // Find conversation that contains the requested ID
      let foundConversation = null;
      for (const conv of groupedConversations.values()) {
        if (conv.ids.includes(id)) {
          foundConversation = conv;
          break;
        }
      }
      
      if (!foundConversation) {
        console.error('Conversation not found in debug data');
        setLoading(false);
        return;
      }
      
      // Transform to match expected format
      const transformedConversation = {
        id: foundConversation.id,
        lead: {
          name: foundConversation.leadName,
          profileUrl: '#'
        },
        messages: foundConversation.messages
          .sort((a: any, b: any) => a.id.localeCompare(b.id)) // Sort by ID
          .map((msg: any) => ({
            id: msg.id,
            content: msg.content.replace('...', ''),
            sender: msg.sender,
            createdAt: new Date().toISOString()
          }))
      };
      
      console.log('Found merged conversation:', transformedConversation);
      setConversation(transformedConversation);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch conversation:', error);
      setLoading(false);
    }
  };

  const sendDraft = async () => {
    if (!conversation || !aiDraft) return;
    
    try {
      // Get the actual profile URL for this specific conversation
      const convResponse = await fetch(`/api/conversations/${conversation.id}`);
      const convData = await convResponse.json();
      
      const actualProfileUrl = convData.conversation?.lead?.profileUrl || 'https://www.linkedin.com/in/pankaj-yadav-5998b3249/';
      
      console.log('Using profile URL for', convData.conversation?.lead?.name, ':', actualProfileUrl);
      
      // Add message to existing conversation
      const response = await fetch(`/api/conversations/${conversation.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conversation.id,
          message: aiDraft
        })
      });
      
      if (response.ok) {
        // Send to Chrome extension with actual profile URL
        if (typeof window !== 'undefined' && window.chrome?.runtime) {
          try {
            window.chrome.runtime.sendMessage('ieigalmhmnhikodnabhhmlbniheheeae', {
              type: 'SEND_MESSAGE',
              payload: {
                profileUrl: actualProfileUrl,
                message: aiDraft
              }
            });
          } catch (extensionError) {
            console.log('Extension not available, opening LinkedIn manually');
            // Fallback: Open LinkedIn profile directly
            window.open(actualProfileUrl, '_blank');
          }
        } else {
          // No extension available, open LinkedIn manually
          window.open(actualProfileUrl, '_blank');
        }
        
        // Add message to conversation immediately
        const newMessage = {
          id: Date.now().toString(),
          content: aiDraft,
          sender: 'OUTGOING',
          createdAt: new Date().toISOString()
        };
        
        setConversation(prev => prev ? {
          ...prev,
          messages: [...prev.messages, newMessage]
        } : null);
        
        // Hide draft
        setShowDraft(false);
        setAiDraft('');
      }
    } catch (error) {
      console.error('Failed to send draft:', error);
    }
  };

  const generateAIDraft = async () => {
    if (!conversation) return;
    
    setGeneratingDraft(true);
    try {
      const lastMessage = conversation.messages[conversation.messages.length - 1];
      const response = await fetch('/api/ai-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conversation.id,
          lastMessage: lastMessage.content,
          leadName: cleanName(conversation.lead.name)
        })
      });
      
      const data = await response.json();
      setAiDraft(data.draft);
      setShowDraft(true);
    } catch (error) {
      console.error('Failed to generate AI draft:', error);
    } finally {
      setGeneratingDraft(false);
    }
  };

  const cleanName = (name: string) => {
    if (!name || name === 'Unknown') return 'Unknown Contact';
    // Clean up the messy names with status info
    return name.split('\n')[0].trim() || name.substring(0, 50);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 text-lg">Conversation not found</p>
          <Link href="/conversations" className="text-blue-600 hover:text-blue-800 mt-4 inline-block">
            ← Back to Conversations
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-4 py-6 flex items-center gap-4">
          <Link 
            href="/conversations"
            className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
          >
            ← Back
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              User ↔ {cleanName(conversation.lead.name)}
            </h1>
          </div>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
            {conversation.messages.map((msg) => (
              <div key={msg.id}>
                <div 
                  className={`flex ${
                    msg.sender === 'OUTGOING' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div 
                    className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                      msg.sender === 'OUTGOING'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                    <p className={`text-xs mt-2 ${
                      msg.sender === 'OUTGOING' ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {msg.sender === 'OUTGOING' 
                        ? 'user' 
                        : cleanName(conversation.lead.name)
                      } • {new Date(msg.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* AI Draft Section */}
          <div className="border-t p-4">
            <div className="flex gap-2 mb-4">
              <button
                onClick={generateAIDraft}
                disabled={generatingDraft}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
              >
                {generatingDraft ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  '🤖'
                )}
                Generate AI Draft
              </button>
            </div>
            
            {showDraft && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-purple-900">AI Draft Response</h3>
                  <button
                    onClick={() => setShowDraft(false)}
                    className="text-purple-600 hover:text-purple-800"
                  >
                    ✕
                  </button>
                </div>
                <div className="bg-white border rounded p-3 mb-3">
                  {editingDraft ? (
                    <textarea
                      value={aiDraft}
                      onChange={(e) => setAiDraft(e.target.value)}
                      className="w-full p-2 border rounded resize-none"
                      rows={3}
                    />
                  ) : (
                    <p className="text-gray-900">{aiDraft}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={sendDraft}
                    className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                  >
                    Send Draft
                  </button>
                  <button 
                    onClick={() => setEditingDraft(!editingDraft)}
                    className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                  >
                    {editingDraft ? 'Save' : 'Edit Draft'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}