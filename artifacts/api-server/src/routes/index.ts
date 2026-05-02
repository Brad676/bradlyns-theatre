import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import userRouter from "./user";
import proxyRouter from "./proxy";
import roomsRouter from "./rooms";
import musicRouter from "./music";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(userRouter);
router.use(proxyRouter);
router.use(roomsRouter);
router.use(musicRouter);

export default router;
