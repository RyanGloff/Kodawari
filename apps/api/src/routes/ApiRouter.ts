import { Router } from "express";

import TaskRouter from "./TaskRouter.js";
import TagRouter from "./TagRouter.js";

const router = Router();

router.use("/tag", TagRouter);
router.use("/task", TaskRouter);

export default router;
