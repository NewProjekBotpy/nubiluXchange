import { Router } from "express";
import { db } from "../db";
import { platformConnections } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { insertPlatformConnectionSchema } from "@shared/schema";

const router = Router();

// Get all platform connections for current user
router.get("/", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Tidak terautentikasi" });
    }

    const connections = await db.query.platformConnections.findMany({
      where: eq(platformConnections.userId, req.user.id),
      orderBy: (table, { desc }) => [desc(table.createdAt)],
    });

    // Don't expose tokens to frontend
    const safeConnections = connections.map((conn: any) => ({
      ...conn,
      accessToken: undefined,
      refreshToken: undefined,
    }));

    res.json(safeConnections);
  } catch (error) {
    console.error("Error fetching platform connections:", error);
    res.status(500).json({ error: "Gagal mengambil koneksi platform" });
  }
});

// Connect a platform
router.post("/", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Tidak terautentikasi" });
    }

    const validatedData = insertPlatformConnectionSchema.parse({
      ...req.body,
      userId: req.user.id,
    });

    // Check if already connected
    const existing = await db.query.platformConnections.findFirst({
      where: and(
        eq(platformConnections.userId, req.user.id),
        eq(platformConnections.platformId, validatedData.platformId)
      ),
    });

    if (existing) {
      return res.status(400).json({ error: "Platform sudah terhubung" });
    }

    // In real app, this would handle OAuth flow
    const [connection] = await db.insert(platformConnections).values(validatedData).returning();

    // Don't expose tokens
    const safeConnection = {
      ...connection,
      accessToken: undefined,
      refreshToken: undefined,
    };

    res.json(safeConnection);
  } catch (error) {
    console.error("Error connecting platform:", error);
    res.status(500).json({ error: "Gagal menghubungkan platform" });
  }
});

// Disconnect a platform
router.delete("/:id", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Tidak terautentikasi" });
    }

    const connectionId = parseInt(req.params.id);

    // Verify ownership
    const existing = await db.query.platformConnections.findFirst({
      where: and(
        eq(platformConnections.id, connectionId),
        eq(platformConnections.userId, req.user.id)
      ),
    });

    if (!existing) {
      return res.status(404).json({ error: "Koneksi platform tidak ditemukan" });
    }

    await db.delete(platformConnections).where(eq(platformConnections.id, connectionId));
    res.json({ success: true });
  } catch (error) {
    console.error("Error disconnecting platform:", error);
    res.status(500).json({ error: "Gagal memutuskan koneksi platform" });
  }
});

// Sync platform data
router.post("/:id/sync", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Tidak terautentikasi" });
    }

    const connectionId = parseInt(req.params.id);

    // Verify ownership
    const existing = await db.query.platformConnections.findFirst({
      where: and(
        eq(platformConnections.id, connectionId),
        eq(platformConnections.userId, req.user.id)
      ),
    });

    if (!existing) {
      return res.status(404).json({ error: "Koneksi platform tidak ditemukan" });
    }

    // In real app, this would sync data from the platform
    const [updated] = await db
      .update(platformConnections)
      .set({ 
        lastSyncAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(platformConnections.id, connectionId))
      .returning();

    // Don't expose tokens
    const safeConnection = {
      ...updated,
      accessToken: undefined,
      refreshToken: undefined,
    };

    res.json(safeConnection);
  } catch (error) {
    console.error("Error syncing platform:", error);
    res.status(500).json({ error: "Gagal menyinkronkan platform" });
  }
});

// Toggle platform active status
router.patch("/:id/toggle", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Tidak terautentikasi" });
    }

    const connectionId = parseInt(req.params.id);

    // Verify ownership
    const existing = await db.query.platformConnections.findFirst({
      where: and(
        eq(platformConnections.id, connectionId),
        eq(platformConnections.userId, req.user.id)
      ),
    });

    if (!existing) {
      return res.status(404).json({ error: "Koneksi platform tidak ditemukan" });
    }

    const [updated] = await db
      .update(platformConnections)
      .set({ 
        isActive: !existing.isActive,
        updatedAt: new Date(),
      })
      .where(eq(platformConnections.id, connectionId))
      .returning();

    // Don't expose tokens
    const safeConnection = {
      ...updated,
      accessToken: undefined,
      refreshToken: undefined,
    };

    res.json(safeConnection);
  } catch (error) {
    console.error("Error toggling platform status:", error);
    res.status(500).json({ error: "Gagal mengubah status platform" });
  }
});

export default router;
