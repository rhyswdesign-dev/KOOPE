// @ts-nocheck
import OpenAI from 'openai';
import { AIRecipeFormatter, FormattedRecipe, RecipeInput } from './aiRecipeFormatter';
import { log } from '../lib/logger';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY || 'dev-key',
});

const hasValidOpenAIKey = () => {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  return !!apiKey &&
    apiKey !== 'your-openai-api-key' &&
    apiKey !== 'dev-key' &&
    apiKey.startsWith('sk-');
};

const shouldUseMockAI = () => {
  const override = process.env.EXPO_PUBLIC_AI_ALLOW_MOCKS;
  if (override === 'true') return true;
  if (override === 'false') return false;
  return process.env.NODE_ENV !== 'production';
};

export interface VideoAnalysisResult {
  transcript?: string;
  keyFrames?: string[];
  detectedRecipeSteps?: string[];
  detectedIngredients?: string[];
  confidence: number;
  processingTime: number;
}

export interface VideoRecipeInput {
  videoUrl?: string;
  videoFile?: Blob | File;
  title?: string;
  description?: string;
  duration?: number;
  quality?: 'low' | 'medium' | 'high';
}

export class VideoRecipeAnalyzer {

  /**
   * Main entry point: Analyze video and convert to structured recipe
   */
  static async analyzeVideoForRecipe(input: VideoRecipeInput): Promise<FormattedRecipe> {
    try {
      log.info('VideoRecipeAnalyzer', 'Starting video recipe analysis', { title: input.title });

      if (!hasValidOpenAIKey()) {
        if (!shouldUseMockAI()) {
          throw new Error('Video recipe analysis is not configured for production. Set EXPO_PUBLIC_OPENAI_API_KEY.');
        }

        log.debug('VideoRecipeAnalyzer', 'Development mode: Using mock video analysis', { input });
        await new Promise(resolve => setTimeout(resolve, 3000)); // Simulate processing
        return this.getMockVideoRecipeAnalysis(input);
      }

      // Step 1: Extract video frames for visual analysis
      const keyFrames = await this.extractKeyFrames(input);

      // Step 2: Extract audio transcript
      const transcript = await this.extractAudioTranscript(input);

      // Step 3: Analyze frames for visual recipe content
      const visualAnalysis = await this.analyzeRecipeFrames(keyFrames);

      // Step 4: Combine audio and visual analysis
      const combinedAnalysis = await this.combineAudioVisualAnalysis(transcript, visualAnalysis);

      // Step 5: Format into structured recipe
      const recipeInput: RecipeInput = {
        title: input.title || combinedAnalysis.title,
        extractedText: combinedAnalysis.extractedContent,
        userNotes: input.description,
        recipeType: 'cocktail' // Default, will be auto-detected
      };

      return await AIRecipeFormatter.formatRecipe(recipeInput);

    } catch (error: any) {
      log.error('VideoRecipeAnalyzer', 'Video recipe analysis failed', error, { input });
      throw new Error(`Video analysis failed: ${error.message}`);
    }
  }

  /**
   * Extract key frames from video for visual analysis
   */
  private static async extractKeyFrames(input: VideoRecipeInput): Promise<string[]> {
    try {
      log.debug('VideoRecipeAnalyzer', 'Extracting key frames from video', { duration: input.duration });

      if (!hasValidOpenAIKey()) {
        if (!shouldUseMockAI()) {
          throw new Error('Video transcription is not configured for production. Set EXPO_PUBLIC_OPENAI_API_KEY.');
        }

        // Return mock base64 image data
        return [
          'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj...',
          'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj...'
        ];
      }

      // In production, this would use FFmpeg or similar to extract frames
      // For now, return empty array which will trigger text-only analysis
      return [];

    } catch (error) {
      log.warn('VideoRecipeAnalyzer', 'Frame extraction failed, continuing with audio-only analysis', { error });
      return [];
    }
  }

