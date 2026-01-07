const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanLeads() {
  const leads = await prisma.lead.findMany();
  
  for (const lead of leads) {
    console.log(`\n🔄 Processing lead: ${lead.name}`);
    console.log(`Current URL: ${lead.profileUrl}`);
    
    // Clean the name - extract just the actual name
    let cleanName = lead.name;
    
    // Remove LinkedIn status text and extra whitespace
    cleanName = cleanName.replace(/\s+Status is reachable\s+/g, ' ');
    cleanName = cleanName.replace(/\s+Mobile\s+•\s+\d+[mh]\s+ago\s*/g, '');
    cleanName = cleanName.replace(/\s+/g, ' ').trim();
    
    // If URL is internal ID, try to update to vanity URL
    let newUrl = lead.profileUrl;
    if (lead.profileUrl.includes('ACoAA') && cleanName.toLowerCase().includes('pankaj')) {
      newUrl = 'https://www.linkedin.com/in/pankaj-yadav-5998b3249/';
    }
    
    console.log(`Clean name: "${cleanName}"`);
    console.log(`New URL: ${newUrl}`);
    
    // Update the lead
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        name: cleanName,
        profileUrl: newUrl
      }
    });
    
    console.log('✅ Updated');
  }
  
  console.log('\n✅ All leads cleaned!');
}

cleanLeads()
  .catch(console.error)
  .finally(() => prisma.$disconnect());