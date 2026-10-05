import 'dotenv/config';
import mongoose from 'mongoose';

const sourceUri = process.env.MONGODB_SOURCE_URI || 'mongodb://127.0.0.1:27017/playroom';
const targetUri = process.env.MONGODB_URI;

if (!targetUri) throw new Error('Thiếu MONGODB_URI của Atlas.');
if (sourceUri === targetUri) throw new Error('Database nguồn và đích đang giống nhau.');

const source = await mongoose
  .createConnection(sourceUri, { serverSelectionTimeoutMS: 5000 })
  .asPromise();
const target = await mongoose
  .createConnection(targetUri, { serverSelectionTimeoutMS: 15000, maxPoolSize: 5 })
  .asPromise();

try {
  const sourceUsers = await source.db
    .collection('users')
    .find({}, { projection: { _id: 1 } })
    .toArray();
  const validUserIds = sourceUsers.map((user) => user._id);
  const collections = [
    ['users', {}],
    ['sessions', { userId: { $in: validUserIds }, expiresAt: { $gt: new Date() } }],
    ['matches', { accountId: { $in: validUserIds } }],
  ];
  const copied = {};
  for (const [name, filter] of collections) {
    const documents = await source.db.collection(name).find(filter).toArray();
    if (documents.length)
      await target.db.collection(name).bulkWrite(
        documents.map((document) => ({
          replaceOne: {
            filter: { _id: document._id },
            replacement: document,
            upsert: true,
          },
        })),
        { ordered: false },
      );
    copied[name] = documents.length;
  }

  // Remove only orphan documents that also exist in the local source. This cleans old
  // development data without touching records created directly on Atlas.
  const sourceOrphanMatches = await source.db
    .collection('matches')
    .find({ accountId: { $nin: validUserIds } }, { projection: { _id: 1 } })
    .toArray();
  const sourceOrphanSessions = await source.db
    .collection('sessions')
    .find({ userId: { $nin: validUserIds } }, { projection: { _id: 1 } })
    .toArray();
  const cleaned = {
    matches: sourceOrphanMatches.length
      ? (
          await target.db.collection('matches').deleteMany({
            _id: { $in: sourceOrphanMatches.map((document) => document._id) },
          })
        ).deletedCount
      : 0,
    sessions: sourceOrphanSessions.length
      ? (
          await target.db.collection('sessions').deleteMany({
            _id: { $in: sourceOrphanSessions.map((document) => document._id) },
          })
        ).deletedCount
      : 0,
  };

  const atlasCounts = {};
  for (const name of ['users', 'sessions', 'matches'])
    atlasCounts[name] = await target.db.collection(name).countDocuments();
  const orphanMatches = await target.db
    .collection('matches')
    .aggregate([
      { $lookup: { from: 'users', localField: 'accountId', foreignField: '_id', as: 'owner' } },
      { $match: { owner: { $size: 0 } } },
      { $count: 'count' },
    ])
    .toArray();

  console.log(
    JSON.stringify({
      ok: true,
      copied,
      cleaned,
      atlasCounts,
      orphanMatches: orphanMatches[0]?.count || 0,
    }),
  );
} finally {
  await Promise.all([source.close(), target.close()]);
}
