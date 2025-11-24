import { db } from "./db";
import { users, statusUpdates } from "@shared/schema";

// Sample status content for gaming marketplace
const statusTemplates = {
  text: {
    contents: [
      "Just hit Mythic rank! 🎮🔥",
      "Looking for squad mates! Who's online?",
      "Best gaming session ever! 💯",
      "New skins just dropped! Check them out 👀",
      "GG WP! Amazing match today 🏆"
    ],
    colors: ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8"]
  },
  image: {
    images: [
      "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800",
      "https://images.unsplash.com/photo-1556438064-2d7646166914?w=800",
      "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=800",
      "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800",
      "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800"
    ],
    captions: [
      "Epic gaming setup! 🎮✨",
      "New achievement unlocked! 🏆",
      "Squad goals! 💪",
      "Victory royale! 🎉",
      "Gaming vibes tonight 🌙"
    ]
  },
  carousel: {
    imageSets: [
      [
        "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800",
        "https://images.unsplash.com/photo-1556438064-2d7646166914?w=800",
        "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=800"
      ],
      [
        "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800",
        "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800",
        "https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=800"
      ],
      [
        "https://images.unsplash.com/photo-1560253023-3ec5d502959f?w=800",
        "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800",
        "https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=800"
      ]
    ],
    captions: [
      "My gaming collection! Swipe to see more 📸",
      "Today's highlights! 🎮",
      "Check out these epic moments! 💯"
    ]
  }
};

function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getExpiryTime(): Date {
  const now = new Date();
  now.setHours(now.getHours() + 24); // 24 hours from now
  return now;
}

async function seedStatusUpdates() {
  try {
    console.log("🌱 Starting to seed status updates...");

    // Get all users
    const allUsers = await db.select().from(users);
    
    if (allUsers.length === 0) {
      console.log("❌ No users found. Please seed users first.");
      return;
    }

    console.log(`✅ Found ${allUsers.length} users. Creating 3 status updates for each...`);

    // Create 3 status updates for each user
    for (const user of allUsers) {
      const statusesToCreate = [];
      
      // Status 1: Text status
      const textContent = getRandomItem(statusTemplates.text.contents);
      const textColor = getRandomItem(statusTemplates.text.colors);
      statusesToCreate.push({
        userId: user.id,
        content: textContent,
        description: textContent,
        mediaType: "text",
        backgroundColor: textColor,
        duration: 15,
        isPublic: true,
        viewCount: Math.floor(Math.random() * 50),
        expiresAt: getExpiryTime()
      });

      // Status 2: Single image
      const imageUrl = getRandomItem(statusTemplates.image.images);
      const imageCaption = getRandomItem(statusTemplates.image.captions);
      statusesToCreate.push({
        userId: user.id,
        content: imageCaption,
        description: imageCaption,
        media: imageUrl,
        mediaType: "image",
        duration: 15,
        isPublic: true,
        viewCount: Math.floor(Math.random() * 100),
        expiresAt: getExpiryTime()
      });

      // Status 3: Carousel (multiple images)
      const carouselImages = getRandomItem(statusTemplates.carousel.imageSets);
      const carouselCaption = getRandomItem(statusTemplates.carousel.captions);
      statusesToCreate.push({
        userId: user.id,
        content: carouselCaption,
        description: carouselCaption,
        images: carouselImages,
        mediaType: "carousel",
        duration: 15,
        isPublic: true,
        viewCount: Math.floor(Math.random() * 75),
        expiresAt: getExpiryTime()
      });

      // Insert all statuses for this user
      await db.insert(statusUpdates).values(statusesToCreate);
      console.log(`✅ Created 3 status updates for user: ${user.username} (ID: ${user.id})`);
    }

    console.log(`\n🎉 Successfully seeded ${allUsers.length * 3} status updates!`);
    
  } catch (error) {
    console.error("❌ Error seeding status updates:", error);
    throw error;
  }
}

// Execute the function
seedStatusUpdates()
  .then(() => {
    console.log("✅ Status updates seeding completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Failed to seed status updates:", error);
    process.exit(1);
  });
