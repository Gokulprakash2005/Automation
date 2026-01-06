import { prisma } from '../../../../lib/prisma';

// Normalize LinkedIn profile URLs to handle different formats
function normalizeLinkedInUrl(url: string): string {
  if (!url) return url;
  
  // Extract the profile identifier from different LinkedIn URL formats
  const match = url.match(/\/in\/([^\/?]+)/);
  if (match) {
    const profileId = match[1];
    // Always use the standard format
    return `https://www.linkedin.com/in/${profileId}/`;
  }
  
  return url;
}

// Store extension connection
let extensionId: string | null = null;

export async function POST(req: Request) {
  const { profileUrl, message } = await req.json();
  
  // Normalize profile URL to handle different LinkedIn URL formats
  const normalizedProfileUrl = normalizeLinkedInUrl(profileUrl);
  
  console.log('Send message request:');
  console.log('Original Profile URL:', profileUrl);
  console.log('Normalized Profile URL:', normalizedProfileUrl);
  console.log('Message:', message);
  console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
  
  try {
    // Find or create Lead (reuse existing if profileUrl exists)
    const lead = await prisma.lead.upsert({
      where: { profileUrl: normalizedProfileUrl },
      update: {}, // Don't update existing lead
      create: {
        profileUrl: normalizedProfileUrl,
        name: 'Unknown',
        status: 'NEW'
      }
    });
    
    // Find existing conversation using leadId + channel
    let conversation = await prisma.conversation.findUnique({
      where: {
        leadId_channel: {
          leadId: lead.id,
          channel: 'LINKEDIN'
        }
      }
    });
    
    if (conversation) {
      // Update existing conversation's lastMessageAt
      conversation = await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: new Date()
        }
      });
    } else {
      // Create new conversation only if it doesn't exist
      conversation = await prisma.conversation.create({
        data: {
          leadId: lead.id,
          channel: 'LINKEDIN',
          lastMessageAt: new Date()
        }
      });
    }
    
    // Always create a new Message (Message.id is always new)
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        sender: 'OUTGOING',
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