import { Router } from "express";
import { db } from "../db";
import { paymentMethods } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { insertPaymentMethodSchema } from "@shared/schema";

const router = Router();

// Get all payment methods for current user
router.get("/", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Tidak terautentikasi" });
    }

    const methods = await db.query.paymentMethods.findMany({
      where: eq(paymentMethods.userId, req.user.id),
      orderBy: (table, { desc }) => [desc(table.isDefault), desc(table.createdAt)],
    });

    res.json(methods);
  } catch (error) {
    console.error("Error fetching payment methods:", error);
    res.status(500).json({ error: "Gagal mengambil metode pembayaran" });
  }
});

// Add new payment method
router.post("/", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Tidak terautentikasi" });
    }

    const validatedData = insertPaymentMethodSchema.parse({
      ...req.body,
      userId: req.user.id,
    });

    // If this is set as default, unset other defaults
    if (validatedData.isDefault) {
      await db
        .update(paymentMethods)
        .set({ isDefault: false })
        .where(eq(paymentMethods.userId, req.user.id));
    }

    const [method] = await db.insert(paymentMethods).values(validatedData).returning();
    res.json(method);
  } catch (error) {
    console.error("Error adding payment method:", error);
    res.status(500).json({ error: "Gagal menambahkan metode pembayaran" });
  }
});

// Set payment method as default
router.patch("/:id/default", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Tidak terautentikasi" });
    }

    const methodId = parseInt(req.params.id);

    // Verify ownership
    const existing = await db.query.paymentMethods.findFirst({
      where: and(
        eq(paymentMethods.id, methodId),
        eq(paymentMethods.userId, req.user.id)
      ),
    });

    if (!existing) {
      return res.status(404).json({ error: "Metode pembayaran tidak ditemukan" });
    }

    // Unset all other defaults
    await db
      .update(paymentMethods)
      .set({ isDefault: false })
      .where(eq(paymentMethods.userId, req.user.id));

    // Set this as default
    const [updated] = await db
      .update(paymentMethods)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(eq(paymentMethods.id, methodId))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error("Error setting default payment method:", error);
    res.status(500).json({ error: "Gagal mengatur metode pembayaran default" });
  }
});

// Verify payment method
router.patch("/:id/verify", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Tidak terautentikasi" });
    }

    const methodId = parseInt(req.params.id);

    // Verify ownership
    const existing = await db.query.paymentMethods.findFirst({
      where: and(
        eq(paymentMethods.id, methodId),
        eq(paymentMethods.userId, req.user.id)
      ),
    });

    if (!existing) {
      return res.status(404).json({ error: "Metode pembayaran tidak ditemukan" });
    }

    // In real app, this would trigger verification flow (OTP, micro-transaction, etc.)
    const [updated] = await db
      .update(paymentMethods)
      .set({ isVerified: true, updatedAt: new Date() })
      .where(eq(paymentMethods.id, methodId))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error("Error verifying payment method:", error);
    res.status(500).json({ error: "Gagal memverifikasi metode pembayaran" });
  }
});

// Delete payment method
router.delete("/:id", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Tidak terautentikasi" });
    }

    const methodId = parseInt(req.params.id);

    // Verify ownership
    const existing = await db.query.paymentMethods.findFirst({
      where: and(
        eq(paymentMethods.id, methodId),
        eq(paymentMethods.userId, req.user.id)
      ),
    });

    if (!existing) {
      return res.status(404).json({ error: "Metode pembayaran tidak ditemukan" });
    }

    await db.delete(paymentMethods).where(eq(paymentMethods.id, methodId));
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting payment method:", error);
    res.status(500).json({ error: "Gagal menghapus metode pembayaran" });
  }
});

export default router;
