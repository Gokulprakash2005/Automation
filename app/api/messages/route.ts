import { prisma } from '../../../lib/prisma';

export async function GET() {
  try {
    // Get all messages with lead info
    const messages = await prisma.message.findMany({
      include: {
        conversation: {
          include: {
            lead: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Group messages by lead (person) using name as primary key
    const conversationsByPerson = new Map();
    
    messages.forEach(message => {
      const lead = message.conversation.lead;
      // Use name as primary key, fallback to profile URL if no name
      const leadKey = lead.name || lead.profileUrl;
      
      if (!conversationsByPerson.has(leadKey)) {
        conversationsByPerson.set(leadKey, {
          id: lead.id,
          lead: lead,
          messages: [],
          lastMessageAt: message.createdAt
        });
      } else {
        // If we find the same person with a different profile URL, merge them
        const existingConversation = conversationsByPerson.get(leadKey);
        // Update lead info if current one has more complete data
        if (!existingConversation.lead.name && lead.name) {
          existingConversation.lead = lead;
        }
      }
      
      const conversation = conversationsByPerson.get(leadKey);
      conversation.messages.push(message);
      
      // Update last message time
      if (new Date(message.createdAt) > new Date(conversation.lastMessageAt)) {
        conversation.lastMessageAt = message.createdAt;
      }
    });

    // Convert to array and sort by last message time
    const conversations = Array.from(conversationsByPerson.values())
      .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

    return Response.json({
      conversations
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return Response.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}