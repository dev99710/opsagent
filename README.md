# OpsAgent

> AI agent for small business operations — built for the
> Google Cloud Rapid Agent Hackathon 2026 (MongoDB Track)

[Live Demo](https://opsagent-lac.vercel.app) ·
[Landing Page](https://opsagent-landing-page.vercel.app) ·
[Devpost](https://devpost.com)

## What is OpsAgent?

OpsAgent is an AI-powered operations assistant that lets small business owners manage their entire business through natural language. Ask about inventory, orders, appointments — in plain English — and get structured answers powered by Google Gemini and the MongoDB MCP server.

## Features

- 💬 **Natural Language Agent** — Ask anything in plain English
- 📦 **Inventory Management** — 50+ items with visual stock tracking
- 📋 **Orders Kanban** — Drag-and-drop order management
- 📅 **Appointments Calendar** — Week-view scheduling
- 📊 **Business Analytics** — Revenue, stock, and category insights
- ⚡ **MongoDB MCP Integration** — Agent uses Model Context Protocol to read/write Atlas data with full tool transparency

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React.js, Tailwind CSS, Framer Motion, Recharts |
| Backend | Node.js, Express, MongoDB MCP Server |
| Database | MongoDB Atlas |
| AI | Google Gemini API |
| Deployment | Vercel (frontend) + Render (backend) |

## Architecture

```
User → React Frontend → Express Backend → Gemini API
                                       → MongoDB MCP → MongoDB Atlas
```

The agent receives natural language input, Gemini decides which MCP tool to call, the MCP server executes the query against MongoDB Atlas, and the response flows back as structured data.

## Run Locally

Clone the repo:

```bash
git clone https://github.com/chavda-dev/opsagent.git
cd opsagent
```

Install dependencies:

```bash
cd client && npm install
cd ../server && npm install
```

Create `.env` in `/server` with:

```env
MONGODB_URI=your_mongo_atlas_uri
GEMINI_API_KEY=your_gemini_key
PORT=5000
```

Run dev servers:

```bash
cd server && npm run dev
cd client && npm run dev
```

## Deployment

- **Frontend:** Vercel (auto-deploys from main branch)
- **Backend:** Render (free tier)
- **Database:** MongoDB Atlas (free tier)

## Demo

Watch the 2-minute demo: [YouTube link here after recording]

Try the live app: https://opsagent-lac.vercel.app

## Built By

Dev Chavda — [github.com/chavda-dev](https://github.com/chavda-dev)

## License

MIT
