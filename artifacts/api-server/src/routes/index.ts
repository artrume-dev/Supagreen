import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import profileRouter from "./profile";
import recipesRouter from "./recipes";
import shoppingRouter from "./shopping";
import streaksRouter from "./streaks";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(profileRouter);
router.use(recipesRouter);
router.use(shoppingRouter);
router.use(streaksRouter);

export default router;
