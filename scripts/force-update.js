const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function forceUpdate() {
  // Update all leads that contain "Pankaj" to use vanity URL
  const result = await prisma.lead.updateMany({
    where: {
      name: {
        contains: 'Pankaj'
      }
    },
    data: {
      name: 'Pankaj Yadav',
      profileUrl: 'https://www.linkedin.com/in/pankaj-yadav-5998b3249/'
    }
  });
  
  console.log(`✅ Updated ${result.count} leads`);
  
  // Check result
  const leads = await prisma.lead.findMany();
  leads.forEach(lead => {
    console.log(`📋 ${lead.name} - ${lead.profileUrl}`);
  });
}

forceUpdate()
  .catch(console.error)
  .finally(() => prisma.$disconnect());