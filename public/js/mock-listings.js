/* Annonces de démonstration affichées sur categories.html.
   Ce ne sont pas de vraies annonces publiées par un utilisateur (celles-ci
   viennent de "campusdeal-listings" dans localStorage) — juste des exemples
   pour montrer à quoi ressemble le site une fois rempli. listing.html les
   utilise aussi pour pouvoir afficher une page de détail cohérente. */
var MOCK_LISTINGS = {
  "mock-livre-1": {
    title: "Manuel d'Algèbre Linéaire — L2",
    description: "Manuel utilisé un seul semestre, toutes les pages en bon état, quelques annotations au crayon facilement effaçables.",
    category: "livres", condition: "tres-bon", price: 4500, negotiable: false,
    emoji: "📖", sellerName: "Aïcha M.", certified: true
  },
  "mock-livre-2": {
    title: "Cours de Microéconomie — L1",
    description: "Polycopié complet du cours de microéconomie, avec exercices corrigés en annexe.",
    category: "livres", condition: "bon", price: 3000, negotiable: true,
    emoji: "📗", sellerName: "Junior K.", certified: false
  },
  "mock-electro-1": {
    title: "Calculatrice graphique Casio",
    description: "Calculatrice graphique fonctionnelle, quelques rayures sur la coque mais l'écran est impeccable. Livrée avec housse.",
    category: "electronique", condition: "bon", price: 18000, negotiable: true,
    emoji: "💻", sellerName: "Steph N.", certified: false
  },
  "mock-vet-1": {
    title: "Veste d'hiver, taille M",
    description: "Portée une saison seulement, très chaude, aucune tache ni accroc.",
    category: "vetements", condition: "tres-bon", price: 7000, negotiable: false,
    emoji: "🧥", sellerName: "Farida B.", certified: false
  },
  "mock-mob-1": {
    title: "Chaise de bureau pliable",
    description: "Pratique pour une petite chambre, se replie complètement à plat pour le rangement.",
    category: "mobilier", condition: "bon", price: 6000, negotiable: false,
    emoji: "🪑", sellerName: "Yannick T.", certified: true
  },
  "mock-fourn-1": {
    title: "Sac à dos, bon état",
    description: "Plusieurs compartiments, compartiment rembourré pour ordinateur portable.",
    category: "fournitures", condition: "bon", price: 2500, negotiable: true,
    emoji: "🎒", sellerName: "Rosine A.", certified: false
  },
  "mock-divers-1": {
    title: "Vélo pliable, bon état",
    description: "Idéal pour se déplacer rapidement sur le campus. Pneus regonflés récemment, freins vérifiés.",
    category: "divers", condition: "bon", price: 35000, negotiable: true,
    emoji: "🚲", sellerName: "Patrick E.", certified: true
  }
};
