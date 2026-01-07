const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function mergeLeads() {
  console.log('🔄 Starting lead merge process...');
  
  // Get all leads
  const leads = await prisma.lead.findMany({
    include: {
      conversations: {
        include: {
          messages: true
        }
      }
    }
  });
  
  // Group leads by name
  const leadsByName = new Map();
  
  leads.forEach(lead => {
    const name = lead.name;
    if (!leadsByName.has(name)) {
      leadsByName.set(name, []);
    }
    leadsByName.get(name).push(lead);
  });
  
  // Process each group
  for (const [name, leadGroup] of leadsByName) {
    if (leadGroup.length > 1) {
      console.log(`\n👥 Found ${leadGroup.length} leads for "${name}"`);
      
      // Find the best lead (prefer vanity URL)
      const bestLead = leadGroup.find(lead => !lead.profileUrl.includes('ACoAA')) || leadGroup[0];
      const duplicateLeads = leadGroup.filter(lead => lead.id !== bestLead.id);
      
      console.log(`✅ Keeping lead: ${bestLead.profileUrl}`);
      
      // Move all conversations and messages to the best lead
      for (const duplicateLead of duplicateLeads) {
        console.log(`🗑️  Merging from: ${duplicateLead.profileUrl}`);
        
        // Update conversations to point to best lead
        await prisma.conversation.updateMany({
          where: { leadId: duplicateLead.id },
          data: { leadId: bestLead.id }
        });
        
        // Delete the duplicate lead
        await prisma.lead.delete({
          where: { id: duplicateLead.id }
        });
      }
    }
  }
  
  console.log('\n✅ Lead merge completed!');
}

mergeLeads()
  .catch(console.error)
  .finally(() => prisma.$disconnect());