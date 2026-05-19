# 🎤 KARAOKE Web Application

A modern, full-stack karaoke application built with NestJS, Next.js, and real-time WebSocket support.

## 🚀 Features

- **YouTube Integration**: Search and add songs from YouTube
- **Real-time Queue**: Live queue updates with WebSocket support
- **Voting System**: Upvote songs to move them up in the queue
- **Comments & Chat**: Real-time chat and song comments
- **Firebase Authentication**: Secure Google sign-in
- **Responsive Design**: Works on desktop and mobile devices

## 🏗️ Architecture

```
├── backend/              # NestJS API Server
│   ├── src/
│   │   ├── auth/        # Authentication & JWT guards
│   │   ├── youtube/     # YouTube API integration
│   │   ├── queue/       # Queue management & WebSocket gateway
│   │   └── prisma/      # Database ORM
│   └── package.json
├── frontend/            # Next.js Frontend
│   ├── src/
│   │   ├── app/         # Pages (home, search, queue, chat)
│   │   ├── components/  # React components
│   │   ├── context/     # Auth context
│   │   └── lib/         # Firebase config
│   └── package.json
└── docker-compose.yml   # PostgreSQL & Redis services
```

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Docker & Docker Compose (for database)
- YouTube API Key (https://console.cloud.google.com)
- Firebase Project (https://console.firebase.google.com)

## 🔧 Setup Instructions

### 1. Clone & Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure Environment Variables

```bash
# Copy template and fill in your values
cp .env.example .env

# Edit .env with your credentials:
# - YOUTUBE_API_KEY: Get from Google Cloud Console
# - Firebase credentials
# - Database URLs
```

### 3. Start Docker Services

```bash
# Start PostgreSQL and Redis
docker-compose up -d

# Verify containers are running
docker-compose ps
```

### 4. Setup Database

```bash
# Run Prisma migrations
cd backend
npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate

# Seed database (optional)
npx prisma db seed
```

### 5. Start Backend

```bash
cd backend
npm run start:dev
# Server runs on http://localhost:3001
```

### 6. Start Frontend

```bash
cd frontend
npm run dev
# Frontend runs on http://localhost:3000
```

## 📚 API Endpoints

### Authentication
- `POST /auth/verify` - Verify Firebase token and get JWT

### YouTube
- `GET /youtube/search` - Search songs by query
- `GET /youtube/video/:id` - Get video details

### Queue
- `GET /queue` - Get current queue state
- `POST /queue/add` - Add video to queue
- `PUT /queue/:videoId/status` - Update video status
- `DELETE /queue/:videoId` - Remove from queue
- `POST /queue/vote` - Vote on a song
- `POST /queue/comment` - Add comment to song
- `GET /queue/:queueItemId/comments` - Get comments

### WebSocket Events
- `queue_initialized` - Initial queue state
- `queue_updated` - Queue changes broadcast
- `vote_added` - Vote updates
- `comment_added` - New comments
- `video_status_changed` - Status changes

## 🗄️ Database Schema

### Users
- id, email, username, firebaseId, role, timestamps

### QueueItems
- id, videoId, title, thumbnail, userId, position, votes, status, timestamps

### Comments
- id, content, userId, queueItemId, timestamps

### Votes
- id, userId, queueItemId, value (1/-1), timestamps

### ChatMessages
- id, content, userId, timestamps

## 🔐 Authentication Flow

1. User signs in with Google via Firebase
2. Firebase returns ID token
3. Frontend sends ID token to `/auth/verify` endpoint
4. Backend verifies token with Firebase Admin SDK
5. Backend creates/syncs user in database
6. Backend returns JWT token
7. Frontend stores JWT and uses for API requests

## 🎯 Key Features Breakdown

### Queue Management
- Users can add songs from YouTube search
- Queue shows position, votes, and added-by information
- Real-time updates via WebSocket
- Support for voting to reorder songs
- Status tracking (QUEUED, PLAYING, COMPLETED, BLOCKED)

### Voting System
- Users can upvote songs
- Each user can only vote once per song
- Vote totals determine song ranking
- Real-time vote updates broadcast to all clients

### Real-time Features
- WebSocket gateway for live updates
- Queue changes broadcast to all connected clients
- Vote and comment updates in real-time
- Live chat system

## 🚢 Deployment

### Docker Setup
```bash
# Build backend image
docker build -t karaoke-backend ./backend

# Build frontend image
docker build -t karaoke-frontend ./frontend

# Run with docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

### Environment for Production
- Set `NODE_ENV=production`
- Use strong JWT_SECRET
- Enable HTTPS
- Configure CORS properly
- Set up SSL certificates

## 📖 Development Tips

### Hot Reload
- Backend: `npm run start:dev` watches for file changes
- Frontend: Next.js hot module replacement enabled

### Database Migrations
```bash
# Create new migration
npx prisma migrate dev --name migration_name

# View migrations
npx prisma migrate status

# Reset database (development only!)
npx prisma migrate reset
```

### Debugging
- Backend: NestJS logger in console
- Frontend: React Developer Tools extension
- Database: `npx prisma studio` for GUI

## 🐛 Troubleshooting

### Database Connection Error
- Ensure PostgreSQL is running: `docker-compose ps`
- Check DATABASE_URL in .env
- Verify port 5432 is not in use

### YouTube API Not Working
- Verify API key in .env
- Check YouTube API is enabled in Google Cloud Console
- Verify API quota

### Authentication Failing
- Check Firebase credentials in .env
- Verify Firebase project is set up correctly
- Check CORS settings for frontend URL

### Real-time Updates Not Working
- Ensure Redis is running: `docker-compose ps`
- Check WebSocket connection in browser DevTools
- Verify FRONTEND_URL in .env matches actual frontend URL

## 📝 TODO/Future Improvements

- [ ] Admin dashboard for analytics
- [ ] Song history and statistics
- [ ] User profiles and favorites
- [ ] Playlist creation
- [ ] Mobile app (React Native)
- [ ] Integration with Spotify
- [ ] Video playback integration
- [ ] Multi-room support

## 📄 License

MIT

## 👥 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🤝 Support

For issues or questions, please open an issue on the GitHub repository.
