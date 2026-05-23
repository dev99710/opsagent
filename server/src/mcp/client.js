import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MCP_SERVER = join(
  __dirname,
  '../../node_modules/@mongodb-js/mongodb-mcp-server/dist/index.js'
);

let mcpClient = null;
let initPromise = null;

export async function getMCPClient() {
  if (mcpClient) return mcpClient;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const rawUri = process.env.MONGODB_URI || '';
    const mcpUri = rawUri.includes('/opsagent')
      ? rawUri
      : rawUri.replace(/\/?\?/, '/opsagent?');

    const transport = new StdioClientTransport({
      command: 'node',
      args: [MCP_SERVER],
      env: {
        ...process.env,
        MDB_MCP_CONNECTION_STRING: mcpUri,
      },
    });

    const client = new Client(
      { name: 'opsagent', version: '1.0.0' },
      { capabilities: {} }
    );

    await client.connect(transport);

    // Explicitly connect to MongoDB so the session is ready before any tool call
    const connectResult = await client.callTool({
      name: 'connect',
      arguments: { connectionStringOrClusterName: mcpUri },
    });
    const connectText = connectResult.content?.[0]?.text ?? '';
    if (connectResult.isError) {
      throw new Error(`MCP MongoDB connect failed: ${connectText}`);
    }
    console.log('MCP MongoDB connected:', connectText.split('\n')[0]);

    mcpClient = client;
    return client;
  })();

  return initPromise;
}

export async function closeMCPClient() {
  if (mcpClient) {
    try { await mcpClient.close(); } catch {}
    mcpClient = null;
    initPromise = null;
  }
}
