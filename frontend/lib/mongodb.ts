import mongoose from "mongoose";

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  var mongoose: MongooseCache | undefined;
}

const cached = global.mongoose ?? (global.mongoose = { conn: null, promise: null });

export async function connectToDatabase() {
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    throw new Error("Vui lòng định nghĩa biến MONGODB_URI");
  }

  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI).then((mongoose) => mongoose);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
