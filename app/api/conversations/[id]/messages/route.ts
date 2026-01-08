import { prisma } from '../../../../../lib/prisma';

export async function POST(req: Request) {
  try {
    const { conversationId, message } = await req.json();
    
    // Add message directly to existing conversation
    const newMessage = await prisma.message.create({
      data: {
        conversationId: conversationId,
        sender: 'OUTGOING',
        content: message
      }
    });
    
    // Update conversation's lastMessageAt
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() }
    });
    
    return Response.json({
      message: newMessage,
      status: 'success'
    });
    
  } catch (error) {
    console.error('Error adding message to conversation:', error);
    return Response.json(
      { error: 'Failed to add message' },
      { status: 500 }
    );
  }
}