import { Router } from "express";
import { getPnrDetails } from "../controllers/indigo/getPnrDetails.js";
import { saveNewUserKey } from "../controllers/indigo/saveNewUserKey.js";


const indigoRouter = Router()

indigoRouter.get("/pnrDetails", getPnrDetails)
indigoRouter.post("/saveNewUserKey", saveNewUserKey)



export {indigoRouter} 