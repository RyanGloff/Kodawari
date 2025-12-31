import { Router } from "express";

import TaskRouter from "./TaskRouter.js";
import TagRouter from "./TagRouter.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.use(authenticate);
router.use("/tag", TagRouter);
router.use("/task", TaskRouter);

export default router;
