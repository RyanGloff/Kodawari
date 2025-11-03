import { Router } from "express";

import TaskRouter from "./TaskRouter.js";

const router = Router();

router.use("/task", TaskRouter);

export default router;
