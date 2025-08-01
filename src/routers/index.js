import { Router } from "express";
import { indigoRouter } from "./indigoRouter.js";

const router = Router()

router.use('/indigo', indigoRouter)




export default router;