import { Router } from "express";
import mongoose from "mongoose";
import rateLimit from "express-rate-limit";
import { Analysis } from "../models/Analysis.js";
import { ROLE_KEYS } from "../data/roles.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { generateAnalysis } from "../utils/gemini.js";

const router = Router();

const analyzeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip || "anonymous",
  validate: false,
  message: { error: "Too many analysis requests, try again later" },
});

function formatAnalysis(doc) {
  return {
    id: doc._id.toString(),
    targetRole: doc.targetRole,
    currentSkills: doc.currentSkills,
    dailyMinutes: doc.dailyMinutes,
    skillGaps: doc.skillGaps,
    sevenDayRoadmap: doc.sevenDayRoadmap,
    projectRecommendations: doc.projectRecommendations,
    overallAssessment: doc.overallAssessment,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function formatSummary(doc) {
  return {
    id: doc._id.toString(),
    targetRole: doc.targetRole,
    dailyMinutes: doc.dailyMinutes,
    createdAt: doc.createdAt,
    skillGapCount: Array.isArray(doc.skillGaps) ? doc.skillGaps.length : 0,
  };
}

function parseSkills(input) {
  if (Array.isArray(input)) {
    return input
      .map((s) => (typeof s === "string" ? s.trim() : ""))
      .filter(Boolean);
  }
  if (typeof input === "string") {
    return input
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return null;
}

function validateCreateBody(body) {
  const targetRole = typeof body?.targetRole === "string" ? body.targetRole.trim() : "";
  if (!ROLE_KEYS.includes(targetRole)) {
    return { error: "targetRole must be one of the curated roles" };
  }

  const currentSkills = parseSkills(body?.currentSkills);
  if (!currentSkills || currentSkills.length < 1) {
    return { error: "Provide at least one skill" };
  }
  if (currentSkills.length > 30) {
    return { error: "Skills are capped at 30 items" };
  }
  if (currentSkills.some((s) => s.length > 40)) {
    return { error: "Each skill must be 40 characters or fewer" };
  }

  let dailyMinutes = body?.dailyMinutes;
  if (typeof dailyMinutes === "string" && dailyMinutes.trim() !== "") {
    dailyMinutes = Number(dailyMinutes);
  }
  if (typeof dailyMinutes !== "number" || Number.isNaN(dailyMinutes)) {
    return { error: "dailyMinutes must be a number between 15 and 720" };
  }
  if (dailyMinutes < 15 || dailyMinutes > 720) {
    return { error: "dailyMinutes must be between 15 and 720" };
  }

  return { value: { targetRole, currentSkills, dailyMinutes } };
}

router.use(requireAuth);

router.post("/", analyzeLimiter, async (req, res) => {
  try {
    const parsed = validateCreateBody(req.body);
    if (parsed.error) {
      return res.status(400).json({ error: parsed.error });
    }

    let aiResult;
    try {
      aiResult = await generateAnalysis(parsed.value);
    } catch (err) {
      if (err.code === "RATE_LIMIT") {
        return res
          .status(503)
          .json({ error: "The AI service is busy, try again in a minute" });
      }
      if (err.code === "INVALID") {
        return res
          .status(502)
          .json({ error: "The AI returned an unusable answer, please try again" });
      }
      console.error("gemini error", err);
      return res.status(503).json({ error: "AI unavailable" });
    }

    const analysis = await Analysis.create({
      user: req.user.id,
      targetRole: parsed.value.targetRole,
      currentSkills: parsed.value.currentSkills,
      dailyMinutes: parsed.value.dailyMinutes,
      ...aiResult,
    });

    return res.status(201).json({ analysis: formatAnalysis(analysis) });
  } catch (err) {
    console.error("create analysis error", err);
    return res.status(500).json({ error: "Could not create analysis" });
  }
});

router.get("/", async (req, res) => {
  try {
    const analyses = await Analysis.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .select("targetRole dailyMinutes createdAt skillGaps");
    return res.status(200).json({ analyses: analyses.map(formatSummary) });
  } catch (err) {
    console.error("list analyses error", err);
    return res.status(500).json({ error: "Could not load analyses" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid analysis id" });
    }

    const analysis = await Analysis.findOne({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!analysis) {
      return res.status(404).json({ error: "Analysis not found" });
    }
    return res.status(200).json({ analysis: formatAnalysis(analysis) });
  } catch (err) {
    console.error("get analysis error", err);
    return res.status(500).json({ error: "Could not load analysis" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid analysis id" });
    }

    const deleted = await Analysis.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!deleted) {
      return res.status(404).json({ error: "Analysis not found" });
    }
    return res.status(200).json({ message: "Analysis deleted" });
  } catch (err) {
    console.error("delete analysis error", err);
    return res.status(500).json({ error: "Could not delete analysis" });
  }
});

export default router;
