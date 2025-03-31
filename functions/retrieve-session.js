const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async function(event, context) {
  // Vérifier la méthode HTTP
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Méthode non autorisée' }),
    };
  }

  const sessionId = event.queryStringParameters?.session_id;
  
  if (!sessionId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'ID de session manquant' }),
    };
  }

  try {
    // Récupérer les détails de la session
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'line_items.data.price.product'],
    });
    
    // Extraire les informations pertinentes
    const lineItems = session.line_items?.data || [];
    const product = lineItems[0]?.price?.product;
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        id: session.id,
        customer_email: session.customer_details?.email,
        amount_total: session.amount_total,
        currency: session.currency,
        payment_status: session.payment_status,
        created: session.created,
        product_name: product?.name || null,
        product_description: product?.description || null,
      }),
    };
  } catch (error) {
    console.error('Erreur lors de la récupération des détails de la session:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