  /**
   * Extract audio transcript from video using Whisper API
   */
  private static async extractAudioTranscript(input: VideoRecipeInput): Promise<string> {
    try {
      log.debug('VideoRecipeAnalyzer', 'Extracting audio transcript', { hasVideoFile: !!input.videoFile });

      if (!hasValidOpenAIKey()) {
        if (!shouldUseMockAI()) {
          throw new Error('Video transcription is not configured for production. Set EXPO_PUBLIC_OPENAI_API_KEY.');
        }

        // Return mock transcript based on video type
        if (input.title?.toLowerCase().includes('margarita')) {
          return `Alright, so today I'm making my famous mango passion margarita. First, you want to start with 2 ounces of high-quality tequila blanco. Then we're going to add one ounce of fresh lime juice - and I really stress fresh here, none of that bottled stuff. Next, we're adding half an ounce of passion fruit puree and about an ounce of fresh mango juice. I like to muddle some fresh mango chunks right in the shaker. Add half an ounce of agave nectar to sweeten it up. Shake it really well with ice, and then double strain it over fresh ice. Garnish with a mango slice and a lime wheel. This drink is absolutely perfect for summer parties!`;
        }

        return `Hey everyone, welcome back to my channel! Today I'm going to show you how to make the perfect classic cocktail. First, we're going to start with our base spirit - about 2 ounces. Then we're adding our modifier, which is about three-quarters of an ounce. Don't forget to add a couple dashes of bitters for that extra complexity. We're going to stir this with ice for about 20 to 30 seconds until it's nice and chilled. Then we strain it over a large ice cube in a rocks glass. For the garnish, we're going to express the oils from a fresh citrus peel and drop it right in. And there you have it - the perfect cocktail!`;
      }

      // In production, this would use OpenAI's Whisper API
      if (input.videoFile) {
        const transcription = await openai.audio.transcriptions.create({
          file: input.videoFile as File,
          model: "whisper-1",
          response_format: "text",
          language: "en"
        });

        return transcription;
      }

      throw new Error('No video file provided for transcription');

    } catch (error) {
      log.warn('VideoRecipeAnalyzer', 'Audio transcription failed, continuing without transcript', { error });
      return '';
    }
  }

  /**
   * Analyze video frames for visual recipe content
   */
  private static async analyzeRecipeFrames(frames: string[]): Promise<any> {
    try {
      if (frames.length === 0) {
        return { ingredients: [], steps: [], confidence: 0 };
      }

      log.debug('VideoRecipeAnalyzer', 'Analyzing video frames for recipe content', { frameCount: frames.length });

      if (!hasValidOpenAIKey()) {
        if (!shouldUseMockAI()) {
          throw new Error('Video frame analysis is not configured for production. Set EXPO_PUBLIC_OPENAI_API_KEY.');
        }

        return {
          ingredients: ['Tequila', 'Lime juice', 'Mango puree', 'Agave nectar'],
          steps: ['Add ingredients to shaker', 'Shake with ice', 'Strain over ice', 'Garnish with fruit'],
          confidence: 0.85
        };
      }

      // Analyze key frames using GPT-4 Vision
      const frameAnalyses = await Promise.all(
        frames.slice(0, 5).map(frame => // Limit to 5 frames to control costs
          this.analyzeRecipeFrame(frame)
        )
      );

      // Combine analyses from multiple frames
      const combinedIngredients = [...new Set(frameAnalyses.flatMap(a => a.ingredients))];
      const combinedSteps = [...new Set(frameAnalyses.flatMap(a => a.steps))];
      const avgConfidence = frameAnalyses.reduce((sum, a) => sum + a.confidence, 0) / frameAnalyses.length;

      return {
        ingredients: combinedIngredients,
        steps: combinedSteps,
        confidence: avgConfidence
      };

    } catch (error) {
      log.warn('VideoRecipeAnalyzer', 'Visual frame analysis failed', { error });
      return { ingredients: [], steps: [], confidence: 0 };
    }
  }

