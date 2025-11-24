import { Router } from "express";
import { db } from "../db";
import { regionalSettings } from "@shared/schema";
import { eq } from "drizzle-orm";
import { insertRegionalSettingsSchema } from "@shared/schema";

const router = Router();

// Get regional settings for current user
router.get("/", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Tidak terautentikasi" });
    }

    let settings = await db.query.regionalSettings.findFirst({
      where: eq(regionalSettings.userId, req.user.id),
    });

    // Create default settings if not exists
    if (!settings) {
      const [newSettings] = await db.insert(regionalSettings).values({
        userId: req.user.id,
      }).returning();
      settings = newSettings;
    }

    res.json(settings);
  } catch (error) {
    console.error("Error fetching regional settings:", error);
    res.status(500).json({ error: "Gagal mengambil pengaturan regional" });
  }
});

// Update regional settings
router.put("/", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Tidak terautentikasi" });
    }

    const validatedData = insertRegionalSettingsSchema.parse({
      ...req.body,
      userId: req.user.id,
    });

    // Check if settings exist
    const existingSettings = await db.query.regionalSettings.findFirst({
      where: eq(regionalSettings.userId, req.user.id),
    });

    let updatedSettings;
    if (existingSettings) {
      [updatedSettings] = await db
        .update(regionalSettings)
        .set({
          ...validatedData,
          updatedAt: new Date(),
        })
        .where(eq(regionalSettings.userId, req.user.id))
        .returning();
    } else {
      [updatedSettings] = await db
        .insert(regionalSettings)
        .values(validatedData)
        .returning();
    }

    res.json(updatedSettings);
  } catch (error) {
    console.error("Error updating regional settings:", error);
    res.status(500).json({ error: "Gagal memperbarui pengaturan regional" });
  }
});

export default router;
