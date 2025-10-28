# FairMind - AI-Powered Argument Resolution Platform

## Overview

FairMind is a real-time collaborative web application that helps two people resolve disputes through AI-mediated resolution suggestions. Users can communicate via text or voice in private rooms, and the system generates three AI-powered resolution options based on their conversation. When both participants vote for the same resolution, the dispute is marked as resolved and saved to their history.

The application is built as a full-stack TypeScript project using the MERN stack with real-time WebSocket communication, designed for deployment on Replit.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (October 28, 2025)

**Theme System Implementation**
- Added dark/light mode toggle to all pages (Landing, Login, Register, Dashboard, Room)
- Implemented ThemeProvider using next-themes for theme state management
- Theme preference persists to localStorage (key: "fairmind-theme")
- Created reusable ThemeToggle component with sun/moon icons
- Provider ordering optimized to prevent React hook errors

**UI Enhancements**
- Theme toggle positioned in top-right corner on auth pages (fixed positioning)
- Theme toggle integrated into Dashboard header alongside user menu
- All components support both light and dark modes via Tailwind CSS
- System theme detection with manual override capability

## System Architecture

### Frontend Architecture

**Framework & Build Tools**
- React 18 with TypeScript for type safety
- Vite as the build tool and development server
- Wouter for lightweight client-side routing
- TanStack Query (React Query) for server state management and caching

**UI Component System**
- Radix UI primitives for accessible, unstyled components
- shadcn/ui component library (New York style variant)
- Tailwind CSS for styling with custom design tokens
- Material Design + Linear-inspired design patterns for professional, information-dense interfaces

**State Management**
- React Context API for authentication state (AuthProvider)
- TanStack Query for server-side state with aggressive caching (staleTime: Infinity)
- Local component state for UI interactions

**Real-Time Communication**
- WebSocket client connecting to `/ws` endpoint
- Cookie-based authentication for WebSocket connections
- Message-based protocol for chat, resolutions, and voting events

### Backend Architecture

**Server Framework**
- Express.js with TypeScript
- HTTP server wrapped with WebSocket server
- Cookie-parser middleware for session management
- Multer for file upload handling (voice recordings)

**Authentication & Authorization**
- JWT tokens stored in secure HttpOnly cookies
- Dual authentication strategy:
  - Local strategy: bcrypt-hashed passwords
  - Google OAuth 2.0 via passport-google-oauth20
- Middleware-based route protection (authMiddleware)
- Token verification for both HTTP and WebSocket connections

**API Design**
- RESTful endpoints for CRUD operations
- WebSocket protocol for real-time features
- Rate limiting implemented in-memory for AI resolution generation (3 per day per user, can be reset)

**Business Logic Layers**
- Storage abstraction layer (IStorage interface) for database operations
- AI service layer for LLM integration
- Prompt template system stored in `/server/prompts/`

### Data Storage

**Database**
- PostgreSQL via Neon serverless driver (@neondatabase/serverless)
- Drizzle ORM for type-safe database queries and schema management
- Schema defined in `/shared/schema.ts` with Zod validation

**Data Models**
1. **Users**: Authentication, profile data, daily resolution quota tracking
2. **Rooms**: Two-person conversation spaces with unique 6-character codes
3. **Messages**: Chat history with text/voice support and transcriptions
4. **Resolutions**: AI-generated resolution options with confidence scores
5. **Votes**: User voting records with timestamp tracking

**Schema Patterns**
- UUID primary keys with PostgreSQL `gen_random_uuid()`
- Foreign key relationships with cascade deletes
- Timestamp tracking (createdAt, resolvedAt)
- Soft deletion via status fields ("active", "resolved", "archived")

### External Dependencies

**AI & ML Services**
- **Hugging Face Inference API**: Primary LLM provider for resolution generation (Mistral-7B-Instruct-v0.2 model)
- **Cohere API**: Speech-to-text transcription for voice messages (optional integration)
- Abstraction layer allows swapping AI providers by changing environment variables

**Authentication**
- **Google OAuth 2.0**: Third-party authentication requiring GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
- Callback URL: `/api/auth/google/callback`

**Infrastructure**
- **Neon Database**: Serverless PostgreSQL hosting, requires DATABASE_URL environment variable
- **Replit**: Primary deployment platform with specific Vite plugins (@replit/vite-plugin-runtime-error-modal, @replit/vite-plugin-cartographer)

**Frontend CDN Dependencies**
- Google Fonts: Inter (body text), Space Grotesk (headings)
- Font files loaded via Google Fonts CDN

**Environment Variables Required**
```
DATABASE_URL - PostgreSQL connection string
JWT_SECRET - Secret for signing authentication tokens
HUGGINGFACE_API_KEY - API key for Hugging Face inference
AI_PROVIDER - Provider selection (default: "huggingface")
GOOGLE_CLIENT_ID - Google OAuth client ID (optional)
GOOGLE_CLIENT_SECRET - Google OAuth client secret (optional)
COHERE_API_KEY - Cohere API key for speech-to-text (optional)
```

**Rate Limiting & Quotas**
- In-memory resolution count tracking (3 resolutions per user per day)
- Resets daily at midnight based on user's last reset timestamp
- Future consideration: Redis for distributed rate limiting in production