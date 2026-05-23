import { getMCPClient } from './client.js';

const DB = 'opsagent';

async function callTool(name, args) {
  const client = await getMCPClient();
  const result = await client.callTool({ name, arguments: args });

  if (result.isError) {
    const msg = result.content?.[0]?.text ?? 'Unknown MCP error';
    throw new Error(`MCP tool "${name}" failed: ${msg}`);
  }

  return result.content ?? [];
}

// find/aggregate return: [headerText, doc1Json, doc2Json, ...]
function parseDocs(content) {
  return content
    .slice(1)
    .map(item => {
      try { return JSON.parse(item.text); }
      catch { return null; }
    })
    .filter(Boolean);
}

// "Found 10 documents..." → 10
function parseNumber(text = '') {
  const m = text.match(/\d+/);
  return m ? parseInt(m[0], 10) : 0;
}

// "Deleted `3` documents..." → 3
// "Updated `2` documents..." → 2
function parseBacktickNumber(text = '') {
  const m = text.match(/`(\d+)`/);
  return m ? parseInt(m[1], 10) : 0;
}

export async function mcpFind(collection, filter = {}, limit = 100, sort) {
  const args = { database: DB, collection, filter, limit };
  if (sort) args.sort = sort;
  const content = await callTool('find', args);
  const docs = parseDocs(content);
  return { docs, count: docs.length };
}

export async function mcpCount(collection, query = {}) {
  const content = await callTool('count', { database: DB, collection, query });
  return parseNumber(content[0]?.text);
}

export async function mcpAggregate(collection, pipeline) {
  const content = await callTool('aggregate', { database: DB, collection, pipeline });
  return parseDocs(content);
}

export async function mcpInsertOne(collection, document) {
  const content = await callTool('insert-one', { database: DB, collection, document });
  const text = content[0]?.text ?? '';
  // "Inserted document with ID `<id>` into collection..."
  const m = text.match(/ID `([^`]+)`/);
  return { insertedId: m?.[1] ?? null, doc: document };
}

export async function mcpUpdateMany(collection, filter, update) {
  const content = await callTool('update-many', { database: DB, collection, filter, update });
  const n = parseBacktickNumber(content[0]?.text);
  return { matchedCount: n, modifiedCount: n };
}

export async function mcpDeleteMany(collection, filter) {
  const content = await callTool('delete-many', { database: DB, collection, filter });
  const n = parseBacktickNumber(content[0]?.text);
  return { deletedCount: n };
}
