import mongoose from 'mongoose';
import { assertServerEnv } from './config/env.js';
import { connectDatabase } from './config/db.js';
import Product from './models/Product.js';
import User from './models/User.js';

/**
 * Initialise la base avec le catalogue de démonstration et un compte démo.
 * Usage : npm run seed (dans backend/)
 * Le script est idempotent : le catalogue est remplacé, le compte démo
 * n'est créé que s'il n'existe pas déjà.
 */
const PRODUCTS = [
  {
    name: "NovaBook Pro 14",
    description:
      "Ultraportable professionnel 14 pouces, processeur 12 cœurs, 32 Go de mémoire et écran Liquid Retina. Autonomie de 18 heures dans un châssis en aluminium de 1,2 kg.",
    price: 1299,
    category: "Ordinateurs",
    stock: 12,
    imageUrl: "/images/products/novabook-pro-14.svg"
  },
  {
    name: "NovaBook Air 13",
    description:
      "Portable fin et léger 13 pouces, 16 Go de mémoire et SSD 512 Go, pensé pour les étudiants et les déplacements. Démarre en quelques secondes et tient toute la journée.",
    price: 899,
    category: "Ordinateurs",
    stock: 18,
    imageUrl: "/images/products/novabook-air-13.svg"
  },
  {
    name: "Titan X — PC Gamer",
    description:
      "Tour gaming haute performance : processeur 8 cœurs, 32 Go DDR5, refroidissement liquide et boîtier vitré. Conçu pour faire tourner les derniers triple-A en 1440p ultra.",
    price: 1899,
    category: "Ordinateurs",
    stock: 6,
    imageUrl: "/images/products/titan-x-pc-gamer.svg"
  },
  {
    name: 'ClearView 27" 4K',
    description:
      "Écran 27 pouces 4K UHD avec dalle IPS, 99 % sRGB et pied ergonomique réglable en hauteur et pivot. Idéal pour la création de contenu et le travail de bureau.",
    price: 449,
    category: "Écrans",
    stock: 15,
    imageUrl: "/images/products/clearview-27-4k.svg"
  },
  {
    name: 'ClearView UltraWide 34"',
    description:
      "Moniteur incurvé ultra-large 34 pouces au format 21:9, 144 Hz et compatible HDR600. Parfait pour le multitâche immersif et les simulations.",
    price: 749,
    category: "Écrans",
    stock: 8,
    imageUrl: "/images/products/clearview-ultrawide-34.svg"
  },
  {
    name: "NovaKey TKL — Clavier mécanique",
    description:
      "Clavier mécanique sans fil, interrupteurs tactiles pré-lubrifiés et châssis aluminium. Rétroéclairage réglable et connexion triple (USB-C, Bluetooth, 2,4 GHz).",
    price: 129,
    category: "Périphériques",
    stock: 30,
    imageUrl: "/images/products/novakey-tkl.svg"
  },
  {
    name: "NovaGlide Pro — Souris",
    description:
      "Souris sans fil 8000 DPI, capteur optique de compétition et 90 heures d'autonomie. Cinq profils personnalisables depuis l'application compagnon.",
    price: 79,
    category: "Périphériques",
    stock: 40,
    imageUrl: "/images/products/novaglide-pro.svg"
  },
  {
    name: "NovaSound 7.1 — Casque",
    description:
      "Casque circum-aural avec audio virtuel 7.1, micro à réduction de bruit et coussinets à mémoire de forme. Confort durable pour les longues sessions.",
    price: 159,
    category: "Périphériques",
    stock: 22,
    imageUrl: "/images/products/novasound-71.svg"
  },
  {
    name: "GraphiCore RTX 5080",
    description:
      "Carte graphique dernière génération 16 Go GDDR7, ray tracing matériel et upscaling par IA. Refroidissement triple ventilateur pour des températures maîtrisées.",
    price: 1199,
    category: "Composants",
    stock: 5,
    imageUrl: "/images/products/graphicore-rtx.svg"
  },
  {
    name: "NovaDrive SSD NVMe 1 To",
    description:
      "SSD NVMe PCIe 4.0 de 1 To, jusqu'à 7 000 Mo/s en lecture. Dissipateur intégré et endurance de 600 téraoctets écrits pour des années de fiabilité.",
    price: 119,
    category: "Composants",
    stock: 50,
    imageUrl: "/images/products/novadrive-ssd-1to.svg"
  },
  {
    name: "NovaLink WiFi 6 — Routeur",
    description:
      "Routeur WiFi 6 double bande, 4 antennes haute performance et ports gigabits. Couverture Mesh jusqu'à 200 m² avec contrôle parental avancé.",
    price: 189,
    category: "Réseau",
    stock: 25,
    imageUrl: "/images/products/novalink-wifi6.svg"
  },
  {
    name: "NovaPrint Laser",
    description:
      "Imprimante laser monochrome compacte : 30 pages par minute, recto-verso automatique et WiFi. Cartouche haute capacité de 3 000 pages incluse.",
    price: 299,
    category: "Impression",
    stock: 10,
    imageUrl: "/images/products/novaprint-laser.svg"
  },
  {
    name: "NovaBook Studio 16",
    description:
      "Station de travail mobile 16 pouces pour la création : 14 cœurs, 32 Go de mémoire unifiée et écran mini-LED calibré d'usine. Silencieuse même en export 8K.",
    price: 2199,
    category: "Ordinateurs",
    stock: 7,
    imageUrl: "/images/products/novabook-studio-16.svg"
  },
  {
    name: "Titan Mini — Mini PC",
    description:
      "Mini PC de 0,6 litre avec processeur 8 cœurs et 16 Go de mémoire. Se fixe derrière un écran et suffit largement au bureautique exigeant et au montage léger.",
    price: 949,
    category: "Ordinateurs",
    stock: 14,
    imageUrl: "/images/products/titan-mini.svg"
  },
  {
    name: 'ClearView 24" FHD',
    description:
      "Écran 24 pouces Full HD à dalle IPS, 100 Hz et bords fins sur trois côtés. Pied compact et fixation VESA pour les petits bureaux.",
    price: 199,
    category: "Écrans",
    stock: 25,
    imageUrl: "/images/products/clearview-24-fhd.svg"
  },
  {
    name: "NovaPad XL — Tapis de bureau",
    description:
      "Tapis de bureau en tissu technique 90 × 40 cm, base antidérapante et bords cousus. Surface optimisée pour les capteurs optiques et les déplacements fluides.",
    price: 49,
    category: "Périphériques",
    stock: 60,
    imageUrl: "/images/products/novapad-xl.svg"
  },
  {
    name: "NovaCam 4K — Webcam",
    description:
      "Webcam 4K avec autofocus, correction automatique de la lumière et double micro stéréo. Cache de confidentialité intégré et fixation magnétique.",
    price: 119,
    category: "Périphériques",
    stock: 35,
    imageUrl: "/images/products/novacam-4k.svg"
  },
  {
    name: "NovaDock USB-C — Station d'accueil",
    description:
      "Station d'accueil 11-en-1 : double sortie HDMI 4K, Ethernet 2,5 Gb/s, lecteur SD et charge 100 W. Un seul câble pour tout connecter.",
    price: 179,
    category: "Périphériques",
    stock: 20,
    imageUrl: "/images/products/novadock-usbc.svg"
  },
  {
    name: "NovaRAM 32 Go DDR5",
    description:
      "Kit mémoire DDR5 32 Go (2 × 16 Go) à 6 000 MHz avec profils EXPO et dissipateur bas profil. Stable et compatible avec les cartes mères récentes.",
    price: 149,
    category: "Composants",
    stock: 40,
    imageUrl: "/images/products/novaram-32go.svg"
  },
  {
    name: "NovaCore i9 — Processeur",
    description:
      "Processeur 24 cœurs à 5,8 GHz de pointe, 36 Mo de cache et PCIe 5.0. Pensé pour le rendu, la compilation et le jeu à haut framerate.",
    price: 629,
    category: "Composants",
    stock: 4,
    imageUrl: "/images/products/novacore-i9.svg"
  },
  {
    name: "NovaPower 850W — Alimentation",
    description:
      "Bloc d'alimentation 850 W 80+ Gold entièrement modulaire, ventilateur semi-passif et protections complètes. Silencieux au repos.",
    price: 139,
    category: "Composants",
    stock: 18,
    imageUrl: "/images/products/novapower-850w.svg"
  },
  {
    name: "NovaSwitch 8 ports — Gigabit",
    description:
      "Switch réseau 8 ports Gigabit au format métal, sans ventilateur. Priorisation du trafic et alimentation externe compacte.",
    price: 89,
    category: "Réseau",
    stock: 22,
    imageUrl: "/images/products/novaswitch-8.svg"
  },
  {
    name: "NovaMesh Pro — Pack 2",
    description:
      "Système WiFi maillé tri-bande pour 350 m² : deux satellites, roaming transparent et application de gestion. Couvre les maisons à murs épais.",
    price: 249,
    category: "Réseau",
    stock: 16,
    imageUrl: "/images/products/novamesh-pro.svg"
  },
  {
    name: "NovaScan — Scanner à plat",
    description:
      "Scanner à plat A4 recto-verso avec chargeur automatique de 30 pages, 40 ppm et numérisation vers le cloud. Pilotes sans installation.",
    price: 229,
    category: "Impression",
    stock: 9,
    imageUrl: "/images/products/novascan.svg"
  }
];

