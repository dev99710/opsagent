import {
  mcpFind,
  mcpCount,
  mcpInsertOne,
  mcpUpdateMany,
  mcpDeleteMany,
} from '../mcp/tools.js';

export async function executePlan(plan) {
  const col = plan.collection;
  const p = plan.parameters || {};

  switch (plan.intent) {
    case 'read': {
      const filter = buildFilter(p);
      const limit = p.limit ? parseInt(p.limit) : 100;
      return await mcpFind(col, filter, limit);
    }

    case 'create': {
      const doc = buildDoc(p);
      return await mcpInsertOne(col, doc);
    }

    case 'update': {
      const filter = await resolveExactName(col, buildFilter(p.filter || {}));
      const updateFields = { ...(p.update || {}), updatedAt: new Date().toISOString() };
      return await mcpUpdateMany(col, filter, { $set: updateFields });
    }

    case 'delete': {
      const filter = await resolveExactName(col, buildFilter(p.filter || p));
      return await mcpDeleteMany(col, filter);
    }

    case 'summary': {
      const [total, { docs: recent }] = await Promise.all([
        mcpCount(col),
        mcpFind(col, {}, 5, { createdAt: -1 }),
      ]);

      if (col === 'inventory') {
        const lowStock = await mcpCount(col, { quantity: { $lt: 10 } });
        return { total, lowStock, recent };
      }
      if (col === 'orders') {
        const [pending, completed] = await Promise.all([
          mcpCount(col, { status: 'pending' }),
          mcpCount(col, { status: 'completed' }),
        ]);
        return { total, pending, completed, recent };
      }
      if (col === 'appointments') {
        const scheduled = await mcpCount(col, { status: 'scheduled' });
        return { total, scheduled, recent };
      }
      return { total, recent };
    }

    default:
      throw new Error(`Unknown intent: "${plan.intent}"`);
  }
}

function buildFilter(params) {
  const filter = {};
  for (const [key, value] of Object.entries(params)) {
    if (key === 'limit') continue;
    if (typeof value === 'string' && /[*?]/.test(value)) {
      filter[key] = { $regex: value.replace(/\*/g, '.*').replace(/\?/g, '.'), $options: 'i' };
    } else {
      filter[key] = value;
    }
  }
  return filter;
}

// For update/delete: resolve a name string to the exact stored name via a
// case-insensitive find, so the MCP mutation tools never see a $regex filter.
async function resolveExactName(col, filter) {
  if (!filter.name || typeof filter.name !== 'string') return filter;
  const { docs } = await mcpFind(col, { name: { $regex: filter.name, $options: 'i' } }, 1);
  if (!docs.length) return filter;
  return { ...filter, name: docs[0].name };
}

function buildDoc(params) {
  const doc = {};
  for (const [key, value] of Object.entries(params)) {
    if (key === 'limit') continue;
    doc[key] = value;
  }
  doc.createdAt = new Date().toISOString();
  return doc;
}
