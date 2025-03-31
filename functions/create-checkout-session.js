const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async function(event, context) {
  // Vérifier la méthode HTTP
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Méthode non autorisée' }),
    };
  }

  try {
    const { priceId, planName } = JSON.parse(event.body);
    
    // Mapper les noms de plans aux IDs de prix réels
    // Note: Ces IDs doivent être remplacés par vos vrais IDs de prix Stripe
    const priceMap = {
      'demarrage': process.env.STRIPE_PRICE_DEMARRAGE || 'price_demarrage',
      'croissance': process.env.STRIPE_PRICE_CROISSANCE || 'price_croissance',
      'professionnel': process.env.STRIPE_PRICE_PROFESSIONNEL || 'price_professionnel'
    };
    
    // Utiliser l'ID de prix fourni ou le rechercher dans la carte
    const actualPriceId = priceId || (planName ? priceMap[planName] : null);
    
    if (!actualPriceId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'ID de prix ou nom de plan manquant ou invalide' }),
      };
    }
    
    // Créer une session de paiement
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: actualPriceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.URL || 'https://polaris-video.netlify.app'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.URL || 'https://polaris-video.netlify.app'}/#pricing`,
      // Collecter l'adresse de facturation
      billing_address_collection: 'required',
      // Collecter les informations du client
      customer_email: event.queryStringParameters?.email,
    });
    
    return {
      statusCode: 200,
      body: JSON.stringify({ id: session.id }),
    };
  } catch (error) {
    console.error('Erreur lors de la création de la session de paiement:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