const DEMO_USER = {
  name: "Utilisateur Démo",
  email: "demo@novatech.fr",
  password: "Demo1234!",
  role: "customer"
};

const ADMIN_USER = {
  name: "Administrateur NovaTech",
  email: "admin@novatech.fr",
  password: "Admin1234!",
  role: "admin"
};

const seed = async () => {
  try {
    assertServerEnv();
    await connectDatabase();

    await Product.deleteMany({});
    const products = await Product.insertMany(PRODUCTS);
    console.log(`✓ ${products.length} produits insérés.`);

    const existingUser = await User.findOne({ email: DEMO_USER.email });
    if (!existingUser) {
      await User.create(DEMO_USER);
      console.log(`✓ Compte démo créé : ${DEMO_USER.email} (mot de passe : ${DEMO_USER.password})`);
    } else {
      console.log("• Compte démo déjà présent.");
    }

    const existingAdmin = await User.findOne({ email: ADMIN_USER.email });
    if (!existingAdmin) {
      await User.create(ADMIN_USER);
      console.log(`✓ Compte admin créé : ${ADMIN_USER.email} (mot de passe : ${ADMIN_USER.password})`);
    } else if (existingAdmin.role !== 'admin') {
      existingAdmin.role = 'admin';
      await existingAdmin.save();
      console.log(`✓ Rôle admin accordé à : ${ADMIN_USER.email}`);
    } else {
      console.log("• Compte admin déjà présent.");
    }

    await mongoose.connection.close();
    console.log("✓ Seed terminé.");
    process.exit(0);
  } catch (error) {
    console.error("Seed échoué :", error.message);
    process.exit(1);
  }
};

seed();
