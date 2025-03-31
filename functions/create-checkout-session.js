const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async function(event, context) {
  // Log pour debug
  console.log('Environnement:', {
    hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
    keyPrefix: process.env.STRIPE_SECRET_KEY ? process.env.STRIPE_SECRET_KEY.substring(0, 7) : 'missing',
    url: process.env.URL || 'not set',
  });

  // Vérifier la méthode HTTP
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Méthode non autorisée' }),
    };
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Configuration Stripe manquante - STRIPE_SECRET_KEY non définie',
        details: 'Ajoutez la variable d\'environnement STRIPE_SECRET_KEY dans les paramètres Netlify' 
      }),
    };
  }

  try {
    // Analyser les paramètres de la requête
    let requestData;
    try {
      requestData = JSON.parse(event.body);
      console.log('Données reçues:', requestData);
    } catch (parseError) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Erreur de parsing JSON', 
          details: parseError.message 
        }),
      };
    }

    const { priceId, planName } = requestData;
    
    // Information des plans
    const planInfo = {
      'demarrage': { name: 'Pack Démarrage', price: 16000, interval: 'month' },
      'croissance': { name: 'Pack Croissance', price: 28000, interval: 'month' },
      'professionnel': { name: 'Pack Professionnel', price: 48000, interval: 'month' },
    };
    
    // Rechercher les prix existants ou créer un nouveau prix
    let actualPriceId = priceId;
    
    if (!priceId && planName) {
      // Vérifier si c'est un plan connu
      if (!planInfo[planName]) {
        return {
          statusCode: 400,
          body: JSON.stringify({ 
            error: 'Plan non reconnu', 
            details: `Le plan "${planName}" n'existe pas. Plans disponibles: ${Object.keys(planInfo).join(', ')}` 
          }),
        };
      }
      
      try {
        // Chercher si le prix existe déjà
        const existingPrices = await stripe.prices.list({
          lookup_keys: [planName],
          expand: ['data.product']
        });
        
        if (existingPrices.data.length > 0) {
          // Utiliser le prix existant
          actualPriceId = existingPrices.data[0].id;
          console.log(`Prix existant trouvé pour ${planName}: ${actualPriceId}`);
        } else {
          // Créer un nouveau produit
          const product = await stripe.products.create({
            name: planInfo[planName].name,
            description: `Forfait ${planInfo[planName].name} pour création de vidéos courtes`
          });
          
          // Créer un nouveau prix
          const price = await stripe.prices.create({
            product: product.id,
            unit_amount: planInfo[planName].price,
            currency: 'eur',
            recurring: {
              interval: planInfo[planName].interval
            },
            lookup_key: planName
          });
          
          actualPriceId = price.id;
          console.log(`Nouveau prix créé pour ${planName}: ${actualPriceId}`);
        }
      } catch (lookupError) {
        console.error('Erreur lors de la recherche/création du prix:', lookupError);
        return {
          statusCode: 500,
          body: JSON.stringify({ 
            error: 'Erreur lors de la création du prix', 
            details: lookupError.message 
          }),
        };
      }
    }
    
    if (!actualPriceId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'ID de prix manquant', 
          details: 'Ni l\'ID de prix ni le nom du plan n\'ont été fournis' 
        }),
      };
    }
    
    console.log(`Création de session avec priceId: ${actualPriceId}`);
    
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
      billing_address_collection: 'required',
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
      body: JSON.stringify({ 
        error: 'Erreur lors de la création de la session de paiement', 
        message: error.message,
        type: error.type,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }),
    };
  }
};
