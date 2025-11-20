# API Setup Guide for KŌOPE AI Features

## Overview

KŌOPE includes powerful AI features that can transform your cocktail recipes, analyze images, and transcribe voice input. These features use OpenAI's GPT-4 and Google Cloud Vision APIs to provide the best experience.

## Current Status

✅ **Development Mode Active**: All AI features currently use mock responses for testing
📝 **Real API Integration**: Ready to use with your API keys

## Quick Setup for Real AI Features

### Step 1: Get OpenAI API Key (Required for AI formatting and vision analysis)

1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the key (starts with `sk-`)

**Cost Estimate**: ~$0.01-0.03 per recipe with GPT-4

### Step 2: Get Google Cloud Vision API Key (Optional - for OCR text extraction)

1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable the Cloud Vision API
4. Create credentials (API Key)
5. Copy the API key

**Cost Estimate**: ~$0.001-0.005 per image

### Step 3: Update Environment Configuration

Edit your `.env` file and replace the placeholder values:

```bash
# AI Configuration for Recipe Formatting
EXPO_PUBLIC_OPENAI_API_KEY=sk-your-actual-openai-key-here
EXPO_PUBLIC_GOOGLE_CLOUD_API_KEY=your-actual-google-cloud-key-here
```

### Step 4: Restart Your Development Server

```bash
npx expo start --clear
```

## AI Features Enabled

### ✨ Recipe Formatting
- **Input**: URLs, text, or manual input
- **Output**: Structured recipe with ingredients, instructions, garnish
- **API**: OpenAI GPT-4
- **Cost**: ~$0.01-0.03 per recipe

### 👁️ Image Analysis (Vision AI)
- **Input**: Recipe photos or screenshots
- **Output**: Extracted recipe data directly from images
- **API**: OpenAI GPT-4 Vision
- **Cost**: ~$0.02-0.05 per image

### 📝 OCR Text Extraction
- **Input**: Photos with text
- **Output**: Extracted text content
- **API**: Google Cloud Vision
- **Cost**: ~$0.001-0.005 per image

### 🎤 Voice Transcription
- **Status**: Integration planned
- **Future API**: OpenAI Whisper
- **Estimated Cost**: ~$0.006 per minute

## Development vs Production Mode

### Development Mode (Current)
- Uses realistic mock responses
- No API costs
- Instant responses for testing
- Perfect for UI development

### Production Mode (With API Keys)
- Real AI analysis and formatting
- Accurate results based on your content
- Pay-per-use pricing
- Higher quality outputs

## Troubleshooting

### "Development mode: Using mock AI response"
- This means no valid API key was found
- Check your `.env` file
- Restart your development server

### "Invalid OpenAI API key format"
- API keys must start with `sk-`
- Must be longer than 40 characters
- Check for typos in your `.env` file

### API Errors
- Check your API key permissions
- Verify billing is set up on OpenAI platform
- Check rate limits and quotas

## Cost Management

### OpenAI API Costs
- Set usage limits in OpenAI dashboard
- Monitor usage in the platform
- Each recipe formatting costs ~$0.01-0.03

### Google Cloud Costs
- First 1,000 OCR requests per month are free
- Set budget alerts in Google Cloud Console

## Security

- API keys are stored in environment variables only
- Never commit real API keys to version control
- Use different keys for development and production
- Rotate keys regularly

## Testing AI Features

1. **Recipe Formatting**: Save any recipe URL and tap the ✨ AI Format button
2. **Image Analysis**: Take a photo of a recipe and choose "👁️ Vision Analysis"
3. **Voice Input**: Record yourself describing a recipe (transcription uses mock for now)
4. **OCR Extraction**: Take a photo and choose "Text Extraction"

## Need Help?

- Check the console logs for detailed error messages
- API keys and setup are logged during development
- Review the AI_SETUP.md file for additional details