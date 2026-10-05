import 'dotenv/config';
import mongoose from 'mongoose';

const uri = process.env.MONGODB_AUDIT_URI || process.env.MONGODB_URI;
if (!uri) throw new Error('Thiếu MONGODB_AUDIT_URI hoặc MONGODB_URI.');
const connection = await mongoose
  .createConnection(uri, { serverSelectionTimeoutMS: 15000 })
  .asPromise();

try {
  const db = connection.db;
  const collections = (await db.listCollections({}, { nameOnly: true }).toArray()).map(
    (entry) => entry.name,
  );
  const count = async (name) =>
    collections.includes(name) ? db.collection(name).countDocuments() : 0;
  const [users, sessions, matches] = await Promise.all([
    count('users'),
    count('sessions'),
    count('matches'),
  ]);
  const orphanSessions = sessions
    ? await db
        .collection('sessions')
        .aggregate([
          { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'owner' } },
          { $match: { owner: { $size: 0 } } },
          { $count: 'count' },
        ])
        .toArray()
    : [];
  const orphanMatches = matches
    ? await db
        .collection('matches')
        .aggregate([
          { $lookup: { from: 'users', localField: 'accountId', foreignField: '_id', as: 'owner' } },
          { $match: { owner: { $size: 0 } } },
          { $count: 'count' },
        ])
        .toArray()
    : [];
  const byGame = matches
    ? await db
        .collection('matches')
        .aggregate([{ $group: { _id: '$game', count: { $sum: 1 } } }, { $sort: { _id: 1 } }])
        .toArray()
    : [];
  console.log(
    JSON.stringify({
      database: db.databaseName,
      documents: { users, sessions, matches },
      orphanSessions: orphanSessions[0]?.count || 0,
      orphanMatches: orphanMatches[0]?.count || 0,
      matchesByGame: Object.fromEntries(byGame.map((row) => [row._id, row.count])),
    }),
  );
} finally {
  await connection.close();
}
