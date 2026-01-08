export async function POST(req: Request) {
  try {
    const { conversationId, lastMessage, leadName } = await req.json();
    
    // Simple AI response generation based on context
    const generateResponse = (message: string, name: string) => {
      const msg = message.toLowerCase();
      
      if (msg.includes('hi') || msg.includes('hello') || msg.includes('hey')) {
        return `Hi ${name}! Thanks for reaching out. How can I help you today?`;
      }
      
      if (msg.includes('thanks') || msg.includes('thank you')) {
        return `You're welcome, ${name}! Is there anything else I can assist you with?`;
      }
      
      if (msg.includes('interested') || msg.includes('tell me more')) {
        return `Great to hear you're interested, ${name}! I'd be happy to share more details. When would be a good time for a quick call?`;
      }
      
      if (msg.includes('meeting') || msg.includes('call') || msg.includes('schedule')) {
        return `Perfect! I'd love to schedule a call with you, ${name}. What's your availability this week?`;
      }
      
      if (msg.includes('price') || msg.includes('cost') || msg.includes('pricing')) {
        return `Thanks for your interest in pricing, ${name}! I'd be happy to discuss our solutions and pricing options. Can we schedule a brief call to understand your specific needs?`;
      }
      
      // Default professional response
      return `Thanks for your message, ${name}! I appreciate you reaching out. Let me know how I can best assist you.`;
    };
    
    const aiDraft = generateResponse(lastMessage, leadName);
    
    return Response.json({
      draft: aiDraft,
      status: 'success'
    });
    
  } catch (error) {
    console.error('Error generating AI draft:', error);
    return Response.json(
      { error: 'Failed to generate AI draft' },
      { status: 500 }
    );
  }
}