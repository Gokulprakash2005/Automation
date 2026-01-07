import { prisma } from '../../../../lib/prisma';

// Extract name from LinkedIn profile URL
function extractNameFromUrl(profileUrl: string): string {
  const match = profileUrl.match(/\/in\/([^\/?]+)/);
  if (match) {
    const profileId = match[1];
    // Convert LinkedIn profile ID to readable name
    if (profileId.includes('-')) {
      return profileId.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
    }
  }
  return 'Unknown';
}

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
    // Find or create Lead - check by name first, then by URL
    const extractedName = extractNameFromUrl(normalizedProfileUrl);
    
    // First try to find existing lead by name (to merge different URLs for same person)
    let lead = await prisma.lead.findFirst({
      where: { name: extractedName }
    });
    
    if (lead) {
      console.log('🔄 Found existing lead by name:', extractedName);
      // Update with better URL if current one is vanity URL and existing is internal ID
      const currentIsVanity = !normalizedProfileUrl.includes('ACoAA');
      const existingIsInternal = lead.profileUrl.includes('ACoAA');
      
      if (currentIsVanity && existingIsInternal) {
        lead = await prisma.lead.update({
          where: { id: lead.id },
          data: { profileUrl: normalizedProfileUrl }
        });
        console.log('🔄 Updated lead URL to vanity URL:', normalizedProfileUrl);
      }
    } else {
      // If not found by name, try by URL, then create if needed
      lead = await prisma.lead.upsert({
        where: { profileUrl: normalizedProfileUrl },
        update: {}, // Don't update existing lead
        create: {
          profileUrl: normalizedProfileUrl,
          name: extractedName,
          status: 'NEW'
        }
      });
    }
    
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