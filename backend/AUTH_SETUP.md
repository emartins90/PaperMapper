# Authentication Setup Guide

## 🔧 Critical Fixes Applied

### 1. Missing Dependencies Fixed
Added to `requirements.txt`:
- `fastapi-users[sqlalchemy]` - Core authentication library
- `fastapi-users-db-sqlalchemy` - Database integration
- `python-dotenv` - Environment management
- `asyncpg` - Async PostgreSQL support
- `httpx` & `authlib` - OAuth support

### 2. Security Improvements
- **JWT Secret**: Now auto-generates secure secrets if not provided
- **Cookie Security**: Added httponly, secure, and samesite flags
- **Password Reset**: 
  - 8-character alphanumeric codes (instead of 6-digit)
  - Rate limiting (max 3 requests per 5 minutes)
  - 15-minute expiration (instead of 10)
  - No code logging in production

### 3. Authentication Ready for OAuth
- OAuth configuration prepared for future use
- Easy to add Google/Apple sign-in later

## 🚀 Setup Instructions

### 1. Environment Configuration

Create `.env.development` in the backend directory:

```bash
# Database Configuration
DATABASE_URL=postgresql+asyncpg://username:password@localhost:5432/paper_mapper

# Security - Generate with: python -c "import secrets; print(secrets.token_urlsafe(32))"
JWT_SECRET=your-super-secret-jwt-key-here-change-this-immediately

# R2 Storage Configuration
R2_ENDPOINT_URL=https://your-account-id.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your-access-key-id
R2_SECRET_ACCESS_KEY=your-secret-access-key
R2_BUCKET_NAME=your-bucket-name

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com

# Environment
ENV=development

# OAuth Configuration (Optional - for future use)
# GOOGLE_CLIENT_ID=your-google-client-id
# GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 2. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 3. Database Setup

```bash
# Run migrations
alembic upgrade head

# Initialize database (if needed)
python init_db.py
```

### 4. OAuth Setup (Optional - for future use)

When you're ready to add OAuth:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Go to Credentials → Create Credentials → OAuth 2.0 Client ID
5. Set authorized redirect URI: `http://localhost:8000/auth/google/callback`
6. Copy Client ID and Client Secret to your `.env.development`

### 5. Run the Application

```bash
# Development
python run_dev.py

# Or with uvicorn directly
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## 🔒 Security Checklist

- [ ] Strong JWT secret generated and set
- [ ] Database credentials secured
- [ ] CORS origins properly configured
- [ ] HTTPS enabled in production
- [ ] Environment variables not committed to git
- [ ] Rate limiting enabled
- [ ] Password reset emails implemented (TODO)

## 🚀 Deployment Recommendations

### Free Tier Options:

1. **Railway** (Recommended)
   - Free tier: $5/month credit
   - Easy PostgreSQL + FastAPI deployment
   - Automatic HTTPS
   - Good for small projects

2. **Render**
   - Free tier: 750 hours/month
   - PostgreSQL included
   - Automatic deployments
   - Good documentation

3. **Fly.io**
   - Free tier: 3 shared-cpu VMs
   - PostgreSQL available
   - Global edge deployment
   - More complex setup

4. **Supabase** (Alternative to custom auth)
   - Free tier: 50,000 MAU
   - Built-in auth with OAuth
   - PostgreSQL database
   - Real-time subscriptions

### Production Security Checklist:

- [ ] Use environment-specific `.env` files
- [ ] Enable HTTPS everywhere
- [ ] Set secure cookie flags in production
- [ ] Implement proper email service for password reset
- [ ] Add monitoring and logging
- [ ] Regular security updates
- [ ] Database backups

## 🔧 Troubleshooting

### Common Issues:

1. **Import Errors**: Make sure all dependencies are installed
2. **Database Connection**: Check DATABASE_URL format
3. **CORS Errors**: Verify CORS_ORIGINS includes your frontend URL
4. **OAuth Errors**: Check redirect URIs match exactly

### Testing Authentication:

```bash
# Test registration
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'

# Test login
curl -X POST http://localhost:8000/auth/cookie/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=test@example.com&password=testpass123" \
  -c cookies.txt

# Test protected endpoint
curl -X GET http://localhost:8000/projects/ \
  -b cookies.txt
```

## 📝 Next Steps

1. **Email Service**: Implement proper email sending for password reset
2. **OAuth Integration**: Add Google/Apple sign-in when needed
3. **Rate Limiting**: Add more sophisticated rate limiting
4. **Audit Logging**: Track authentication events
5. **MFA**: Add two-factor authentication
6. **Session Management**: Add session timeout and management 