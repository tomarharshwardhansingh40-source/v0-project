import { Router } from "express";
import mongoose from "mongoose";

const router = Router();

router.get("/", (_req, res) => {
  const ready = mongoose.connection.readyState === 1;
  if (!ready) {
    return res.status(503).json({ ok: false, db: "disconnected" });
  }
  return res.status(200).json({ ok: true, db: "connected" });
});

export default router;
