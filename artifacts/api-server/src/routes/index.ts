import { Router, type IRouter } from "express";
import healthRouter from "./health";

const router: IRouter = Router();

router.get("/", (_req, res) => {
  res.json({ name: "LazyTopper API", status: "ok" });
});

router.use(healthRouter);

export default router;
