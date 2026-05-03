// Vercel serverless entry — same as app.ts but without pino-http.
// Pino is externalized so Vercel's Node.js runtime loads it from node_modules.
import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import router from "./routes";

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use("/api", router);

export default app;
