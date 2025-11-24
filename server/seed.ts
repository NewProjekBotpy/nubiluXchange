import { db } from "./db";
import { users, products, chats, messages, notifications, news } from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { logError, logInfo } from "./utils/logger";

const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, 12);
};

export async function seedDatabase() {
  try {
    logInfo("Seeding database...", { context: 'seedDatabase' });

    // Check if data already exists
    const existingUsers = await db.select().from(users).limit(1);
    if (existingUsers.length > 0) {
      logInfo("Database already seeded, skipping...", { context: 'seedDatabase' });
      return;
    }

    // Create sample users with hashed passwords
    const sampleUsers = await db.insert(users).values([
      {
        username: "admin_test",
        email: "admin@example.com",
        password: await hashPassword("admin123"),
        role: "admin",
        displayName: "Test Admin",
        bio: "Admin user for testing admin panel",
        phoneNumber: "+6281234567890",
        isVerified: true,
        isAdminApproved: true,
        walletBalance: "0"
      },
      {
        username: "gamer_pro",
        email: "gamer@example.com",
        password: await hashPassword("password123"),
        role: "admin",
        displayName: "Pro Gamer",
        bio: "Professional Mobile Legends player with 500+ skins - Admin User",
        isVerified: true,
        isAdminApproved: true,
        walletBalance: "2500000"
      },
      {
        username: "buyer_123",
        email: "buyer@example.com", 
        password: await hashPassword("password456"),
        role: "buyer",
        displayName: "Gaming Enthusiast",
        bio: "Looking for premium gaming accounts",
        walletBalance: "1000000"
      },
      {
        username: "seller_ml",
        email: "seller@example.com",
        password: await hashPassword("password789"),
        role: "seller", 
        displayName: "ML Account Seller",
        bio: "Selling high-tier Mobile Legends accounts",
        isVerified: true,
        walletBalance: "5000000"
      }
    ]).returning();

    // Create sample products
    const sampleProducts = await db.insert(products).values([
      {
        sellerId: sampleUsers[0].id,
        title: "Mobile Legends Epic Account - 54 Skins",
        description: "Mythic rank account with 54 premium skins including Collector and Starlight skins. All heroes unlocked. High win rate and excellent stats.",
        category: "mobile_legends",
        price: "2500000",
        thumbnail: "https://images.unsplash.com/photo-1556438064-2d7646166914?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
        images: [
          "https://images.unsplash.com/photo-1556438064-2d7646166914?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=600",
          "https://images.unsplash.com/photo-1542751371-adc38448a05e?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=600"
        ],
        gameData: {
          rank: "Mythic",
          totalSkins: 54,
          heroes: "All heroes unlocked",
          winRate: "75%"
        },
        isPremium: true,
        rating: "4.9",
        reviewCount: 23
      },
      {
        sellerId: sampleUsers[2].id,
        title: "PUBG Mobile Conqueror Account",
        description: "Season 20 Conqueror rank with rare outfits and maxed weapons. Premium crates opened. Perfect for competitive players.",
        category: "pubg_mobile",
        price: "1800000",
        thumbnail: "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
        images: [
          "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=600"
        ],
        gameData: {
          rank: "Conqueror",
          season: "Season 20",
          kd: "3.2",
          wins: "450+"
        },
        isPremium: false,
        rating: "4.7",
        reviewCount: 15
      },
      {
        sellerId: sampleUsers[0].id,
        title: "Free Fire Diamond Account - Elite Pass Maxed",
        description: "Account with 5000+ diamonds, rare bundles, and elite pass maxed. High rank with exclusive items.",
        category: "free_fire",
        price: "450000",
        thumbnail: "https://images.unsplash.com/photo-1511512578047-dfb367046420?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
        images: [
          "https://images.unsplash.com/photo-1511512578047-dfb367046420?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=600"
        ],
        gameData: {
          diamonds: "5000+",
          rank: "Heroic",
          level: "65",
          badges: "Multiple"
        },
        isPremium: false,
        rating: "4.5",
        reviewCount: 8
      },
      {
        sellerId: sampleUsers[2].id,
        title: "Valorant Immortal Account - Premium Skins",
        description: "Immortal rank account with Phantom and Vandal premium skins. Battle pass completed with exclusive items.",
        category: "valorant", 
        price: "3200000",
        thumbnail: "https://images.unsplash.com/photo-1542751371-adc38448a05e?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
        images: [
          "https://images.unsplash.com/photo-1542751371-adc38448a05e?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=600"
        ],
        gameData: {
          rank: "Immortal",
          rr: "2850",
          skins: "Premium collection",
          agents: "All unlocked"
        },
        isPremium: true,
        rating: "4.8",
        reviewCount: 12
      },
      {
        sellerId: sampleUsers[1].id,
        title: "Mobile Legends Legend Account - 32 Skins",
        description: "Legend rank account with 32 skins including some rare limited editions. Good for climbing to higher ranks.",
        category: "mobile_legends",
        price: "850000",
        thumbnail: "https://images.unsplash.com/photo-1556438064-2d7646166914?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
        images: [
          "https://images.unsplash.com/photo-1556438064-2d7646166914?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=600"
        ],
        gameData: {
          rank: "Legend",
          totalSkins: 32,
          heroes: "Most heroes unlocked",
          winRate: "68%"
        },
        isPremium: false,
        rating: "4.3",
        reviewCount: 18
      },
      {
        sellerId: sampleUsers[0].id,
        title: "PUBG Mobile Ace Account - Rare Outfits",
        description: "Season 22 Ace rank with exclusive outfits and weapon skins. High K/D ratio and consistent ranking performance.",
        category: "pubg_mobile",
        price: "1200000",
        thumbnail: "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
        images: [
          "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=600"
        ],
        gameData: {
          rank: "Ace",
          season: "Season 22",
          kd: "2.8",
          wins: "320+"
        },
        isPremium: false,
        rating: "4.6",
        reviewCount: 11
      },
      {
        sellerId: sampleUsers[2].id,
        title: "Free Fire Grandmaster Account - 8000 Diamonds",
        description: "High-tier account with 8000+ diamonds, legendary bundles, and exclusive pets. Perfect for competitive play.",
        category: "free_fire",
        price: "650000",
        thumbnail: "https://images.unsplash.com/photo-1511512578047-dfb367046420?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
        images: [
          "https://images.unsplash.com/photo-1511512578047-dfb367046420?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=600"
        ],
        gameData: {
          diamonds: "8000+",
          rank: "Grandmaster",
          level: "72",
          badges: "Elite collection"
        },
        isPremium: true,
        rating: "4.7",
        reviewCount: 14
      },
      {
        sellerId: sampleUsers[1].id,
        title: "Valorant Ascendant Account - Battle Pass Complete",
        description: "Ascendant rank account with completed battle pass and premium weapon skins. All agents unlocked with good stats.",
        category: "valorant",
        price: "1850000",
        thumbnail: "https://images.unsplash.com/photo-1542751371-adc38448a05e?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
        images: [
          "https://images.unsplash.com/photo-1542751371-adc38448a05e?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=600"
        ],
        gameData: {
          rank: "Ascendant",
          rr: "1750",
          skins: "Battle pass collection",
          agents: "All unlocked"
        },
        isPremium: false,
        rating: "4.4",
        reviewCount: 9
      },
      {
        sellerId: sampleUsers[0].id,
        title: "Mobile Legends Mythical Glory - Limited Skins",
        description: "Mythical Glory account with exclusive limited skins and perfect emblem setup. Top 1% player account.",
        category: "mobile_legends",
        price: "4200000",
        thumbnail: "https://images.unsplash.com/photo-1556438064-2d7646166914?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
        images: [
          "https://images.unsplash.com/photo-1556438064-2d7646166914?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=600",
          "https://images.unsplash.com/photo-1542751371-adc38448a05e?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=600"
        ],
        gameData: {
          rank: "Mythical Glory",
          totalSkins: 89,
          heroes: "All heroes maxed",
          winRate: "82%"
        },
        isPremium: true,
        rating: "4.9",
        reviewCount: 31
      },
      {
        sellerId: sampleUsers[2].id,
        title: "PUBG Mobile Crown Account - Vehicle Skins",
        description: "Crown rank account with rare vehicle skins and weapon upgrades. Season rewards collected and good inventory.",
        category: "pubg_mobile",
        price: "950000",
        thumbnail: "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
        images: [
          "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=600"
        ],
        gameData: {
          rank: "Crown",
          season: "Season 21",
          kd: "2.4",
          wins: "280+"
        },
        isPremium: false,
        rating: "4.2",
        reviewCount: 7
      },
      {
        sellerId: sampleUsers[1].id,
        title: "Mobile Legends Epic Skin Collection - 45 Skins",
        description: "Epic rank account dengan koleksi 45 skin premium termasuk beberapa skin collector edition. Semua hero terdeblock dengan emblem level max.",
        category: "mobile_legends",
        price: "1750000",
        thumbnail: "https://images.unsplash.com/photo-1556438064-2d7646166914?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
        images: [
          "https://images.unsplash.com/photo-1556438064-2d7646166914?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=600"
        ],
        gameData: {
          rank: "Epic",
          totalSkins: 45,
          heroes: "All heroes unlocked",
          winRate: "71%"
        },
        isPremium: false,
        rating: "4.6",
        reviewCount: 19
      },
      {
        sellerId: sampleUsers[0].id,
        title: "PUBG Mobile Diamond Tier - Season 23",
        description: "Diamond tier account season 23 dengan outfit eksklusif dan senjata upgrade penuh. Inventory lengkap dengan item rare.",
        category: "pubg_mobile",
        price: "1650000",
        thumbnail: "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
        images: [
          "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=600"
        ],
        gameData: {
          rank: "Diamond",
          season: "Season 23",
          kd: "3.1",
          wins: "380+"
        },
        isPremium: true,
        rating: "4.8",
        reviewCount: 22
      },
      {
        sellerId: sampleUsers[2].id,
        title: "Free Fire Master Account - Elite Bundle",
        description: "Master rank dengan bundle elite terlengkap dan pet legendary. Level tinggi dengan skill badge komplet.",
        category: "free_fire",
        price: "580000",
        thumbnail: "https://images.unsplash.com/photo-1511512578047-dfb367046420?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
        images: [
          "https://images.unsplash.com/photo-1511512578047-dfb367046420?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=600"
        ],
        gameData: {
          diamonds: "3500+",
          rank: "Master",
          level: "58",
          badges: "Champion collection"
        },
        isPremium: false,
        rating: "4.4",
        reviewCount: 13
      },
      {
        sellerId: sampleUsers[1].id,
        title: "Valorant Radiant Account - Championship Bundle",
        description: "Top tier Radiant account dengan championship bundle lengkap. Perfect aim dan game sense untuk professional play.",
        category: "valorant",
        price: "5500000",
        thumbnail: "https://images.unsplash.com/photo-1542751371-adc38448a05e?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
        images: [
          "https://images.unsplash.com/photo-1542751371-adc38448a05e?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=600"
        ],
        gameData: {
          rank: "Radiant",
          rr: "3200+",
          skins: "Championship bundle",
          agents: "All mastered"
        },
        isPremium: true,
        rating: "4.9",
        reviewCount: 27
      },
      {
        sellerId: sampleUsers[0].id,
        title: "Mobile Legends Grandmaster - 28 Skins",
        description: "Grandmaster account stabil dengan 28 skin bagus dan winrate konsisten. Cocok untuk push ke Epic.",
        category: "mobile_legends",
        price: "720000",
        thumbnail: "https://images.unsplash.com/photo-1556438064-2d7646166914?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
        images: [
          "https://images.unsplash.com/photo-1556438064-2d7646166914?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=600"
        ],
        gameData: {
          rank: "Grandmaster",
          totalSkins: 28,
          heroes: "Most heroes unlocked",
          winRate: "66%"
        },
        isPremium: false,
        rating: "4.1",
        reviewCount: 16
      },
      {
        sellerId: sampleUsers[2].id,
        title: "PUBG Mobile Platinum Account - Vehicle Collection",
        description: "Platinum rank dengan koleksi kendaraan rare dan senjata skin eksklusif. Stats bagus untuk competitive gaming.",
        category: "pubg_mobile",
        price: "890000",
        thumbnail: "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
        images: [
          "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=600"
        ],
        gameData: {
          rank: "Platinum",
          season: "Season 22",
          kd: "2.6",
          wins: "250+"
        },
        isPremium: false,
        rating: "4.3",
        reviewCount: 11
      },
      {
        sellerId: sampleUsers[1].id,
        title: "Free Fire Heroic Elite - 6000 Diamonds",
        description: "Heroic rank dengan 6000+ diamonds dan pet collection lengkap. Character bundle premium tersedia.",
        category: "free_fire",
        price: "520000",
        thumbnail: "https://images.unsplash.com/photo-1511512578047-dfb367046420?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
        images: [
          "https://images.unsplash.com/photo-1511512578047-dfb367046420?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=600"
        ],
        gameData: {
          diamonds: "6000+",
          rank: "Heroic",
          level: "61",
          badges: "Premium set"
        },
        isPremium: false,
        rating: "4.5",
        reviewCount: 9
      },
      {
        sellerId: sampleUsers[0].id,
        title: "Valorant Diamond Account - Prime Collection",
        description: "Diamond rank dengan prime weapon collection dan battle pass completed. All agents unlocked dengan good performance.",
        category: "valorant",
        price: "2200000",
        thumbnail: "https://images.unsplash.com/photo-1542751371-adc38448a05e?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
        images: [
          "https://images.unsplash.com/photo-1542751371-adc38448a05e?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=600"
        ],
        gameData: {
          rank: "Diamond",
          rr: "2100",
          skins: "Prime collection",
          agents: "All unlocked"
        },
        isPremium: true,
        rating: "4.7",
        reviewCount: 18
      },
      {
        sellerId: sampleUsers[2].id,
        title: "Mobile Legends Master Tier - Starlight Skins",
        description: "Master tier account dengan starlight skin collection dan emblem setup optimal. Perfect untuk ranked games.",
        category: "mobile_legends",
        price: "1150000",
        thumbnail: "https://images.unsplash.com/photo-1556438064-2d7646166914?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
        images: [
          "https://images.unsplash.com/photo-1556438064-2d7646166914?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=600"
        ],
        gameData: {
          rank: "Master",
          totalSkins: 38,
          heroes: "Most heroes maxed",
          winRate: "73%"
        },
        isPremium: false,
        rating: "4.4",
        reviewCount: 21
      },
      {
        sellerId: sampleUsers[1].id,
        title: "PUBG Mobile Gold Tier - Season Rewards",
        description: "Gold tier account dengan season rewards lengkap dan outfit collection. Ideal untuk casual gaming.",
        category: "pubg_mobile",
        price: "650000",
        thumbnail: "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
        images: [
          "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=600"
        ],
        gameData: {
          rank: "Gold",
          season: "Season 23",
          kd: "2.1",
          wins: "180+"
        },
        isPremium: false,
        rating: "4.0",
        reviewCount: 8
      },
      {
        sellerId: sampleUsers[0].id,
        title: "Free Fire Elite Pass Maxed - 4500 Diamonds",
        description: "Elite pass maxed account dengan 4500 diamonds dan bundle character premium. Level tinggi dengan achievement lengkap.",
        category: "free_fire",
        price: "420000",
        thumbnail: "https://images.unsplash.com/photo-1511512578047-dfb367046420?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
        images: [
          "https://images.unsplash.com/photo-1511512578047-dfb367046420?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=600"
        ],
        gameData: {
          diamonds: "4500+",
          rank: "Elite",
          level: "55",
          badges: "Achievement set"
        },
        isPremium: false,
        rating: "4.2",
        reviewCount: 12
      },
      {
        sellerId: sampleUsers[2].id,
        title: "Valorant Platinum Account - Spectrum Bundle",
        description: "Platinum rank dengan spectrum weapon bundle dan completed battle pass. Clean account dengan good stats.",
        category: "valorant",
        price: "1950000",
        thumbnail: "https://images.unsplash.com/photo-1542751371-adc38448a05e?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
        images: [
          "https://images.unsplash.com/photo-1542751371-adc38448a05e?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=600"
        ],
        gameData: {
          rank: "Platinum",
          rr: "1650",
          skins: "Spectrum bundle",
          agents: "Most unlocked"
        },
        isPremium: false,
        rating: "4.5",
        reviewCount: 15
      },
      {
        sellerId: sampleUsers[1].id,
        title: "Mobile Legends Legend Rank - 41 Premium Skins",
        description: "Legend rank account dengan 41 premium skins termasuk limited edition. Emblem maxed dan hero mastery tinggi.",
        category: "mobile_legends",
        price: "1450000",
        thumbnail: "https://images.unsplash.com/photo-1556438064-2d7646166914?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
        images: [
          "https://images.unsplash.com/photo-1556438064-2d7646166914?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=600"
        ],
        gameData: {
          rank: "Legend",
          totalSkins: 41,
          heroes: "All heroes unlocked",
          winRate: "69%"
        },
        isPremium: true,
        rating: "4.6",
        reviewCount: 24
      },
      {
        sellerId: sampleUsers[0].id,
        title: "PUBG Mobile Silver Elite - Starter Pack",
        description: "Silver Elite account untuk pemula dengan basic outfit dan weapon skins. Cocok untuk yang baru mulai bermain.",
        category: "pubg_mobile",
        price: "380000",
        thumbnail: "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
        images: [
          "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=600"
        ],
        gameData: {
          rank: "Silver",
          season: "Season 23",
          kd: "1.8",
          wins: "120+"
        },
        isPremium: false,
        rating: "3.9",
        reviewCount: 6
      },
      {
        sellerId: sampleUsers[2].id,
        title: "Free Fire Pro League - Tournament Ready",
        description: "Pro league account tournament ready dengan semua character bundle dan pet legendary. Setup kompetitif lengkap.",
        category: "free_fire",
        price: "850000",
        thumbnail: "https://images.unsplash.com/photo-1511512578047-dfb367046420?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
        images: [
          "https://images.unsplash.com/photo-1511512578047-dfb367046420?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=600"
        ],
        gameData: {
          diamonds: "7500+",
          rank: "Grandmaster",
          level: "68",
          badges: "Pro league set"
        },
        isPremium: true,
        rating: "4.8",
        reviewCount: 17
      },
      {
        sellerId: sampleUsers[1].id,
        title: "Valorant Gold Account - Guardian Collection",
        description: "Gold rank account dengan guardian weapon collection dan battle pass progress. Good entry level untuk competitive.",
        category: "valorant",
        price: "1200000",
        thumbnail: "https://images.unsplash.com/photo-1542751371-adc38448a05e?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
        images: [
          "https://images.unsplash.com/photo-1542751371-adc38448a05e?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=600"
        ],
        gameData: {
          rank: "Gold",
          rr: "1350",
          skins: "Guardian collection",
          agents: "Basic set unlocked"
        },
        isPremium: false,
        rating: "4.1",
        reviewCount: 10
      },
      {
        sellerId: sampleUsers[0].id,
        title: "Mobile Legends Mythic Honor - 67 Skins Total",
        description: "Mythic Honor account dengan 67 skin total termasuk collector edition. Top player stats dengan emblem perfect setup.",
        category: "mobile_legends",
        price: "3850000",
        thumbnail: "https://images.unsplash.com/photo-1556438064-2d7646166914?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
        images: [
          "https://images.unsplash.com/photo-1556438064-2d7646166914?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=600",
          "https://images.unsplash.com/photo-1542751371-adc38448a05e?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=600"
        ],
        gameData: {
          rank: "Mythic Honor",
          totalSkins: 67,
          heroes: "All heroes maxed",
          winRate: "79%"
        },
        isPremium: true,
        rating: "4.9",
        reviewCount: 35
      },
      {
        sellerId: sampleUsers[2].id,
        title: "PUBG Mobile Conqueror Top 500 - Ultimate Pack",
        description: "Top 500 Conqueror account dengan ultimate outfit collection dan maxed weapons. Professional level gameplay.",
        category: "pubg_mobile",
        price: "2800000",
        thumbnail: "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
        images: [
          "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=600"
        ],
        gameData: {
          rank: "Conqueror",
          season: "Season 23",
          kd: "4.2",
          wins: "520+"
        },
        isPremium: true,
        rating: "4.9",
        reviewCount: 28
      },
      {
        sellerId: sampleUsers[1].id,
        title: "Free Fire Bronze Account - Budget Starter",
        description: "Bronze rank account untuk budget starter dengan basic items dan beberapa character unlock. Perfect untuk pemula.",
        category: "free_fire",
        price: "180000",
        thumbnail: "https://images.unsplash.com/photo-1511512578047-dfb367046420?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
        images: [
          "https://images.unsplash.com/photo-1511512578047-dfb367046420?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=600"
        ],
        gameData: {
          diamonds: "1200+",
          rank: "Bronze",
          level: "32",
          badges: "Starter collection"
        },
        isPremium: false,
        rating: "3.8",
        reviewCount: 5
      }
    ]).returning();

    // Create sample notifications
    await db.insert(notifications).values([
      {
        userId: sampleUsers[1].id,
        title: "New Product Available",
        message: "Mobile Legends Epic Account just listed!",
        type: "order"
      },
      {
        userId: sampleUsers[0].id,
        title: "Product Interest",
        message: "Someone viewed your PUBG account",
        type: "message"
      }
    ]);

    // Create sample chats between buyers and sellers
    const sampleChats = await db.insert(chats).values([
      {
        productId: sampleProducts[0].id,
        buyerId: sampleUsers[2].id, // buyer_123
        sellerId: sampleUsers[0].id, // gamer_pro (admin/seller)
        status: "active"
      },
      {
        productId: sampleProducts[1].id,
        buyerId: sampleUsers[1].id, // gamer_pro buying from seller_ml
        sellerId: sampleUsers[3].id, // seller_ml
        status: "active"
      },
      {
        productId: sampleProducts[3].id,
        buyerId: sampleUsers[2].id, // buyer_123
        sellerId: sampleUsers[3].id, // seller_ml
        status: "active"
      }
    ]).returning();

    // Create sample messages with buyer, seller, and AI admin interactions
    // Chat 1: Mobile Legends Epic Account conversation
    await db.insert(messages).values([
      {
        chatId: sampleChats[0].id,
        senderId: sampleUsers[2].id, // buyer_123
        content: "Halo kak, saya tertarik dengan akun ML 54 skins ini. Apakah masih tersedia?",
        messageType: "text",
        status: "read",
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      },
      {
        chatId: sampleChats[0].id,
        senderId: sampleUsers[0].id, // gamer_pro (seller)
        content: "Halo! Masih available kak. Ini akun Mythic rank dengan 54 skins premium. Kondisi top dan emblem sudah maxed semua 🎮",
        messageType: "text",
        status: "read",
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 5 * 60 * 1000) // 1h 55m ago
      },
      {
        chatId: sampleChats[0].id,
        senderId: sampleUsers[2].id, // buyer_123
        content: "Wah menarik! Apakah bisa dilihat screenshot akun dan skin collectionnya kak?",
        messageType: "text",
        status: "read",
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 10 * 60 * 1000) // 1h 50m ago
      },
      {
        chatId: sampleChats[0].id,
        senderId: sampleUsers[0].id, // gamer_pro (seller)
        content: "Tentu! Saya kirim screenshotnya ya. Akun ini punya collector skins juga loh, sangat rare.",
        messageType: "text",
        status: "read",
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 12 * 60 * 1000) // 1h 48m ago
      },
      {
        chatId: sampleChats[0].id,
        senderId: sampleUsers[0].id, // AI Admin - memberikan rekomendasi
        content: "💡 Tip dari AI: Saya telah memverifikasi bahwa seller ini adalah pengguna terverifikasi dengan rating tinggi (4.9/5). Transaksi dengan seller ini aman. Pastikan untuk menggunakan sistem escrow kami untuk perlindungan maksimal!",
        messageType: "text",
        status: "read",
        metadata: { aiType: "recommendation", trustScore: 95, isAiAdmin: true },
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 13 * 60 * 1000) // 1h 47m ago
      },
      {
        chatId: sampleChats[0].id,
        senderId: sampleUsers[2].id, // buyer_123
        content: "Terima kasih infonya! Oke saya tertarik. Bagaimana cara transaksinya kak?",
        messageType: "text",
        status: "read",
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 20 * 60 * 1000) // 1h 40m ago
      },
      {
        chatId: sampleChats[0].id,
        senderId: sampleUsers[0].id, // gamer_pro (seller)
        content: "Gampang kak, kita pakai sistem escrow platform ini. Jadi aman, uang dipegang platform dulu sampai akun diterima dengan baik. Setelah itu baru di-release ke saya 😊",
        messageType: "text",
        status: "read",
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 22 * 60 * 1000) // 1h 38m ago
      },
      {
        chatId: sampleChats[0].id,
        senderId: sampleUsers[2].id, // buyer_123
        content: "Oke deal! Saya akan proses pembayaran sekarang. Ditunggu ya kak!",
        messageType: "text",
        status: "delivered",
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000) // 1 hour ago
      }
    ]);

    // Chat 2: PUBG Mobile conversation with AI warning
    await db.insert(messages).values([
      {
        chatId: sampleChats[1].id,
        senderId: sampleUsers[1].id, // gamer_pro (buyer)
        content: "Gan, akun PUBG Conqueror ini legit kan? Ada garansi gak?",
        messageType: "text",
        status: "read",
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000) // 3 hours ago
      },
      {
        chatId: sampleChats[1].id,
        senderId: sampleUsers[3].id, // seller_ml
        content: "Legit 100% gan! Saya jual akun sendiri yang sudah di-grind dari season awal. Ada garansi 7 hari, kalau ada masalah bisa refund penuh.",
        messageType: "text",
        status: "read",
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000 + 5 * 60 * 1000) // 2h 55m ago
      },
      {
        chatId: sampleChats[1].id,
        senderId: sampleUsers[1].id, // gamer_pro (buyer)
        content: "Mantap! Bisa COD gak gan? Saya di Jakarta.",
        messageType: "text",
        status: "read",
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000 + 10 * 60 * 1000) // 2h 50m ago
      },
      {
        chatId: sampleChats[1].id,
        senderId: sampleUsers[3].id, // AI Admin - memberikan peringatan
        content: "⚠️ Peringatan Keamanan: Kami mendeteksi permintaan transaksi di luar platform (COD). Untuk keamanan Anda, sangat disarankan menggunakan sistem escrow platform kami. Transaksi di luar platform tidak dilindungi oleh kebijakan perlindungan pembeli kami.",
        messageType: "text",
        status: "read",
        metadata: { aiType: "warning", severity: "medium", reason: "off_platform_transaction", isAiAdmin: true },
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000 + 11 * 60 * 1000) // 2h 49m ago
      },
      {
        chatId: sampleChats[1].id,
        senderId: sampleUsers[3].id, // seller_ml
        content: "Wah, betul juga ya. Lebih baik kita pakai escrow platform aja gan, lebih aman untuk kita berdua. Saya juga dapat perlindungan seller.",
        messageType: "text",
        status: "read",
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000 + 15 * 60 * 1000) // 2h 45m ago
      },
      {
        chatId: sampleChats[1].id,
        senderId: sampleUsers[1].id, // gamer_pro (buyer)
        content: "Oke deh gan, kita pakai escrow aja. Lebih aman memang. Gimana prosesnya?",
        messageType: "text",
        status: "read",
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000 + 20 * 60 * 1000) // 2h 40m ago
      },
      {
        chatId: sampleChats[1].id,
        senderId: sampleUsers[3].id, // seller_ml
        content: "Tinggal klik tombol 'Beli Sekarang' di product page, nanti otomatis masuk ke escrow. Transfer dulu, setelah itu saya kirim data akun. Kalau sudah oke, kamu confirm penerimaan. Simple!",
        messageType: "text",
        status: "delivered",
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      }
    ]);

    // Chat 3: Valorant account with AI mediation
    await db.insert(messages).values([
      {
        chatId: sampleChats[2].id,
        senderId: sampleUsers[2].id, // buyer_123
        content: "Halo, saya mau tanya akun Valorant Immortal ini. Apakah ada riwayat ban atau warning dari Riot?",
        messageType: "text",
        status: "read",
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000) // 5 hours ago
      },
      {
        chatId: sampleChats[2].id,
        senderId: sampleUsers[3].id, // seller_ml
        content: "Tidak ada sama sekali kak! Akun clean, no ban, no warning. Saya main fair tanpa cheat. Bisa di-check history matchnya.",
        messageType: "text",
        status: "read",
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000 + 3 * 60 * 1000) // 4h 57m ago
      },
      {
        chatId: sampleChats[2].id,
        senderId: sampleUsers[2].id, // buyer_123
        content: "Bagus! Tapi harganya agak tinggi ya 3.2 juta. Bisa nego gak kak?",
        messageType: "text",
        status: "read",
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000 + 10 * 60 * 1000) // 4h 50m ago
      },
      {
        chatId: sampleChats[2].id,
        senderId: sampleUsers[3].id, // seller_ml
        content: "Maaf kak, untuk akun Immortal dengan skin premium seperti ini harga sudah pas. Tapi kalau serius bisa saya kasih bonus skin guardian tambahan.",
        messageType: "text",
        status: "read",
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000 + 15 * 60 * 1000) // 4h 45m ago
      },
      {
        chatId: sampleChats[2].id,
        senderId: sampleUsers[0].id, // AI Admin - memberikan analisis harga
        content: "📊 Analisis Harga AI: Harga Rp 3.200.000 untuk akun Valorant Immortal dengan premium skins berada dalam rentang harga pasar wajar. Berdasarkan 156 transaksi serupa, harga rata-rata adalah Rp 3.150.000 - Rp 3.450.000. Penawaran ini kompetitif.",
        messageType: "text",
        status: "read",
        metadata: { aiType: "analysis", priceAnalysis: { avgPrice: 3300000, marketRange: "3150000-3450000" }, isAiAdmin: true },
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000 + 16 * 60 * 1000) // 4h 44m ago
      },
      {
        chatId: sampleChats[2].id,
        senderId: sampleUsers[2].id, // buyer_123
        content: "Wah terima kasih info analisis harganya! Sangat membantu. Oke deh, saya setuju dengan harga ini. Gimana cara transaksinya?",
        messageType: "text",
        status: "read",
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000) // 4 hours ago
      },
      {
        chatId: sampleChats[2].id,
        senderId: sampleUsers[3].id, // seller_ml
        content: "Siap kak! Langsung klik 'Beli Sekarang' aja. Nanti uang akan di-hold di escrow sampai kamu confirm akun sudah diterima dengan baik. Setelah itu baru saya terima pembayaran. Aman dan terpercaya! 🔒",
        messageType: "text",
        status: "read",
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000 + 5 * 60 * 1000) // 3h 55m ago
      },
      {
        chatId: sampleChats[2].id,
        senderId: sampleUsers[0].id, // AI Admin - memberikan tips
        content: "✅ Tips Transaksi Aman: \n1. Pastikan memeriksa akun dengan teliti sebelum konfirmasi\n2. Ganti password dan email segera setelah menerima akun\n3. Aktifkan 2FA untuk keamanan ekstra\n4. Jika ada masalah dalam 7 hari, hubungi support untuk bantuan\n\nSelamat bertransaksi! 🎮",
        messageType: "text",
        status: "delivered",
        metadata: { aiType: "tips", category: "transaction_safety", isAiAdmin: true },
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000) // 3 hours ago
      }
    ]);

    // Create sample gaming news
    const sampleNews = await db.insert(news).values([
      {
        title: "Mobile Legends Update 1.8.44: Hero Baru Nolan dan Buff Besar untuk Marksman",
        content: "Moonton merilis update besar untuk Mobile Legends Bang Bang versi 1.8.44. Update ini menghadirkan hero baru bernama Nolan, seorang assassin dengan kemampuan teleport yang unik. Selain itu, ada buff signifikan untuk role marksman yang membuat mereka lebih tanky di early game. Hero seperti Beatrix, Melissa, dan Wanwan mendapat peningkatan base HP dan armor. Update juga mencakup rework skill ultimate Guinevere dan penyesuaian meta jungle. Para pemain dapat mengunduh update ini mulai hari ini dan mendapatkan skin gratis Nolan (Basic) dengan login selama 7 hari berturut-turut.",
        author: "NXE Gaming News",
        thumbnail: "https://images.unsplash.com/photo-1542751371-adc38448a05e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        images: [
          "https://images.unsplash.com/photo-1542751371-adc38448a05e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
          "https://images.unsplash.com/photo-1556438064-2d7646166914?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
          "https://images.unsplash.com/photo-1511512578047-dfb367046420?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
        ],
        isPinned: true,
        isPublished: true,
        category: "update",
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      },
      {
        title: "Turnamen PUBG Mobile Pro League Indonesia Season 5 Dimulai 15 November",
        content: "Tencent Games mengumumkan bahwa PUBG Mobile Pro League (PMPL) Indonesia Season 5 akan dimulai pada 15 November 2025. Turnamen ini akan diikuti oleh 16 tim terbaik Indonesia dengan total hadiah Rp 1.5 miliar. Format kompetisi tetap sama dengan season sebelumnya: weekly finals selama 5 minggu, diikuti oleh grand finals. Tim pemenang akan mewakili Indonesia di PUBG Mobile Global Championship. Pendaftaran untuk kualifikasi masih dibuka hingga 5 November. Para pemain profesional dan tim esports diharapkan memberikan pertandingan yang sengit dan menghibur.",
        author: "Tim Esports NXE",
        thumbnail: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        images: [
          "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
          "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
          "https://images.unsplash.com/photo-1560253023-3ec5d502959f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
        ],
        isPinned: true,
        isPublished: true,
        category: "event",
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000) // 5 hours ago
      },
      {
        title: "Free Fire MAX: Event Diamond Royale Hadirkan Bundle Eksklusif Senilai 10.000 Diamond",
        content: "Garena Free Fire MAX menghadirkan event Diamond Royale spesial dengan bundle eksklusif 'Cyber Fusion' yang berisi kostum futuristik, pet legendary, dan weapon skin animasi. Event ini berlangsung dari 1-15 November 2025. Pemain berkesempatan mendapatkan bundle senilai 10.000 diamond hanya dengan 1 spin beruntung. Selain itu, ada juga event top-up bonus di mana setiap pembelian diamond akan mendapat extra diamond hingga 100%. Jangan lewatkan kesempatan emas ini! Event Diamond Royale biasanya hanya muncul 2-3 kali dalam setahun.",
        author: "NXE Gaming News",
        thumbnail: "https://images.unsplash.com/photo-1511512578047-dfb367046420?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        images: [
          "https://images.unsplash.com/photo-1511512578047-dfb367046420?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
          "https://images.unsplash.com/photo-1614294148960-9aa740632a87?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
        ],
        isPinned: false,
        isPublished: true,
        category: "event",
        createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000) // 8 hours ago
      },
      {
        title: "Valorant Indonesia Championship 2025: Hadiah Total Rp 2 Miliar untuk Tim Terbaik",
        content: "Riot Games Indonesia dengan bangga mengumumkan Valorant Indonesia Championship 2025, turnamen Valorant terbesar di Indonesia dengan total hadiah mencapai Rp 2 miliar. Kompetisi akan berlangsung selama 3 bulan mulai Desember 2025 hingga Februari 2026. Tim juara akan mendapat slot langsung ke VCT Pacific 2026. Pendaftaran dibuka untuk semua tim dengan minimal rank Immortal 2. Format turnamen menggunakan sistem double elimination bracket. Para caster dan analyst profesional akan memberikan commentary untuk setiap pertandingan. Informasi lebih lanjut dapat dilihat di website resmi Valorant Indonesia.",
        author: "Redaksi NXE",
        thumbnail: "https://images.unsplash.com/photo-1560253023-3ec5d502959f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        images: [
          "https://images.unsplash.com/photo-1560253023-3ec5d502959f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
          "https://images.unsplash.com/photo-1542751371-adc38448a05e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
          "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
        ],
        isPinned: false,
        isPublished: true,
        category: "event",
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000) // 12 hours ago
      },
      {
        title: "Genshin Impact Update 4.2: Region Fontaine Diperluas dengan 3 Area Baru",
        content: "HoYoverse merilis update 4.2 untuk Genshin Impact yang memperluas region Fontaine dengan 3 area underwater yang spektakuler. Update ini juga menghadirkan 2 karakter 5-star baru: Furina (Hydro Sword) dan Charlotte (Cryo Catalyst). Sistem underwater exploration mendapat improvement signifikan dengan stamina yang lebih besar dan mekanik diving yang lebih smooth. Event spesial 'Fontaine Festival' memberikan rewards melimpah termasuk primogems gratis hingga 1600. Update juga mencakup Spiral Abyss floor baru dan weapon banner dengan Aqua Simulacra dan Polar Star.",
        author: "NXE RPG Desk",
        thumbnail: "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        images: [
          "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
          "https://images.unsplash.com/photo-1614294148960-9aa740632a87?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
          "https://images.unsplash.com/photo-1556438064-2d7646166914?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
        ],
        isPinned: false,
        isPublished: true,
        category: "update",
        createdAt: new Date(Date.now() - 18 * 60 * 60 * 1000) // 18 hours ago
      },
      {
        title: "Server Maintenance NubiluXchange: Upgrade Database dan Keamanan",
        content: "Tim NubiluXchange akan melakukan maintenance server pada Minggu, 3 November 2025 pukul 02.00 - 06.00 WIB. Maintenance ini bertujuan untuk upgrade infrastructure database, peningkatan keamanan sistem, dan optimasi performa. Selama maintenance, platform tidak dapat diakses. Semua transaksi yang sedang berjalan akan di-pause dan dilanjutkan otomatis setelah maintenance selesai. Kami mohon maaf atas ketidaknyamanan ini. Sebagai kompensasi, semua pengguna akan mendapat bonus wallet balance Rp 10.000 dan free premium listing selama 3 hari. Terima kasih atas pengertiannya!",
        author: "Admin NXE",
        thumbnail: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        images: [
          "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
          "https://images.unsplash.com/photo-1563013544-824ae1b704d3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
        ],
        isPinned: false,
        isPublished: true,
        category: "maintenance",
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
      },
      {
        title: "Honkai: Star Rail - Karakter Baru Argenti dan Hanya Hadir di Banner 2.6",
        content: "HoYoverse mengumumkan karakter limited 5-star baru untuk Honkai: Star Rail bernama Argenti, seorang karakter Physical Erudition dengan damage AoE yang sangat besar. Banner Argenti akan hadir bersamaan dengan rerun Jingliu di patch 2.6 yang dimulai 15 November. Argenti memiliki ultimate yang dapat di-charge untuk damage ekstra dan synergy yang baik dengan karakter buffer seperti Bronya dan Tingyun. Light cone signature-nya 'An Instant Before A Gaze' memberikan bonus crit damage hingga 40%. Event 'Cosmic Chronicles' di patch ini juga memberikan stellar jade gratis untuk 10 pulls guaranteed.",
        author: "NXE RPG Desk",
        thumbnail: "https://images.unsplash.com/photo-1614294148960-9aa740632a87?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        images: [
          "https://images.unsplash.com/photo-1614294148960-9aa740632a87?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
          "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
        ],
        isPinned: false,
        isPublished: true,
        category: "update",
        createdAt: new Date(Date.now() - 36 * 60 * 60 * 1000) // 1.5 days ago
      },
      {
        title: "Tips Aman Transaksi Gaming Account: Hindari Penipuan dan Akun Palsu",
        content: "Dalam dunia jual-beli akun gaming, keamanan adalah prioritas utama. Berikut tips penting: 1) Selalu gunakan platform marketplace terpercaya dengan sistem escrow seperti NubiluXchange, 2) Verifikasi identitas penjual dan cek rating/review mereka, 3) Minta screenshot detail akun termasuk history dan achievements, 4) Jangan transfer uang langsung tanpa perlindungan, 5) Ganti password dan email segera setelah terima akun, 6) Aktifkan 2FA untuk keamanan ekstra, 7) Waspadai harga yang terlalu murah (kemungkinan scam), 8) Gunakan payment method yang aman dan traceable. NubiluXchange menyediakan sistem escrow dan AI verification untuk melindungi pembeli dan penjual.",
        author: "Tim Keamanan NXE",
        thumbnail: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        images: [
          "https://images.unsplash.com/photo-1563013544-824ae1b704d3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
          "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
          "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
        ],
        isPinned: false,
        isPublished: true,
        category: "general",
        createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000) // 2 days ago
      },
      {
        title: "League of Legends Wild Rift: Patch 4.4 Nerf Kassadin dan Buff Janna",
        content: "Riot Games merilis patch notes 4.4 untuk Wild Rift dengan balance changes yang signifikan. Kassadin yang terlalu dominan di high elo mendapat nerf pada base damage ultimate dan cooldown. Sementara Janna mendapat buff untuk shield strength dan movement speed bonus. Patch ini juga memperkenalkan skin legendaris baru 'Cosmic Jhin' dengan animasi skill yang menakjubkan. Event 'Wild Pass Season 14' dimulai dengan rewards eksklusif termasuk pose, emote, dan recall animation. Meta jungle diprediksi akan bergeser ke arah tank champion seperti Rammus dan Malphite setelah patch ini.",
        author: "NXE MOBA Analysis",
        thumbnail: "https://images.unsplash.com/photo-1556438064-2d7646166914?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        images: [
          "https://images.unsplash.com/photo-1556438064-2d7646166914?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
          "https://images.unsplash.com/photo-1542751371-adc38448a05e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
        ],
        isPinned: false,
        isPublished: true,
        category: "update",
        createdAt: new Date(Date.now() - 60 * 60 * 60 * 1000) // 2.5 days ago
      },
      {
        title: "NubiluXchange Raih Penghargaan 'Best Gaming Marketplace 2025' dari Indonesia Game Awards",
        content: "Kami dengan bangga mengumumkan bahwa NubiluXchange telah menerima penghargaan 'Best Gaming Marketplace 2025' dari Indonesia Game Awards. Penghargaan ini diberikan berdasarkan voting dari 50.000+ gamers Indonesia dan penilaian dari panel juri profesional industri gaming. NubiluXchange dipilih karena sistem keamanan yang inovatif, user experience yang excellent, dan komitmen dalam melindungi transaksi gaming. Terima kasih kepada seluruh pengguna setia yang telah mempercayai platform kami. Sebagai bentuk apresiasi, kami mengadakan special promo dengan diskon fee transaksi 50% selama sebulan penuh!",
        author: "CEO NubiluXchange",
        thumbnail: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        images: [
          "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
          "https://images.unsplash.com/photo-1563013544-824ae1b704d3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
          "https://images.unsplash.com/photo-1560253023-3ec5d502959f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
        ],
        isPinned: false,
        isPublished: true,
        category: "general",
        createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000) // 3 days ago
      }
    ]).returning();

    logInfo("Database seeded successfully!", { context: 'seedDatabase' });
    logInfo(`Created ${sampleUsers.length} users`, { context: 'seedDatabase' });
    logInfo(`Created ${sampleProducts.length} products`, { context: 'seedDatabase' });
    logInfo(`Created ${sampleChats.length} chats with sample conversations including AI interactions`, { context: 'seedDatabase' });
    logInfo(`Created ${sampleNews.length} gaming news items`, { context: 'seedDatabase' });
    
  } catch (error) {
    logError(error, 'seedDatabase');
  }
}