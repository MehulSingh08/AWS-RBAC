# AWS RBAC File Management System

Serverless Role-Based Access Control (RBAC) web application for secure file management using AWS services.

## Project Structure

```
project-root/
├── frontend/
│   ├── index.html          # Main UI
│   ├── styles.css          # Styling
│   ├── config.js           # AWS configuration
│   ├── auth.js             # Cognito authentication
│   └── api.js              # API Gateway interactions
├── backend/
│   ├── get_upload_url.py   # Lambda: Generate upload URL
│   ├── list_files.py       # Lambda: List user files
│   ├── get_download_url.py # Lambda: Generate download URL
│   ├── delete_file.py      # Lambda: Delete file (admin only)
│   └── .env                # Environment variables
└── README.md
```

## Features

- **User Authentication**: Sign up/sign in using AWS Cognito
- **Role-Based Access**:
  - **Regular Users**: Upload, list, and download their own files
  - **Admins**: Full CRUD operations on all files
- **Admin Approval Flow**: Admin requests require manual confirmation
- **Secure File Operations**: Pre-signed URLs for direct S3 access
- **Free Tier Compliant**: No EC2 instances required

---

## Setup Instructions

### 1. Clone and Configure

```bash
# Clone the repository
git clone <your-repo-url>
cd project-root

# Copy configuration templates
cp frontend/config.example.js frontend/config.js
cp backend/.env.example backend/.env
```

### 2. Frontend Configuration

Edit `frontend/config.js` with your AWS credentials:

```javascript
const AWS_CONFIG = {
    REGION: 'us-east-1',
    COGNITO_USER_POOL_ID: 'us-east-1_XXXXXXXXX',
    COGNITO_APP_CLIENT_ID: 'your-app-client-id',
    COGNITO_IDENTITY_POOL_ID: 'us-east-1:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    API_GATEWAY_INVOKE_URL: 'https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/prod'
};
```

### 2. Backend Configuration

Edit `backend/.env` with your S3 bucket details:

```bash
BUCKET_NAME=your-s3-bucket-name
URL_EXPIRATION=3600
```

### 3. Deploy Lambda Functions

#### Create 4 Lambda Functions:

1. **get-upload-url**
   - Runtime: Python 3.x
   - Upload: `backend/get_upload_url.py`
   
2. **list-files**
   - Runtime: Python 3.x
   - Upload: `backend/list_files.py`
   
3. **get-download-url**
   - Runtime: Python 3.x
   - Upload: `backend/get_download_url.py`
   
4. **delete-file**
   - Runtime: Python 3.x
   - Upload: `backend/delete_file.py`

#### For Each Lambda:

1. Set environment variables from `.env` file
2. Attach execution role with S3 permissions:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "s3:GetObject",
           "s3:PutObject",
           "s3:DeleteObject",
           "s3:ListBucket",
           "s3:HeadObject"
         ],
         "Resource": [
           "arn:aws:s3:::YOUR_BUCKET_NAME",
           "arn:aws:s3:::YOUR_BUCKET_NAME/*"
         ]
       },
       {
         "Effect": "Allow",
         "Action": [
           "logs:CreateLogGroup",
           "logs:CreateLogStream",
           "logs:PutLogEvents"
         ],
         "Resource": "arn:aws:logs:*:*:*"
       }
     ]
   }
   ```

### 4. API Gateway Setup

#### Create REST API with Cognito Authorizer:

1. **Create Authorizer**:
   - Type: Cognito
   - Cognito User Pool: Select your pool
   - Token Source: `Authorization`

2. **Create Resources & Methods**:
   - `POST /upload-url` → get-upload-url Lambda
   - `GET /files` → list-files Lambda
   - `GET /download-url` → get-download-url Lambda
   - `DELETE /files` → delete-file Lambda

3. **Enable CORS** on all methods:
   - Access-Control-Allow-Origin: `*`
   - Access-Control-Allow-Headers: `Content-Type,Authorization`
   - Access-Control-Allow-Methods: `GET,POST,DELETE,OPTIONS`

4. **Deploy API** to `prod` stage

### 5. Cognito Configuration

#### User Pool Setup:

1. Create User Pool with:
   - Email sign-in
   - Custom attribute: `custom:role` (String)
   
2. Create App Client:
   - Disable client secret
   - Enable username/password auth flow

3. Create User Groups:
   - **User** group
   - **Admin** group

#### Lambda Triggers (Optional for Auto-Approval):

**Post-Confirmation Trigger** (auto-add regular users to User group):

```python
import boto3

