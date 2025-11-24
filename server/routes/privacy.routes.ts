import { Router } from "express";
import { db } from "../db";
import { privacySettings, blockedUsers, users } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { insertPrivacySettingsSchema, insertBlockedUserSchema } from "@shared/schema";

const router = Router();

// Get privacy settings for current user
router.get("/settings", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Tidak terautentikasi" });
    }

    let settings = await db.query.privacySettings.findFirst({
      where: eq(privacySettings.userId, req.user.id),
    });

    // Create default settings if not exists
    if (!settings) {
      const [newSettings] = await db.insert(privacySettings).values({
        userId: req.user.id,
      }).returning();
      settings = newSettings;
    }

    res.json(settings);
  } catch (error) {
    console.error("Error fetching privacy settings:", error);
    res.status(500).json({ error: "Gagal mengambil pengaturan privasi" });
  }
});

// Update privacy settings
router.put("/settings", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Tidak terautentikasi" });
    }

    const validatedData = insertPrivacySettingsSchema.parse({
      ...req.body,
      userId: req.user.id,
    });

    // Check if settings exist
    const existingSettings = await db.query.privacySettings.findFirst({
      where: eq(privacySettings.userId, req.user.id),
    });

    let updatedSettings;
    if (existingSettings) {
      [updatedSettings] = await db
        .update(privacySettings)
        .set({
          ...validatedData,
          updatedAt: new Date(),
        })
        .where(eq(privacySettings.userId, req.user.id))
        .returning();
    } else {
      [updatedSettings] = await db
        .insert(privacySettings)
        .values(validatedData)
        .returning();
    }

    res.json(updatedSettings);
  } catch (error) {
    console.error("Error updating privacy settings:", error);
    res.status(500).json({ error: "Gagal memperbarui pengaturan privasi" });
  }
});

// Get blocked users list
router.get("/blocked", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Tidak terautentikasi" });
    }

    const blocked = await db
      .select({
        id: blockedUsers.id,
        blockedId: blockedUsers.blockedId,
        reason: blockedUsers.reason,
        createdAt: blockedUsers.createdAt,
        username: users.username,
        displayName: users.displayName,
        profilePicture: users.profilePicture,
      })
      .from(blockedUsers)
      .leftJoin(users, eq(blockedUsers.blockedId, users.id))
      .where(eq(blockedUsers.blockerId, req.user.id));

    res.json(blocked);
  } catch (error) {
    console.error("Error fetching blocked users:", error);
    res.status(500).json({ error: "Gagal mengambil daftar pengguna yang diblokir" });
  }
});

// Block a user
router.post("/blocked", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Tidak terautentikasi" });
    }

    const validatedData = insertBlockedUserSchema.parse({
      ...req.body,
      blockerId: req.user.id,
    });

    // Prevent blocking yourself
    if (validatedData.blockedId === req.user.id) {
      return res.status(400).json({ error: "Tidak dapat memblokir diri sendiri" });
    }

    // Check if already blocked
    const existing = await db.query.blockedUsers.findFirst({
      where: and(
        eq(blockedUsers.blockerId, req.user.id),
        eq(blockedUsers.blockedId, validatedData.blockedId)
      ),
    });

    if (existing) {
      return res.status(400).json({ error: "Pengguna sudah diblokir" });
    }

    const [blocked] = await db.insert(blockedUsers).values(validatedData).returning();
    res.json(blocked);
  } catch (error) {
    console.error("Error blocking user:", error);
    res.status(500).json({ error: "Gagal memblokir pengguna" });
  }
});

// Unblock a user
router.delete("/blocked/:id", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Tidak terautentikasi" });
    }

    const blockId = parseInt(req.params.id);

    // Verify ownership before deleting
    const existing = await db.query.blockedUsers.findFirst({
      where: and(
        eq(blockedUsers.id, blockId),
        eq(blockedUsers.blockerId, req.user.id)
      ),
    });

    if (!existing) {
      return res.status(404).json({ error: "Blokir tidak ditemukan" });
    }

    await db.delete(blockedUsers).where(eq(blockedUsers.id, blockId));
    res.json({ success: true });
  } catch (error) {
    console.error("Error unblocking user:", error);
    res.status(500).json({ error: "Gagal membuka blokir pengguna" });
  }
});

export default router;
