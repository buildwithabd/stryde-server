import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      throw new Error("MONGO_URI environment variable is not defined");
    }
    const conn = await mongoose.connect(uri);
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unknown MongoDB connection error";
    console.error(`❌ MongoDB error: ${message}`);
    process.exit(1);
  }
};
process.on("SIGINT", async () => {
  await mongoose.connection.close();
  process.exit(0);
});

export default connectDB;
