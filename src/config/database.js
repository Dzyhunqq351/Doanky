import mongoose from 'mongoose';
mongoose.set('bufferCommands', false);
let connectionPromise = null;

function databaseUri() {
  const uri = process.env.MONGODB_URI;
  if (uri) return uri;
  if (process.env.NODE_ENV === 'production')
    throw new Error('MONGODB_URI chưa được cấu hình trên môi trường production.');
  return 'mongodb://127.0.0.1:27017/playroom';
}

export async function connectDatabase() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (connectionPromise) return connectionPromise;
  connectionPromise = mongoose
    .connect(databaseUri(), {
      serverSelectionTimeoutMS: Number(process.env.MONGODB_TIMEOUT_MS) || 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: Number(process.env.MONGODB_MAX_POOL_SIZE) || 10,
      minPoolSize: 0,
      maxIdleTimeMS: 60000,
    })
    .then(() => {
      connectionPromise = null;
      console.log(`MongoDB connected (${mongoose.connection.name})`);
      return mongoose.connection;
    })
    .catch((error) => {
      connectionPromise = null;
      throw error;
    });
  return connectionPromise;
}
