import { prisma } from '../../../../lib/prisma';

// Normalize LinkedIn profile URLs to handle different formats
function normalizeLinkedInUrl(url: string): string {
  if (!url) return url;
  
  // Extract the profile identifier from different LinkedIn URL formats
  const match = url.match(/\/in\/([^\/?]+)/);
  if (match) {
    const profileId = match[1];
    
    // If it's a LinkedIn internal ID (starts with ACoAA), try to find existing lead with vanity URL
    if (profileId.startsWith('ACoAA')) {
      // For now, keep the internal ID format but we'll need to match by name later
      return `https://www.linkedin.com/in/${profileId}/`;
    }
    
    // Always use the standard format for vanity URLs
    return `https://www.linkedin.com/in/${profileId}/`;
  }
  
  return url;
}

export async function POST(req: Request) {
  try {
    const { name, message, profileUrl, receivedAt } = await req.json();
    
    // Normalize profile URL to handle different LinkedIn URL formats
    const normalizedProfileUrl = normalizeLinkedInUrl(profileUrl);
    
    console.log('\n🔔 UNREAD MESSAGE DETECTED:');
    console.log('👤 Sender:', name);
    console.log('💬 Message:', message);
    console.log('🔗 Original Profile:', profileUrl);
    console.log('🔗 Normalized Profile:', normalizedProfileUrl);
    console.log('⏰ Time:', new Date().toLocaleString());
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Find or create Lead (reuse existing if profileUrl exists)
    // First try to find by normalized URL, then by name if it's an internal LinkedIn ID
    let lead;
    const profileId = normalizedProfileUrl.match(/\/in\/([^\/?]+)/)?.[1];
    
    if (profileId?.startsWith('ACoAA') && name) {
      // For LinkedIn internal IDs, try to find existing lead by name first
      lead = await prisma.lead.findFirst({
        where: { name: name }
      });
      
      if (lead) {
        console.log('🔄 Found existing lead by name:', name);
        // Update the lead with the internal profile URL if needed
        lead = await prisma.lead.update({
          where: { id: lead.id },
          data: { name: name }
        });
      }
    }
    
    if (!lead) {
      // Standard upsert by profile URL
      lead = await prisma.lead.upsert({
        where: { profileUrl: normalizedProfileUrl },
        update: {
          name: name // Update name if we got it
        },
        create: {
          profileUrl: normalizedProfileUrl,
          name: name || 'Unknown',
          status: 'REPLIED'
        }
      });
    }
    
    // Check if this exact message already exists to prevent duplicates
    const existingMessage = await prisma.message.findFirst({
      where: {
        conversation: {
          leadId: lead.id,
          channel: 'LINKEDIN'
        },
        content: message,
        sender: 'INCOMING'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    if (existingMessage) {
      console.log('⚠️  DUPLICATE MESSAGE - Skipping save');
      return Response.json({ 
        status: 'duplicate',
        message: 'Message already exists'
      }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type'
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
          lastMessageAt: new Date(receivedAt)
        }
      });
    } else {
      // Create new conversation only if it doesn't exist
      conversation = await prisma.conversation.create({
        data: {
          leadId: lead.id,
          channel: 'LINKEDIN',
          lastMessageAt: new Date(receivedAt)
        }
      });
    }
    
    // Always create a new Message (Message.id is always new)
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        sender: 'INCOMING',
        content: message,
        createdAt: new Date(receivedAt)
      }
    });
    
    console.log('✅ MESSAGE SAVED TO DATABASE\n');
    
    return Response.json({ 
      status: 'success',
      message: 'Incoming message saved'
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
    
  } catch (error) {
    console.error('Error saving incoming message:', error);
    return Response.json({ 
      status: 'error',
      message: 'Failed to save incoming message'
    }, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }
}

export async function OPTIONS(req: Request) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}