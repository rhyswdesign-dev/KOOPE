# Google Cloud Vision API Setup Guide

This guide will help you set up Google Cloud Vision API for the spirit bottle scanning feature.

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a Project" → "New Project"
3. Name your project (e.g., "HomeGameAdvantage")
4. Click "Create"

## Step 2: Enable the Vision API

1. In the Google Cloud Console, go to **APIs & Services** → **Library**
2. Search for "Cloud Vision API"
3. Click on "Cloud Vision API"
4. Click the **Enable** button

## Step 3: Create an API Key

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **API Key**
3. Copy the generated API key
4. Click **Edit API Key** to restrict it:
   - Under "API restrictions", select "Restrict key"
   - Choose "Cloud Vision API" from the dropdown
   - Click **Save**

## Step 4: Configure Your App

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and add your API key:
   ```
   EXPO_PUBLIC_GOOGLE_VISION_API_KEY=YOUR_API_KEY_HERE
   ```

3. Restart your Expo development server:
   ```bash
   npm start
   ```

## Step 5: Test the Scanner

1. Open the app
2. Navigate to Inventory → Camera icon
3. Take a photo of a spirit bottle
4. The app will now use Google Vision API to:
   - Detect text on the bottle label (OCR)
   - Identify the type of bottle (label detection)
   - Match it to known spirits in the database

## Pricing Information

Google Cloud Vision API offers:
- **Free tier**: 1,000 units/month free
- Each image analysis counts as 1 unit
- After free tier: $1.50 per 1,000 images

For a typical user scanning 10-20 bottles per month, you'll stay well within the free tier.

## Fallback Behavior

If the API key is not configured or the API fails:
- The app automatically falls back to a mock service
- Users can still test the scanning feature
- Mock results simulate real API responses

## Production Considerations

**Security Note**: For production apps, consider:

1. **Using a Backend API** (Recommended)
   - Create a Cloud Function or backend endpoint
   - Keep API key on the server
   - Mobile app calls your backend, which calls Vision API
   - This prevents exposing your API key in the mobile app

2. **API Key Restrictions**
   - Restrict by IP address (for backend)
   - Restrict by app package name (Android)
   - Restrict by iOS bundle ID
   - Monitor usage in Google Cloud Console

3. **Rate Limiting**
   - Implement rate limiting on your backend
   - Cache common bottle results
   - Prevent abuse

## Troubleshooting

### "API key not configured"
- Check that `.env` file exists and contains the key
- Restart Expo development server after adding the key
- Verify the key starts with `EXPO_PUBLIC_`

### "Vision API error: 403"
- API key may not have Vision API enabled
- Check API restrictions in Google Cloud Console
- Verify billing is enabled (required even for free tier)

### "Low confidence results"
- Ensure good lighting when taking photos
- Keep bottle label centered and in focus
- Try capturing just the label, not the entire bottle
- Avoid glare on glass bottles

## Support

For issues with:
- **Google Cloud Vision**: [Google Cloud Support](https://cloud.google.com/support)
- **App Integration**: Check the logs in the app or contact support

## Example Request

The app sends requests like this to Google Vision API:

```json
{
  "requests": [
    {
      "image": {
        "content": "<base64-encoded-image>"
      },
      "features": [
        {
          "type": "TEXT_DETECTION",
          "maxResults": 10
        },
        {
          "type": "LABEL_DETECTION",
          "maxResults": 10
        }
      ]
    }
  ]
}
```

The API returns detected text and labels, which the app uses to identify the spirit.
