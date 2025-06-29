# Google Play Developer API Service Account Setup

## Prerequisites
- Google Play Developer Account ($25 one-time fee)
- Google Cloud Platform account (free tier available)
- Admin access to your Play Console

## Step 1: Create Google Cloud Project

### 1.1 Create New Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Project name: `news-on-africa-app`
4. Click "Create"

### 1.2 Enable Google Play Developer API
1. In the Cloud Console, go to "APIs & Services" → "Library"
2. Search for "Google Play Developer API"
3. Click on it and press "Enable"

## Step 2: Create Service Account

### 2.1 Create Service Account
1. Go to "IAM & Admin" → "Service Accounts"
2. Click "Create Service Account"
3. Fill in details:
   - **Service account name**: `play-store-deployment`
   - **Service account ID**: `play-store-deployment`
   - **Description**: `Service account for automated Play Store deployments`
4. Click "Create and Continue"

### 2.2 Grant Roles (Optional - skip for now)
- Click "Continue" (we'll set permissions in Play Console)

### 2.3 Create Key
1. Click "Done" to create the service account
2. Find your service account in the list
3. Click on the email address
4. Go to "Keys" tab
5. Click "Add Key" → "Create new key"
6. Select "JSON" format
7. Click "Create"
8. **Save the downloaded JSON file securely** - you'll need it later

## Step 3: Link to Play Console

### 3.1 Access API Settings
1. Go to [Google Play Console](https://play.google.com/console)
2. Select your app (or create it first)
3. Go to "Setup" → "API access"

### 3.2 Link Google Cloud Project
1. If not already linked, click "Link Google Cloud project"
2. Select the project you created: `news-on-africa-app`
3. Click "Link project"

### 3.3 Grant Permissions to Service Account
1. In the "Service accounts" section, find your service account
2. Click "Grant access"
3. Select these permissions:
   - ✅ **Release manager** (can manage releases)
   - ✅ **View app information and download bulk reports**
4. Click "Invite user"

## Step 4: Verify Setup

The service account should now appear in your Play Console with the granted permissions.

## Security Notes
- Store the JSON key file securely
- Never commit it to version control
- Use environment variables or secure secret management
- Rotate keys periodically for security

Now let's create a verification script:

Create `scripts/verify-play-api.sh` with the following contents:
```bash
#!/bin/bash
set -e

if [ ! -f google-play-service-account.json ]; then
  echo "Service account JSON not found"
  exit 1
fi

gcloud auth activate-service-account --key-file=google-play-service-account.json

gcloud services list --enabled | grep androidpublisher.googleapis.com && \
  echo "\u2705 Play Developer API enabled"
```

Run it with:
```bash
bash scripts/verify-play-api.sh
```
