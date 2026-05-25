import { getDB } from '../db/client.js';

const DAILY_LIMIT = 200;

export async function checkDailyLimit(req, res, next) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const col = getDB().collection('usage_stats');

    const result = await col.findOneAndUpdate(
      { date: today },
      { $setOnInsert: { date: today }, $inc: { agent_requests: 1 } },
      { upsert: true, returnDocument: 'before' }
    );

    const countBefore = result?.agent_requests ?? 0;

    if (countBefore >= DAILY_LIMIT) {
      // Undo the increment we just applied
      await col.updateOne({ date: today }, { $inc: { agent_requests: -1 } });
      return res.status(429).json({
        error: 'Daily demo limit reached. The agent will be available again tomorrow.',
      });
    }

    next();
  } catch (err) {
    next(err);
  }
}
