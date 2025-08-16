# Google Play API Troubleshooting

## Common Issues and Solutions

### 1. "Service account not found" Error

**Problem**: Service account email not recognized in Play Console

**Solutions**:
- Ensure the Google Cloud project is linked to Play Console
- Check that the service account email is exactly correct
- Wait 10-15 minutes after creating the service account

### 2. "Insufficient permissions" Error

**Problem**: Service account lacks required permissions

**Solutions**:
- Grant "Release manager" role in Play Console
- Add "View app information" permission
- Ensure the service account is invited as a user

### 3. "API not enabled" Error

**Problem**: Google Play Developer API not enabled

**Solutions**:
\`\`\`bash
gcloud services enable androidpublisher.googleapis.com
\`\`\`

### 4. "Project not linked" Error

**Problem**: Google Cloud project not linked to Play Console

**Solutions**:
1. Go to Play Console → Setup → API access
2. Click "Link Google Cloud project"
3. Select your project and confirm

### 5. Authentication Issues

**Problem**: Service account authentication fails

**Solutions**:
\`\`\`bash
# Test authentication
gcloud auth activate-service-account --key-file=google-play-service-account.json

# List authenticated accounts
gcloud auth list

# Set project
gcloud config set project YOUR_PROJECT_ID
\`\`\`

### 6. Fastlane Upload Errors

**Problem**: Fastlane can't upload to Play Store

**Solutions**:
- Check AAB file exists and is valid
- Verify service account has correct permissions
- Ensure app exists in Play Console
- Check track name is correct (internal, alpha, beta, production)

### 7. GitHub Actions Failures

**Problem**: Automated deployment fails

**Solutions**:
- Verify all secrets are set correctly
- Check service account JSON is valid
- Ensure keystore is properly encoded
- Review GitHub Actions logs for specific errors

## Verification Commands

\`\`\`bash
# Check service account
gcloud iam service-accounts list

# Test API access
gcloud auth activate-service-account --key-file=google-play-service-account.json

# Verify API is enabled
gcloud services list --enabled | grep androidpublisher

# Test fastlane
fastlane android internal --verbose
\`\`\`

## Getting Help

1. **Google Play Console Help**: https://support.google.com/googleplay/android-developer
2. **Google Cloud Support**: https://cloud.google.com/support
3. **Fastlane Documentation**: https://docs.fastlane.tools/
4. **GitHub Actions Docs**: https://docs.github.com/en/actions
