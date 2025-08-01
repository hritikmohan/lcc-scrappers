import http from "http";
import dotenv from "dotenv";
import { app } from "./app.js";

dotenv.config({ path: ".env" });

const server = http.createServer(app);

server.listen(process.env.PORT || 3000, () => {
  console.log(`Server is running on port: ${process.env.PORT}`);
});
