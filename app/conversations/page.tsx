'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Conversation {
  id: string;
  leadId: string;
  leadName: string;
  messageCount: number;
  messages: {
    id: string;
    sender: string;
    content: string;
  }[];
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/debug');
      const data = await response.json();
      
      // Group conversations by person (merge duplicates)
      const groupedConversations = new Map();
      
      data.analysis.conversations.forEach((conv: any) => {
        const cleanName = conv.leadName.split('\n')[0].trim() || conv.leadName.substring(0, 50);
        const key = cleanName.toLowerCase();
        
        if (groupedConversations.has(key)) {
          // Merge messages from duplicate conversations
          const existing = groupedConversations.get(key);
          existing.messages = [...existing.messages, ...conv.messages];
          existing.messageCount += conv.messageCount;
        } else {
          groupedConversations.set(key, {
            id: conv.id, // Use first conversation ID
            leadName: cleanName,
            messages: conv.messages,
            messageCount: conv.messageCount
          });
        }
      });
      
      // Convert back to array and sort messages by timestamp
      const mergedConversations = Array.from(groupedConversations.values()).map(conv => ({
        ...conv,
        messages: conv.messages.sort((a: any, b: any) => a.id.localeCompare(b.id)) // Simple sort by ID
      }));
      
      setConversations(mergedConversations);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
      setLoading(false);
    }
  };

  const cleanName = (name: string) => {
    if (!name || name === 'Unknown') return 'Unknown Contact';
    // Clean up the messy names with status info
    return name.split('\n')[0].trim() || name.substring(0, 50);
  };

  const getLastMessage = (messages: any[]) => {
    if (messages.length === 0) return 'No messages';
    const lastMsg = messages[messages.length - 1];
    return lastMsg.content.length > 50 ? lastMsg.content.substring(0, 50) + '...' : lastMsg.content;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-4 py-6 flex items-center gap-4">
          <Link 
            href="/onboarding/linkedin"
            className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
          >
            ← Back
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Conversations</h1>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        {conversations.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No conversations yet</p>
            <p className="text-gray-400 mt-2">Start messaging people on LinkedIn to see conversations here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {conversations.map((conv) => (
              <Link
                key={conv.id}
                href={`/conversations/${conv.id}`}
                className="block bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow p-6"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-900 mb-1">
                      User ↔ {cleanName(conv.leadName)}
                    </h3>
                    <p className="text-gray-600 text-sm mb-2">
                      {getLastMessage(conv.messages)}
                    </p>
                    <p className="text-gray-400 text-xs">
                      {conv.messageCount} message{conv.messageCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-blue-600 hover:text-blue-800">
                    View →
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}