# CourseForge Backend API

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Configuration**
   Create a `.env` file in the backend directory with the following variables:
   
   ```env
   # Server Configuration
   NODE_ENV=development
   PORT=5000
   API_VERSION=v1

   # Database Configuration  
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/courseforge_db?schema=public"

   # JWT Configuration
   JWT_SECRET="your-super-secret-jwt-key-for-development-only"
   JWT_REFRESH_SECRET="your-super-secret-refresh-key-for-development-only"
   JWT_EXPIRE_TIME="1h"
   JWT_REFRESH_EXPIRE_TIME="7d"

   # CORS Configuration
   FRONTEND_URL="http://localhost:3000"
   ALLOWED_ORIGINS="http://localhost:3000,http://localhost:5173"

   # Password Configuration
   BCRYPT_SALT_ROUNDS=12

   # Rate Limiting
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   ```

3. **Database Setup**
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Push schema to database (for development)
   npm run db:push
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout user
- `GET /api/v1/auth/me` - Get current user profile

### Users
- `GET /api/v1/users` - Get all users (admin only)
- `GET /api/v1/users/:id` - Get user by ID
- `PUT /api/v1/users/:id` - Update user profile
- `DELETE /api/v1/users/:id` - Delete user (admin only)

### Courses
- `GET /api/v1/courses` - Get all courses
- `GET /api/v1/courses/:id` - Get course by ID
- `POST /api/v1/courses` - Create new course (instructor/admin)
- `PUT /api/v1/courses/:id` - Update course
- `DELETE /api/v1/courses/:id` - Delete course

### Progress
- `GET /api/v1/progress/my` - Get user's progress
- `GET /api/v1/progress/course/:courseId` - Get course progress
- `POST /api/v1/progress/lesson/:lessonId/complete` - Mark lesson complete
- `PUT /api/v1/progress/lesson/:lessonId` - Update lesson progress

### Admin
- `GET /api/v1/admin/dashboard/stats` - Dashboard statistics
- `GET /api/v1/admin/users` - User management
- `GET /api/v1/admin/courses` - Course management
- `GET /api/v1/admin/orders` - Order management

## Project Structure

```
backend/
├── src/
│   ├── middleware/          # Express middleware
│   │   ├── auth.ts         # Authentication middleware
│   │   ├── errorHandler.ts # Error handling
│   │   └── requestLogger.ts # Request logging
│   ├── routes/             # API routes
│   │   ├── auth.ts         # Authentication routes
│   │   ├── users.ts        # User management
│   │   ├── courses.ts      # Course management
│   │   ├── enrollments.ts  # Enrollment management
│   │   ├── progress.ts     # Progress tracking
│   │   └── admin.ts        # Admin routes
│   ├── utils/              # Utility functions
│   │   ├── jwt.ts          # JWT token utilities
│   │   └── password.ts     # Password hashing utilities
│   └── server.ts           # Main server file
├── prisma/
│   └── schema.prisma       # Database schema
├── package.json
├── tsconfig.json
└── README.md
```