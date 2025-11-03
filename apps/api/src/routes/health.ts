import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
  res.json({ healthy: true, time: Date.now() });
});

export default router;
