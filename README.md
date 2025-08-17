# CourseForge

A modern course management platform built with React and NestJS, featuring both student and admin interfaces for comprehensive course delivery and management.

## Features

- **Student Portal**: Browse courses, track progress, watch video lessons
- **Admin Dashboard**: Manage courses, users, enrollments, and content
- **Authentication**: Secure login system for students and administrators
- **Responsive Design**: Modern UI that works on all devices
- **Video Lessons**: Integrated video player with progress tracking
- **Course Structure**: Organized modules and lessons with resources

## Getting Started

### Prerequisites

- Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- PostgreSQL database (for backend)

### Installation

```sh
# Clone the repository
git clone https://github.com/anhan97/courseforge-nest.git

# Navigate to the project directory
cd courseforge-nest

# Install frontend dependencies
npm install

# Navigate to backend directory and install dependencies
cd backend
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials and JWT secret

# Run database migrations
npx prisma migrate dev

# Start the backend server
npm run dev

# In another terminal, start the frontend
cd ..
npm run dev
```

## Technology Stack

### Frontend
- **React 18** - Modern React with hooks and functional components
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Modern component library
- **React Router** - Client-side routing

### Backend
- **NestJS** - Progressive Node.js framework
- **Prisma** - Type-safe database ORM
- **PostgreSQL** - Robust relational database
- **JWT** - Secure authentication
- **bcrypt** - Password hashing

## Project Structure

```
courseforge-nest/
├── backend/                 # NestJS backend API
│   ├── src/
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Authentication & logging
│   │   └── utils/          # Utilities (JWT, password)
│   └── prisma/             # Database schema and migrations
├── src/                    # React frontend
│   ├── components/         # Reusable UI components
│   ├── pages/             # Page components
│   ├── contexts/          # React contexts (Auth)
│   └── lib/               # API utilities
└── public/                # Static assets
```

## API Endpoints

### Authentication
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `POST /auth/admin/login` - Admin login

### Courses
- `GET /courses` - List all courses
- `GET /courses/:id` - Get course details
- `POST /courses` - Create course (admin)
- `PUT /courses/:id` - Update course (admin)
- `DELETE /courses/:id` - Delete course (admin)

### Users & Enrollments
- `GET /users` - List users (admin)
- `POST /enrollments` - Enroll user in course
- `GET /progress/:userId/:courseId` - Get user progress

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
