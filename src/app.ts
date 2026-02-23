import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";

const app = express();

// Security
app.use(helmet());
app.use(compression());

app.use(cors());
app.use(express.json());

export default app;