cognito = boto3.client('cognito-idp')
USER_POOL_ID = 'YOUR_USER_POOL_ID'

def lambda_handler(event, context):
    user_attributes = event['request']['userAttributes']
    username = event['userName']
    
    if user_attributes.get('custom:role') != 'admin':
        cognito.admin_add_user_to_group(
            UserPoolId=USER_POOL_ID,
            Username=username,
            GroupName='User'
        )
    
    return event
```

### 6. Manual Admin Approval

When a user requests admin access:

```bash
# Step 1: Confirm the user
aws cognito-idp admin-confirm-sign-up \
  --user-pool-id YOUR_USER_POOL_ID \
  --username user_XXXXXXXXX

# Step 2: Add to Admin group
aws cognito-idp admin-add-user-to-group \
  --user-pool-id YOUR_USER_POOL_ID \
  --username user_XXXXXXXXX \
  --group-name Admin
```

---

## Running the Application

### Start Frontend Server:

```bash
cd frontend
python -m http.server 8000
```

Or use VS Code Live Server extension.

### Access Application:

Open browser: `http://localhost:8000`

---

## User Workflows

### Regular User:
1. Sign up (auto-confirmed)
2. Sign in
3. Upload files to personal folder (`users/<sub>/`)
4. View and download own files

### Admin User:
1. Sign up with "Request Admin Access" checked
2. Wait for manual approval
3. Sign in after approval
4. Upload, view, download, and delete ANY file

---

## IAM Role Policies

### User Role (WebApp-User-Role):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/users/${cognito-identity.amazonaws.com:sub}/*"
    },
    {
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME",
      "Condition": {
        "StringLike": {
          "s3:prefix": "users/${cognito-identity.amazonaws.com:sub}/*"
        }
      }
    }
  ]
}
```

### Admin Role (WebApp-Admin-Role):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::YOUR_BUCKET_NAME",
        "arn:aws:s3:::YOUR_BUCKET_NAME/*"
      ]
    }
  ]
}
```

---

## Security Best Practices

✅ Block all public S3 access  
✅ Use pre-signed URLs for time-limited access  
✅ Enforce least privilege at Lambda level  
✅ Manual admin approval required  
✅ HTTPS-only communication  
✅ JWT token validation via Cognito Authorizer

---

## Troubleshooting

### CORS Errors:
- Ensure API Gateway has CORS enabled on all methods
- Check that Lambda responses include CORS headers

### Upload/Download Fails:
- Verify Lambda has correct S3 permissions
- Check bucket name in `.env` matches actual bucket
- Ensure pre-signed URL hasn't expired

### Admin Features Not Showing:
- Confirm user is in "Admin" Cognito group
- Re-authenticate after group assignment

### Sign-Up Issues:
- Password must meet requirements (8+ chars, uppercase, lowercase, number)
- Email must be valid format
- Check Cognito User Pool settings

---

## Cost Optimization

This architecture stays within AWS Free Tier:
- Lambda: 1M requests/month
- S3: 5GB storage, 20K GET, 2K PUT
- Cognito: 50K MAUs
- API Gateway: 1M requests/month

**No EC2 instances = Zero compute costs!**

---

## Support

For issues or questions:
1. Check CloudWatch Logs for Lambda errors
2. Verify all configuration values in `config.js` and `.env`
3. Test API endpoints directly using Postman
4. Review Cognito User Pool for user status