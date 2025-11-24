import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from '../shared/schema';
import { statusUpdates } from '../shared/schema';

// Configure WebSocket with SSL certificate handling
neonConfig.poolQueryViaFetch = true;

class CustomWebSocket extends ws {
  constructor(url: string | URL, protocols?: string | string[], options?: any) {
    const wsOptions = {
      ...(options || {}),
      rejectUnauthorized: false
    };
    super(url as any, protocols as any, wsOptions);
  }
}

neonConfig.webSocketConstructor = CustomWebSocket;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const db = drizzle({ client: pool, schema });

// Sample status data for each user
const statusTemplates = [
  // Text statuses
  {
    content: "🎮 Just won 10 games in a row! Epic day!",
    description: "Feeling unstoppable today",
    mediaType: "text",
    backgroundColor: "#10B981", // green
    duration: 15,
  },
  {
    content: "💎 New skins arrived! Check them out!",
    description: "Fresh items in store",
    mediaType: "text",
    backgroundColor: "#3B82F6", // blue
    duration: 15,
  },
  {
    content: "🔥 Pro tips coming soon... Stay tuned!",
    description: "Sharing gaming secrets",
    mediaType: "text",
    backgroundColor: "#EF4444", // red
    duration: 15,
  },
  // Image statuses
  {
    content: "Check out my new setup!",
    description: "Gaming setup goals 🎯",
    images: ["https://picsum.photos/seed/gaming1/800/1200", "https://picsum.photos/seed/gaming2/800/1200"],
    mediaType: "carousel",
    duration: 15,
  },
  {
    content: "Epic victory screenshot!",
    description: "That feeling when you clutch 🏆",
    images: ["https://picsum.photos/seed/victory/800/1200"],
    mediaType: "image",
    duration: 15,
  },
  {
    content: "New account showcase",
    description: "Check out these legendary skins! 💫",
    images: [
      "https://picsum.photos/seed/skin1/800/1200",
      "https://picsum.photos/seed/skin2/800/1200",
      "https://picsum.photos/seed/skin3/800/1200"
    ],
    mediaType: "carousel",
    duration: 15,
  },
];

async function seedStatusData() {
  try {
    console.log('🌱 Starting status data seeding...');
    
    // Get all users
    const users = await db.select().from(schema.users).limit(10);
    console.log(`📊 Found ${users.length} users in database`);
    
    if (users.length === 0) {
      console.log('❌ No users found. Please create users first.');
      await pool.end();
      return;
    }
    
    // Calculate expiry time (24 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    
    let totalCreated = 0;
    
    // Create 3 statuses for each user
    for (const user of users) {
      console.log(`\n👤 Creating statuses for user: ${user.username} (ID: ${user.id})`);
      
      // Select 3 random status templates for this user
      const shuffled = [...statusTemplates].sort(() => Math.random() - 0.5);
      const selectedTemplates = shuffled.slice(0, 3);
      
      for (let i = 0; i < selectedTemplates.length; i++) {
        const template = selectedTemplates[i];
        
        const statusData = {
          userId: user.id,
          content: template.content,
          description: template.description,
          mediaType: template.mediaType,
          backgroundColor: template.backgroundColor || null,
          images: template.images || [],
          media: null,
          duration: template.duration,
          isPublic: true,
          viewCount: 0,
          expiresAt: expiresAt,
          stickers: [],
          textOverlays: [],
        };
        
        await db.insert(statusUpdates).values(statusData);
        totalCreated++;
        console.log(`  ✅ Created status ${i + 1}/3: ${template.mediaType} - "${template.content}"`);
      }
    }
    
    console.log(`\n✨ Successfully created ${totalCreated} status updates!`);
    console.log(`⏰ All statuses will expire at: ${expiresAt.toLocaleString()}`);
    
    // Close database connection
    await pool.end();
    console.log('✅ Database connection closed');
    
  } catch (error) {
    console.error('❌ Error seeding status data:', error);
    await pool.end();
    process.exit(1);
  }
}

// Run the seed function
seedStatusData();