  /**
   * Analyze individual frame for recipe content
   */
  private static async analyzeRecipeFrame(frameBase64: string): Promise<any> {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert at analyzing recipe videos. Look at this video frame and identify any visible ingredients, equipment, or recipe preparation steps. Focus on cocktail-making elements."
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this video frame for recipe content. Return a JSON object with 'ingredients' (array of visible ingredients), 'steps' (array of visible preparation steps), and 'confidence' (0-1 score)."
              },
              {
                type: "image_url",
                image_url: {
                  url: frameBase64,
                  detail: "low" // Use low detail for faster/cheaper processing
                }
              }
            ]
          }
        ],
        temperature: 0.3,
        max_tokens: 300,
      });

      const response = completion.choices[0]?.message?.content;
      if (response) {
        return JSON.parse(response);
      }

      return { ingredients: [], steps: [], confidence: 0 };

    } catch (error) {
      log.warn('VideoRecipeAnalyzer', 'Individual frame analysis failed', { error });
      return { ingredients: [], steps: [], confidence: 0 };
    }
  }

  /**
   * Combine audio transcript and visual analysis into structured content
   */
  private static async combineAudioVisualAnalysis(
    transcript: string,
    visualAnalysis: any
  ): Promise<{ title: string; extractedContent: string }> {
    try {
      log.debug('VideoRecipeAnalyzer', 'Combining audio and visual analysis', {
        transcriptLength: transcript.length,
        visualConfidence: visualAnalysis.confidence
      });

      if (!hasValidOpenAIKey()) {
        if (!shouldUseMockAI()) {
          throw new Error('Video analysis combine step is not configured for production. Set EXPO_PUBLIC_OPENAI_API_KEY.');
        }

        const mockTitle = transcript.includes('margarita') ? 'Mango Passion Margarita' : 'Classic Cocktail Recipe';
        return {
          title: mockTitle,
          extractedContent: `${transcript}\n\nVisual elements detected: ${visualAnalysis.ingredients.join(', ')}\nSteps observed: ${visualAnalysis.steps.join(', ')}`
        };
      }

      const prompt = `Analyze this recipe video content and extract a structured recipe. Combine the audio transcript with visual observations to create comprehensive recipe information.

AUDIO TRANSCRIPT:
${transcript}

VISUAL ANALYSIS:
Detected ingredients: ${visualAnalysis.ingredients.join(', ')}
Observed steps: ${visualAnalysis.steps.join(', ')}
Confidence: ${visualAnalysis.confidence}

Please extract:
1. Recipe title
2. Complete ingredient list with measurements (from audio)
3. Step-by-step instructions
4. Any additional details (garnish, serving suggestions, etc.)

Format as:
TITLE: [Recipe Name]
INGREDIENTS: [list with measurements]
INSTRUCTIONS: [numbered steps]
ADDITIONAL: [other relevant details]`;

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are an expert recipe analyzer specializing in video content. Extract structured recipe information from audio transcripts and visual observations."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 800,
      });

      const response = completion.choices[0]?.message?.content || '';

      // Parse the structured response
      const titleMatch = response.match(/TITLE:\s*(.+)/i);
      const title = titleMatch ? titleMatch[1].trim() : 'Video Recipe';

      return {
        title,
        extractedContent: response
      };

    } catch (error) {
      log.warn('VideoRecipeAnalyzer', 'Audio-visual combination failed', { error });
      return {
        title: 'Video Recipe',
        extractedContent: transcript || 'Recipe extracted from video'
      };
    }
  }

  /**
   * Generate mock video recipe analysis for development mode
   */
  private static getMockVideoRecipeAnalysis(input: VideoRecipeInput): FormattedRecipe {
    // Detect recipe type from title/description
    const content = (input.title + ' ' + input.description).toLowerCase();

    if (content.includes('margarita') || content.includes('mango')) {
      return {
        title: input.title || 'Mango Passion Margarita',
        description: 'A tropical twist on the classic margarita with fresh mango and passion fruit flavors.',
        ingredients: [
          { name: 'Tequila Blanco', amount: '2 oz', notes: '100% agave preferred' },
          { name: 'Fresh Lime Juice', amount: '1 oz', notes: 'Freshly squeezed' },
          { name: 'Mango Puree', amount: '1 oz', notes: 'Fresh mango, blended' },
          { name: 'Passion Fruit Puree', amount: '0.5 oz', notes: 'Fresh or high-quality frozen' },
          { name: 'Agave Nectar', amount: '0.5 oz', notes: 'Adjust to taste' },
          { name: 'Mango Chunks', amount: '3-4 pieces', notes: 'For muddling' },
        ],
        instructions: [
          'Muddle fresh mango chunks in shaker',
          'Add tequila, lime juice, mango puree, and passion fruit puree',
          'Add agave nectar and fill shaker with ice',
          'Shake vigorously for 15-20 seconds',
          'Double strain over fresh ice in rocks glass',
          'Garnish with mango slice and lime wheel'
        ],
        garnish: 'Mango slice and lime wheel',
        glassware: 'Rocks Glass',
        difficulty: 'Medium' as const,
        time: '4 min',
        servings: 1,
        tags: ['tequila', 'tropical', 'fresh', 'video-recipe', 'summer']
      };
    }

    // Default video recipe
    return {
      title: input.title || 'Video Recipe',
      description: 'A delicious cocktail recipe captured from video demonstration.',
      ingredients: [
        { name: 'Base Spirit', amount: '2 oz', notes: 'Primary spirit from video' },
        { name: 'Modifier', amount: '0.75 oz', notes: 'Balancing ingredient' },
        { name: 'Citrus', amount: '0.5 oz', notes: 'Fresh citrus juice' },
        { name: 'Sweetener', amount: '0.25 oz', notes: 'Simple syrup or equivalent' },
      ],
      instructions: [
        'Combine ingredients in shaker as demonstrated',
        'Add ice and shake or stir as shown in video',
        'Strain into appropriate glassware',
        'Garnish as demonstrated in video'
      ],
      garnish: 'As shown in video',
      glassware: 'Appropriate glass',
      difficulty: 'Medium' as const,
      time: '3-5 min',
      servings: 1,
      tags: ['video-recipe', 'demonstration', 'cocktail']
    };
  }

  /**
   * Validate video format and size
   */
  static validateVideo(file: File): { valid: boolean; error?: string } {
    const MAX_SIZE = 100 * 1024 * 1024; // 100MB
    const SUPPORTED_FORMATS = ['video/mp4', 'video/mov', 'video/avi', 'video/quicktime'];

    if (file.size > MAX_SIZE) {
      return { valid: false, error: 'Video file too large. Maximum size is 100MB.' };
    }

    if (!SUPPORTED_FORMATS.includes(file.type)) {
      return { valid: false, error: 'Unsupported video format. Please use MP4, MOV, or AVI.' };
    }

    return { valid: true };
  }

  /**
   * Extract recipe from social media video URLs (TikTok, Instagram Reels, etc.)
   */
  static async analyzeVideoFromURL(videoUrl: string): Promise<FormattedRecipe> {
    try {
      log.info('VideoRecipeAnalyzer', 'Analyzing video from URL', { videoUrl });

      // Check if it's a supported social media platform
      const isTikTok = videoUrl.includes('tiktok.com');
      const isInstagramReel = videoUrl.includes('instagram.com') && videoUrl.includes('reel');
      const isYouTube = videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be');

      if (isDevelopmentMode()) {
        log.debug('VideoRecipeAnalyzer', 'Development mode: Using mock URL video analysis', {
          isTikTok,
          isInstagramReel,
          isYouTube
        });
        await new Promise(resolve => setTimeout(resolve, 4000));

        return {
          title: 'Social Media Recipe',
          description: `Recipe extracted from ${isTikTok ? 'TikTok' : isInstagramReel ? 'Instagram Reel' : 'social media'} video.`,
          ingredients: [
            { name: 'Base Spirit', amount: '2 oz', notes: 'From video demonstration' },
            { name: 'Citrus Juice', amount: '1 oz', notes: 'Fresh squeezed' },
            { name: 'Sweetener', amount: '0.5 oz', notes: 'Simple syrup or agave' },
            { name: 'Garnish', amount: '1 piece', notes: 'As shown in video' },
          ],
          instructions: [
            'Follow the technique shown in the video',
            'Combine ingredients as demonstrated',
            'Use the mixing method shown',
            'Garnish and serve as presented'
          ],
          garnish: 'As shown in video',
          glassware: 'Appropriate glass',
          difficulty: 'Medium' as const,
          time: '3-5 min',
          servings: 1,
          tags: ['social-media', 'video-recipe', isTikTok ? 'tiktok' : isInstagramReel ? 'instagram' : 'social']
        };
      }

      // For now, fallback to text extraction from the URL page
      const extractedText = await AIRecipeFormatter.extractTextFromUrl(videoUrl);
      return await AIRecipeFormatter.formatRecipe({
        title: 'Video Recipe',
        extractedText,
        sourceUrl: videoUrl,
        recipeType: 'cocktail'
      });

    } catch (error: any) {
      log.error('VideoRecipeAnalyzer', 'URL video analysis error', error, { videoUrl });

      // Fallback: try to extract any text content from the URL
      try {
        const extractedText = await AIRecipeFormatter.extractTextFromUrl(videoUrl);
        return await AIRecipeFormatter.formatRecipe({
          title: 'Video Recipe',
          extractedText,
          sourceUrl: videoUrl,
          recipeType: 'cocktail'
        });
      } catch (fallbackError) {
        throw new Error(`Unable to analyze video from URL: ${error.message}`);
      }
    }
  }

  /**
   * Get supported video platforms
   */
  static getSupportedPlatforms(): Array<{ name: string; domains: string[]; description: string }> {
    return [
      {
        name: 'TikTok',
        domains: ['tiktok.com'],
        description: 'Recipe videos and tutorials'
      },
      {
        name: 'Instagram Reels',
        domains: ['instagram.com'],
        description: 'Recipe reels and cooking videos'
      },
      {
        name: 'YouTube',
        domains: ['youtube.com', 'youtu.be'],
        description: 'Cocktail tutorials and demonstrations'
      },
      {
        name: 'Twitter/X',
        domains: ['twitter.com', 'x.com'],
        description: 'Recipe videos and quick tutorials'
      }
    ];
  }

  /**
   * Get video analysis status and pricing info
   */
  static getAnalysisInfo(): {
    available: boolean;
    costEstimate: string;
    processingTime: string;
    limitations: string[];
  } {
    return {
      available: true,
      costEstimate: '$0.05-0.15 per video (depending on length)',
      processingTime: '30 seconds to 2 minutes',
      limitations: [
        'Maximum video length: 10 minutes',
        'Maximum file size: 100MB',
        'Supported formats: MP4, MOV, AVI',
        'Best results with clear audio and visible ingredients'
      ]
    };
  }
}

export default VideoRecipeAnalyzer;
