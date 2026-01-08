import { prisma } from '../../../../lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  console.log('=== CONVERSATION API CALLED ===');
  console.log('Requested ID:', id);
  console.log('Request URL:', request.url);
  
  try {
    console.log('Connecting to database...');
    
    const conversation = await prisma.conversation.findUnique({
      where: {
        id: id
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
        leadProfileUrl: conversation.lead.profileUrl,
        messageCount: conversation.messages.length
      });
    }
    
    if (!conversation) {
      console.log('❌ Conversation not found for ID:', id);
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
      { error: 'Failed to fetch conversation', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}