export async function POST(req: Request) {
  const { message, payload } = await req.json();
  
  console.log('🔍 EXTENSION DEBUG:', message);
  if (payload) {
    console.log('📦 Payload:', JSON.stringify(payload, null, 2));
  }
  
  return Response.json({ status: 'logged' }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
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