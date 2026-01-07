const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLeads() {
  const leads = await prisma.lead.findMany({
    include: {
      conversations: {
        include: {
          messages: true
        }
      }
    }
  });
  
  console.log(`Found ${leads.length} leads:`);
  leads.forEach(lead => {
    console.log(`\n📋 Lead: ${lead.name}`);
    console.log(`🔗 URL: ${lead.profileUrl}`);
    console.log(`💬 Conversations: ${lead.conversations.length}`);
    lead.conversations.forEach(conv => {
      console.log(`  - ${conv.messages.length} messages`);
    });
  });
}

checkLeads()
  .catch(console.error)
  .finally(() => prisma.$disconnect());