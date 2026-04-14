import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { authMiddleware } from "./middlewares/authMiddleware";
import router from "./routes";
import { webhookHandler } from "./routes/billing";

const app: Express = express();

// Expo Go + ngrok can surface 304 responses that break JSON-only mobile fetch paths.
// Disable ETag so API consistently returns full 200 JSON payloads in development.
app.set("etag", false);

app.use(cors({ credentials: true, origin: true }));
app.use(cookieParser());

// Stripe webhook needs the raw body before express.json() parses it
app.post("/api/billing/webhook", express.raw({ type: "application/json" }), webhookHandler);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(authMiddleware);

app.use("/api", router);

export default app;
