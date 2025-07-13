# Cloudflare R2 Storage Setup Guide

## ✅ What's Been Implemented

Your backend has been updated to use Cloudflare R2 storage instead of local file storage. All file upload and deletion endpoints now use R2.

## 🔧 Setup Steps

### 1. Install Dependencies
```bash
cd backend
pip install boto3 python-multipart
```

### 2. Set Environment Variables
Create a `.env` file in your backend directory or set these environment variables:

```bash
R2_ENDPOINT_URL=https://your-account-id.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=your-bucket-name
```

### 3. Replace Placeholder Values
- **R2_ENDPOINT_URL**: Replace `your-account-id` with your actual Cloudflare Account ID
- **R2_ACCESS_KEY_ID**: Your R2 API Access Key ID
- **R2_SECRET_ACCESS_KEY**: Your R2 API Secret Access Key  
- **R2_BUCKET_NAME**: Your R2 bucket name (e.g., `paper-mapper-files`)

## 🚀 Test the Implementation

1. **Start your backend server**:
   ```bash
   cd backend
   uvicorn main:app --reload
   ```

2. **Test file upload** via your frontend or API client

3. **Check R2 dashboard** to see uploaded files

## 📁 File Organization

Files are organized in R2 by type:
- `source-materials/` - Source material files
- `questions/` - Question files  
- `insights/` - Insight files
- `thoughts/` - Thought files
- `general/` - General uploads

## 🔄 Migration from Local Storage

If you have existing files in your local `uploads` folder:

1. **Backup your files** first
2. **Upload existing files** using the new R2 endpoints
3. **Update database records** to point to new R2 URLs
4. **Remove local uploads folder** once migration is complete

## 💰 Cost Benefits

- **Free tier**: 10GB storage, 1M uploads, 10M downloads/month
- **No egress fees**: Downloads are free (unlike AWS S3)
- **Global CDN**: Fast file delivery worldwide
- **Scalable**: Handles thousands of users

## 🛠️ Troubleshooting

### Common Issues:
1. **"Invalid credentials"**: Check your R2 API keys
2. **"Bucket not found"**: Verify bucket name and permissions
3. **"Endpoint URL error"**: Check your Account ID in the endpoint URL

### Debug Mode:
Add this to your `.env` file for detailed logging:
```bash
DEBUG=true
```

## 🎉 You're Ready!

Your app now uses production-ready cloud storage that will scale with your user base! 