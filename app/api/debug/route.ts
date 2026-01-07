import { prisma } from '../../../lib/prisma';

export async function GET() {
  try {
    // Get all leads with their conversations and messages
    const leads = await prisma.lead.findMany({
      include: {
        conversations: {
          include: {
            messages: true
          }
        }
      }
    });

    // Get all conversations with their leads and messages
    const conversations = await prisma.conversation.findMany({
      include: {
        lead: true,
        messages: true
      }
    });

    return Response.json({
      analysis: {
        totalLeads: leads.length,
        totalConversations: conversations.length,
        leads: leads.map(lead => ({
          id: lead.id,
          name: lead.name,
          profileUrl: lead.profileUrl,
          conversationCount: lead.conversations.length,
          conversations: lead.conversations.map(conv => ({
            id: conv.id,
            messageCount: conv.messages.length
          }))
        })),
        conversations: conversations.map(conv => ({
          id: conv.id,
          leadId: conv.leadId,
          leadName: conv.lead.name,
          messageCount: conv.messages.length,
          messages: conv.messages.map(msg => ({
            id: msg.id,
            sender: msg.sender,
            content: msg.content.substring(0, 50) + '...'
          }))
        }))
      }
    });
  } catch (error) {
    console.error('Debug analysis error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}