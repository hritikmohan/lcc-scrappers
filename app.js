import express from "express";
import cors from "cors";
import router from "./src/routers/index.js"

const app = express();

// app.use() is used to add middlewares or configurations
app.use(cors({
    origin: "*",
    credentials: true
}))

app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"}))


// router declaration
app.use("/api/v1/lcc-scrappers", router)



export { app }