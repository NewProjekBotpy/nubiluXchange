# NubiluXchange - Gaming Account Marketplace

A full-stack TypeScript gaming account marketplace designed for the Indonesian market. Features a mobile-first React frontend with social media-inspired design and real-time communication capabilities.

## 🎮 Overview

NubiluXchange is a secure, engaging platform for buying and selling gaming accounts. Built with modern web technologies, it combines marketplace functionality with social features, real-time chat, and AI-powered tools.

**Key Features:**
- 🛒 Gaming account marketplace with escrow protection
- 💬 Real-time WebSocket chat with reactions and typing indicators
- 💳 Integrated digital wallet with multiple payment gateways
- 📱 WhatsApp-style status updates and TikTok-style video feed
- 🤖 AI-powered features for content generation and moderation
- 🔒 Two-Factor Authentication with TOTP
- 📊 Advanced analytics and admin dashboard
- 🌐 Mobile-first responsive design

## 🚀 Tech Stack

### Frontend
- **React 18** with TypeScript
- **Wouter** for client-side routing
- **TanStack Query** for server state management
- **Tailwind CSS** + **Radix UI** for styling
- **Framer Motion** for animations
- **Lucide React** for icons

### Backend
- **Express.js** with TypeScript
- **PostgreSQL** (Neon) with Drizzle ORM
- **WebSocket** for real-time features
- **Redis** for caching and rate limiting
- **JWT** authentication with httpOnly cookies

### DevOps & Tools
- **Vite** for build tooling
- **Drizzle Kit** for database migrations
- **Winston** for logging
- **Sentry** for error tracking
- **Playwright** for E2E testing

## 📋 Prerequisites

- **Node.js** 18+ 
- **PostgreSQL** database (Neon recommended)
- **Redis** (optional, for scaling)

## ⚡ Quick Start

### 1. Clone the repository
```bash
git clone https://github.com/your-username/nubiluxchange.git
cd nubiluxchange
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables
```bash
cp .env.example .env
```

Edit `.env` and add required variables:
```bash
DATABASE_URL="postgresql://user:password@host:port/database"
SESSION_SECRET="your-session-secret"
JWT_SECRET="your-jwt-secret"
TOTP_ENCRYPTION_KEY="your-totp-encryption-key"
```

### 4. Run database migrations
```bash
npm run db:push
```

### 5. Start development server
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run check` - TypeScript type checking
- `npm test` - Run tests
- `npm run db:push` - Push database schema changes

## 🌍 Environment Variables

### Required
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption key
- `JWT_SECRET` - JWT signing key
- `TOTP_ENCRYPTION_KEY` - 2FA secret encryption key

### Optional
- `REDIS_URL` - Redis connection for caching and scaling
- `SENTRY_DSN` - Error tracking
- `MIDTRANS_SERVER_KEY` - Payment gateway (Indonesia)
- `MIDTRANS_CLIENT_KEY` - Payment gateway client key
- `OPENAI_API_KEY` - AI features
- `CLOUDINARY_*` - Cloud storage
- `TWILIO_*` - SMS notifications

See `.env.example` for complete list and configuration guide.

## 📁 Project Structure

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utilities and helpers
│   │   └── contexts/      # React contexts
│   └── index.html
├── server/                # Backend Express application
│   ├── controllers/       # Route controllers
│   ├── services/          # Business logic
│   ├── repositories/      # Data access layer
│   ├── routes/            # API routes
│   └── middleware/        # Express middleware
├── shared/                # Shared types and schemas
├── migrations/            # Database migrations
├── docs/                  # Documentation
└── public/                # Static assets

```

## 🔒 Security Features

- **Two-Factor Authentication** (TOTP) with encrypted secrets
- **Password hashing** with bcrypt
- **JWT authentication** with httpOnly cookies
- **PostgreSQL session store** for secure session management
- **Rate limiting** with Redis
- **XSS protection** with DOMPurify
- **Input validation** with Zod schemas
- **GeoIP lookup** and VPN/Proxy detection
- **Webhook signature verification** for payment webhooks

## 📊 Database

The application uses PostgreSQL with Drizzle ORM for type-safe database operations.

**Migrations:**
```bash
npm run db:push  # Push schema changes
```

**Database Extensions:**
- `pg_trgm` - Full-text search support

## 🧪 Testing

```bash
npm test              # Run all tests
npm run test:unit     # Unit tests
npm run test:e2e      # E2E tests with Playwright
npm run test:coverage # Generate coverage report
```

## 🚀 Deployment

### Build for production
```bash
npm run build
```

### Start production server
```bash
npm start
```

### Docker (Optional)
```bash
docker build -t nubiluxchange .
docker run -p 5000:5000 nubiluxchange
```

### Environment-Specific Configuration
- Set `NODE_ENV=production` in production
- Use production database credentials
- Configure production payment gateway keys
- Set up production Redis instance
- Enable error tracking (Sentry)

## 📖 Documentation

Comprehensive documentation is available in the `/docs` directory:

- **Setup Guides** - Database, payment gateways, Redis, environment variables
- **Feature Documentation** - 2FA, analytics, offline mode, message search
- **Security** - Audit reports, developer guidelines, optimization guides
- **Testing** - Testing procedures and best practices

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For issues, questions, or contributions:
- Create an issue on GitHub
- Check the documentation in `/docs`
- Review environment setup guide

## 🎯 Roadmap

- [ ] Stripe payment integration
- [ ] Mobile app (React Native)
- [ ] Advanced AI moderation
- [ ] Multi-language support
- [ ] Enhanced analytics dashboard

---

**Built with ❤️ for the gaming community in Indonesia**
