import mongoose from "mongoose";
import app from "./app.js";

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const shutdown = async (signal: string) => {
  console.log(`${signal} received - shutting down gracefully`);
  server.close(async () => {
    console.log("HTTP server closed");

    try {
      await mongoose.disconnect();
      console.log("MongoDB connection closed");
      process.exit(0);
    } catch (err) {
      console.error("Error during MongoDB closure:", err);
      process.exit(1);
    }
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGQUIT", () => shutdown("SIGQUIT"));
process.on("SIGBREAK", () => shutdown("SIGBREAK"));
process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  shutdown("uncaughtException");
});
