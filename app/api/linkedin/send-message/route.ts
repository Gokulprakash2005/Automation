import { prisma } from '../../../../lib/prisma';

// Store extension connection
let extensionId = null;

export async function POST(req: Request) {
  const { profileUrl, message } = await req.json();
  
  console.log('Send message request:');
  console.log('Profile URL:', profileUrl);
  console.log('Message:', message);
  console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
  
  try {
    // Find or create Lead
    const lead = await prisma.lead.upsert({
      where: { profileUrl },
      update: {},
      create: {
        profileUrl,
        name: 'Unknown', // Will be updated later when we get the name
        status: 'NEW'
      }
    });
    
    // Find or create Conversation
    const conversation = await prisma.conversation.upsert({
      where: {
        leadId_channel: {
          leadId: lead.id,
          channel: 'LINKEDIN'
        }
      },
      update: {
        lastMessageAt: new Date()
      },
      create: {
        leadId: lead.id,
        channel: 'LINKEDIN',
        lastMessageAt: new Date()
      }
    });
    
    // Store outgoing message
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        sender: 'USER',
        content: message
      }
    });
    
    console.log('Message saved to database');
    
  } catch (error) {
    console.error('Database error:', error);
  }
  
  // Send command to extension via runtime messaging
  if (extensionId) {
    try {
      // This is a mock - in real implementation you'd use WebSocket
      console.log('Sending command to extension:', {
        type: 'SEND_MESSAGE',
        payload: { profileUrl, message }
      });
      
      // Simulate sending to extension background script
      // In production, you'd use chrome.runtime.sendMessage from a content script
      // or WebSocket/Server-Sent Events for real-time communication
      
    } catch (error) {
      console.error('Failed to send command to extension:', error);
    }
  }
  
  return Response.json({ 
    status: 'success',
    message: 'Message queued for sending'
  });
}