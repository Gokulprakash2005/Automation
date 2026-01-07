import { prisma } from '../../../../lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log('=== CONVERSATION API CALLED ===');
  console.log('Requested ID:', params.id);
  console.log('Request URL:', request.url);
  
  try {
    console.log('Connecting to database...');
    
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: params.id
      },
      include: {
        lead: true,
        messages: {
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    });

    console.log('Database query completed');
    console.log('Found conversation:', !!conversation);
    
    if (conversation) {
      console.log('Conversation details:', {
        id: conversation.id,
        leadName: conversation.lead.name,
        messageCount: conversation.messages.length
      });
    }
    
    if (!conversation) {
      console.log('❌ Conversation not found for ID:', params.id);
      return Response.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    console.log('✅ Returning conversation data');
    return Response.json({
      conversation
    });
  } catch (error) {
    console.error('❌ Database error:', error);
    return Response.json(
      { error: 'Failed to fetch conversation', details: error.message },
      { status: 500 }
    );
  }
}