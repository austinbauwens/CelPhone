# Cel Phone

A multiplayer browser-based animation game similar to Gartic Phone, where players draw multiple frames in 3 minutes, then view animations at 4fps.

## Features

- Real-time multiplayer lobbies with room codes
- Configurable frame counts (2, 3, or 4 frames per round)
- Canvas-based drawing interface with tools
- 3-minute timer per round
- Animation playback at 4fps
- Client-side GIF generation and download

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Supabase (PostgreSQL, Realtime, Storage)
- **Drawing**: react-konva + konva
- **GIF Generation**: gif.js

## Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```

3. Set up Supabase:
   - Create a Supabase project
   - Run the migration in `supabase/migrations/001_initial_schema.sql`
   - Create a storage bucket named `frames`
   - See `supabase/README.md` for detailed instructions

4. Configure environment variables:
   - Copy `.env.example` to `.env` (or create `.env` file)
   - Add your Supabase URL and anon key:
     ```
     VITE_SUPABASE_URL=your_supabase_url
     VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## Deployment

The frontend can be deployed to Vercel:

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables in Vercel settings
4. Deploy

## License

MIT

