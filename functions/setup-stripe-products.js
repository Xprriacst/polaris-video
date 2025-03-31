const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async function(event, context) {
  // Vérifier la méthode HTTP et l'authentification
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Méthode non autorisée' }),
    };
  }

  // Vérifier le token d'authentification (simple sécurité)
  const authToken = event.headers.authorization?.split(' ')[1];
  if (authToken !== process.env.SETUP_AUTH_TOKEN) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Non autorisé' }),
    };
  }

  try {
    // Créer le produit "Démarrage"
    const productDemarrage = await stripe.products.create({
      name: 'Pack Démarrage',
      description: 'Parfait pour commencer votre présence sur les plateformes de shorts',
      metadata: {
        features: JSON.stringify([
          '8 vidéos courtes par mois',
          'Sélection des moments clés',
          'Adaptation au format vertical',
          'Sous-titres simples',
          'Livraison en 48h'
        ])
      }
    });
    
    const priceDemarrage = await stripe.prices.create({
      product: productDemarrage.id,
      unit_amount: 16000, // 160€ en centimes
      currency: 'eur',
      recurring: {
        interval: 'month',
      },
    });
    
    // Créer le produit "Croissance"
    const productCroissance = await stripe.products.create({
      name: 'Pack Croissance',
      description: 'Idéal pour développer votre audience et augmenter l'engagement',
      metadata: {
        features: JSON.stringify([
          '15 vidéos courtes par mois',
          'Sélection des moments clés',
          'Adaptation au format vertical',
          'Sous-titres stylisés',
          'Effets visuels basiques',
          'Musique de fond',
          'Livraison en 24h'
        ])
      }
    });
    
    const priceCroissance = await stripe.prices.create({
      product: productCroissance.id,
      unit_amount: 28000, // 280€ en centimes
      currency: 'eur',
      recurring: {
        interval: 'month',
      },
    });
    
    // Créer le produit "Professionnel"
    const productProfessionnel = await stripe.products.create({
      name: 'Pack Professionnel',
      description: 'Solution complète pour une présence premium sur toutes les plateformes',
      metadata: {
        features: JSON.stringify([
          '25 vidéos courtes par mois',
          'Sélection des moments clés',
          'Adaptation au format vertical',
          'Sous-titres premium',
          'Effets visuels avancés',
          'Musique personnalisée',
          'Animations sur mesure',
          'Stratégie de contenu',
          'Livraison prioritaire'
        ])
      }
    });
    
    const priceProfessionnel = await stripe.prices.create({
      product: productProfessionnel.id,
      unit_amount: 48000, // 480€ en centimes
      currency: 'eur',
      recurring: {
        interval: 'month',
      },
    });
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        demarrage: {
          productId: productDemarrage.id,
          priceId: priceDemarrage.id
        },
        croissance: {
          productId: productCroissance.id,
          priceId: priceCroissance.id
        },
        professionnel: {
          productId: productProfessionnel.id,
          priceId: priceProfessionnel.id
        }
      }),
    };
  } catch (error) {
    console.error('Erreur lors de la création des produits et des prix:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
