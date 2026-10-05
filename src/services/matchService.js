import mongoose from 'mongoose';
import Match from '../models/Match.js';
export async function persistMatch(match) {
  if (mongoose.connection.readyState !== 1) return false;
  try {
    await Match.updateOne(
      { matchId: match.matchId, accountId: match.accountId },
      { $setOnInsert: match },
      { upsert: true, runValidators: true },
    );
    return true;
  } catch (error) {
    if (error.code === 11000) return true;
    console.error('Cannot persist match:', error.message);
    return false;
  }
}
