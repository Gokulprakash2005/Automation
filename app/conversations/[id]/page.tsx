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
        </div>
      </main>
    </div>
  );
}