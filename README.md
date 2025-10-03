# Synthesis Topic Test

A web application for exploring and connecting knowledge through AI-powered topic generation and semantic search. This tool helps you discover relationships between ideas by generating topics from text content and finding related entries in your knowledge base.

## Features

- **Random Entry Loading**: Fetch random entries from your knowledge base to explore
- **AI Topic Generation**: Use OpenAI to extract key topics and concepts from text content
- **Recursive Topic Expansion**: Generate subtopics from any topic to build comprehensive topic trees
- **Semantic Search**: Find related entries based on topic similarity
- **Manual Connection Control**: Review search results and selectively join entries
- **Image Support**: Display images from entries and include them in markdown output
- **Markdown Export**: Generate clean markdown documents with all connections for easy copying

## How It Works

1. Load a random entry from your knowledge base
2. Generate topics using AI analysis of the content
3. Expand interesting topics to discover subtopics
4. Search for related entries using selected topics
5. Review search results and join relevant entries
6. Export the complete synthesis as formatted markdown

## Setup

1. Copy your API keys to `.env.local`:
```bash
OPENAI_API_KEY=your_openai_key_here
YCB_API_KEY=your_ycb_api_key_here
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

- Press `R` or click "Get Random Entry" to load a new entry
- Click "Generate Topics" to extract topics using AI
- Use "Expand" buttons to generate subtopics recursively
- Select topics and click "Search Selected" to find related entries
- Review search results and click "Join with Original" for relevant connections
- Copy the generated markdown output to use elsewhere

## Technical Details

Built with Next.js 15, React 19, TypeScript, and Tailwind CSS. Integrates with OpenAI's API for topic generation and a custom knowledge base API for entry management and semantic search.
