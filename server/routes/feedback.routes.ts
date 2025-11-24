import { Router } from "express";
import { db } from "../db";
import { userFeedback } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { insertUserFeedbackSchema } from "@shared/schema";

const router = Router();

// Get feedback history for current user
router.get("/", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Tidak terautentikasi" });
    }

    const feedback = await db.query.userFeedback.findMany({
      where: eq(userFeedback.userId, req.user.id),
      orderBy: [desc(userFeedback.createdAt)],
      limit: 10,
    });

    res.json(feedback);
  } catch (error) {
    console.error("Error fetching feedback:", error);
    res.status(500).json({ error: "Gagal mengambil riwayat feedback" });
  }
});

// Submit new feedback
router.post("/", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Tidak terautentikasi" });
    }

    const validatedData = insertUserFeedbackSchema.parse({
      ...req.body,
      userId: req.user.id,
      status: "pending",
    });

    const [feedback] = await db.insert(userFeedback).values(validatedData).returning();
    res.json(feedback);
  } catch (error) {
    console.error("Error submitting feedback:", error);
    res.status(500).json({ error: "Gagal mengirim feedback" });
  }
});

// Get feedback by ID (for admin/owner)
router.get("/:id", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Tidak terautentikasi" });
    }

    const feedbackId = parseInt(req.params.id);
    const feedback = await db.query.userFeedback.findFirst({
      where: eq(userFeedback.id, feedbackId),
    });

    if (!feedback) {
      return res.status(404).json({ error: "Feedback tidak ditemukan" });
    }

    // Only allow user to see their own feedback, or admin/owner to see all
    if (feedback.userId !== req.user.id && req.user.role !== "admin" && req.user.role !== "owner") {
      return res.status(403).json({ error: "Tidak memiliki akses" });
    }

    res.json(feedback);
  } catch (error) {
    console.error("Error fetching feedback:", error);
    res.status(500).json({ error: "Gagal mengambil feedback" });
  }
});

export default router;
