# School Management System - Setup Guide

## 📋 Overview

This guide will walk you through setting up the School Management System on your local development environment.

---

## 🔧 Prerequisites

Before you begin, ensure you have the following installed:

### Required Software

1. **PHP 8.1 or higher**
   - Download from: https://www.php.net/downloads
   - Verify installation: `php --version`

2. **Composer 2.0+**
   - Download from: https://getcomposer.org/download/
   - Verify installation: `composer --version`

3. **Node.js 18+ LTS**
   - Download from: https://nodejs.org/
   - Verify installation: `node --version` and `npm --version`

4. **MySQL 8.0+**
   - Download from: https://dev.mysql.com/downloads/mysql/
   - Or use XAMPP/WAMP/MAMP
   - Verify installation: `mysql --version`

5. **Git**
   - Download from: https://git-scm.com/downloads
   - Verify installation: `git --version`

### Optional Software

- **Redis 6.0+** (for caching)
- **Docker** (for containerized development)

---

## 🚀 Installation Steps

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd school-management
```

---

### Step 2: Backend Setup (Laravel)

#### 2.1 Navigate to Backend Directory

```bash
cd backend
```

#### 2.2 Install PHP Dependencies

```bash
composer install
```

#### 2.3 Environment Configuration

```bash
# Copy the example environment file
cp .env.example .env

# Generate application key
php artisan key:generate
```

#### 2.4 Configure Database

Edit the `.env` file and update the database credentials:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=school_management
DB_USERNAME=root
DB_PASSWORD=your_password
```

#### 2.5 Create Database

```bash
# Login to MySQL
mysql -u root -p

# Create database
CREATE DATABASE school_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

#### 2.6 Run Migrations

```bash
php artisan migrate
```

#### 2.7 Seed Database (Optional)

```bash
php artisan db:seed
```

#### 2.8 Publish Package Configurations

```bash
# Sanctum configuration
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"

# Permission configuration
php artisan vendor:publish --provider="Spatie\Permission\PermissionServiceProvider"
```

#### 2.9 Start Development Server

```bash
php artisan serve
```

The backend API will be available at: `http://localhost:8000`

---

### Step 3: Frontend Setup (React)

#### 3.1 Navigate to Frontend Directory

```bash
cd ../frontend
```

#### 3.2 Install Node Dependencies

```bash
npm install
```

#### 3.3 Environment Configuration

Create a `.env` file in the frontend directory:

```env
VITE_API_URL=http://localhost:8000/api/v1
VITE_APP_NAME="School Management System"
```

#### 3.4 Start Development Server

```bash
npm run dev
```

The frontend will be available at: `http://localhost:5173`

---

## 📁 Project Structure

```
school-management/
├── backend/                    # Laravel backend
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/
│   │   │   ├── Middleware/
│   │   │   └── Requests/
│   │   ├── Models/
│   │   ├── Services/
│   │   └── Repositories/
│   ├── config/
│   ├── database/
│   │   ├── migrations/
│   │   └── seeders/
│   ├── routes/
│   │   ├── api.php
│   │   └── web.php
│   ├── .env
│   └── composer.json
│
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── api/               # API calls
│   │   ├── components/        # Reusable components
│   │   ├── pages/             # Page components
│   │   ├── context/           # Context providers
│   │   ├── hooks/             # Custom hooks
│   │   ├── utils/             # Utility functions
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── public/
│   ├── .env
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── docs/                       # Documentation
├── mockups/                    # UI mockups
└── README.md
```

---

## 🔑 Default Credentials (After Seeding)

### Super Admin
- **Email:** admin@school.com
- **Password:** password

### Admin
- **Email:** admin@example.com
- **Password:** password

### Teacher
- **Email:** teacher@example.com
- **Password:** password

### Student
- **Email:** student@example.com
- **Password:** password

### Parent
- **Email:** parent@example.com
- **Password:** password

**⚠️ Important:** Change these credentials in production!

---

## 🧪 Running Tests

### Backend Tests (PHPUnit)

```bash
cd backend
php artisan test
```

### Frontend Tests (Vitest)

```bash
cd frontend
npm run test
```

---

## 🛠️ Development Tools

### Backend Tools

#### Laravel Tinker (REPL)
```bash
php artisan tinker
```

#### Code Formatting (Laravel Pint)
```bash
./vendor/bin/pint
```

#### Database Refresh
```bash
php artisan migrate:fresh --seed
```

#### Clear Cache
```bash
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear
```

### Frontend Tools

#### Build for Production
```bash
npm run build
```

#### Preview Production Build
```bash
npm run preview
```

#### Lint Code
```bash
npm run lint
```

---

## 🐛 Troubleshooting

### Common Issues

#### 1. "Class not found" Error
```bash
composer dump-autoload
```

#### 2. Permission Denied (Storage/Cache)
```bash
chmod -R 775 storage bootstrap/cache
```

#### 3. Database Connection Error
- Check MySQL is running
- Verify database credentials in `.env`
- Ensure database exists

#### 4. Port Already in Use
```bash
# Backend (change port)
php artisan serve --port=8001

# Frontend (change port)
npm run dev -- --port 5174
```

#### 5. Node Modules Issues
```bash
rm -rf node_modules package-lock.json
npm install
```

---

## 📦 Package Management

### Backend Packages

#### Install New Package
```bash
composer require package-name
```

#### Update Packages
```bash
composer update
```

### Frontend Packages

#### Install New Package
```bash
npm install package-name
```

#### Update Packages
```bash
npm update
```

---

## 🔒 Security Checklist

Before deploying to production:

- [ ] Change all default passwords
- [ ] Update `APP_KEY` in `.env`
- [ ] Set `APP_DEBUG=false` in production
- [ ] Configure CORS properly
- [ ] Enable HTTPS
- [ ] Set up proper file permissions
- [ ] Configure rate limiting
- [ ] Enable database backups
- [ ] Set up monitoring and logging
- [ ] Review and update security headers

---

## 🌐 Deployment

### Production Environment Variables

#### Backend (.env)
```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-domain.com

DB_CONNECTION=mysql
DB_HOST=your-db-host
DB_PORT=3306
DB_DATABASE=your-db-name
DB_USERNAME=your-db-user
DB_PASSWORD=your-db-password

CACHE_DRIVER=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis

REDIS_HOST=your-redis-host
REDIS_PASSWORD=your-redis-password
REDIS_PORT=6379
```

#### Frontend (.env)
```env
VITE_API_URL=https://your-domain.com/api/v1
VITE_APP_NAME="School Management System"
```

---

## 📚 Additional Resources

- [Laravel Documentation](https://laravel.com/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Vite Documentation](https://vitejs.dev)

---

## 🆘 Getting Help

If you encounter any issues:

1. Check the documentation in the `docs/` folder
2. Review the troubleshooting section above
3. Check existing issues in the repository
4. Create a new issue with detailed information

---

**Last Updated:** 2025-10-11  
**Version:** 1.0  
**Status:** Development Setup Complete

---

*Happy Coding! 🚀*

