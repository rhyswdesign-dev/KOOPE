import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { log } from '../lib/logger';

export interface VoiceRecipeInput {
  title?: string;
  instructions?: string;
  ingredients?: string;
  notes?: string;
}

export class VoiceRecipeService {
  private recording: Audio.Recording | null = null;
  private isRecording = false;

  /**
   * Request microphone permissions
   */
  static async requestPermissions(): Promise<boolean> {
    log.fn('VoiceRecipeService', 'requestPermissions');

    try {
      const { status } = await Audio.requestPermissionsAsync();
      const granted = status === 'granted';
      log.info('VoiceRecipeService', 'Audio permission request', { granted, status });
      return granted;
    } catch (error: any) {
      log.error('VoiceRecipeService', 'Error requesting audio permissions', error);
      return false;
    }
  }

  /**
   * Start voice recording
   */
  async startRecording(): Promise<void> {
    log.fn('VoiceRecipeService', 'startRecording');

    try {
      log.debug('VoiceRecipeService', 'Requesting audio permissions');
      const hasPermission = await VoiceRecipeService.requestPermissions();
      if (!hasPermission) {
        throw new Error('Microphone permission denied');
      }

      log.debug('VoiceRecipeService', 'Setting up audio mode');
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: true,
      });

      log.debug('VoiceRecipeService', 'Creating audio recording');
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      this.recording = recording;
      this.isRecording = true;
      log.info('VoiceRecipeService', 'Recording started successfully');

    } catch (error: any) {
      log.error('VoiceRecipeService', 'Failed to start recording', error);
      throw new Error(`Failed to start recording: ${error.message}`);
    }
  }

  /**
   * Stop voice recording and return audio file URI
   */
  async stopRecording(): Promise<string | null> {
    log.fn('VoiceRecipeService', 'stopRecording');

    try {
      if (!this.recording || !this.isRecording) {
        throw new Error('No active recording');
      }

      log.debug('VoiceRecipeService', 'Stopping and unloading recording');
      await this.recording.stopAndUnloadAsync();

      const uri = this.recording.getURI();
      log.info('VoiceRecipeService', 'Recording saved', { uri });

      this.isRecording = false;
      this.recording = null;

      return uri;

    } catch (error: any) {
      log.error('VoiceRecipeService', 'Failed to stop recording', error);
      this.isRecording = false;
      this.recording = null;
      throw new Error(`Failed to stop recording: ${error.message}`);
    }
  }

  /**
   * Cancel ongoing recording
   */
  async cancelRecording(): Promise<void> {
    log.fn('VoiceRecipeService', 'cancelRecording');

    try {
      if (this.recording && this.isRecording) {
        await this.recording.stopAndUnloadAsync();
        log.info('VoiceRecipeService', 'Recording cancelled');
      }
      this.isRecording = false;
      this.recording = null;
    } catch (error: any) {
      log.error('VoiceRecipeService', 'Error cancelling recording', error);
    }
  }

  /**
   * Convert audio to text using OpenAI Whisper API
   * In development mode, returns mock transcription
   */
  async transcribeAudio(audioUri: string): Promise<string> {
    log.fn('VoiceRecipeService', 'transcribeAudio', { audioUri });

    try {
      // Check if in development mode (no real speech-to-text service)
      const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
      const isDevelopmentMode = !apiKey ||
                               apiKey === 'your-openai-api-key-here' ||
                               apiKey === 'dev-key' ||
                               !apiKey.startsWith('sk-');

      if (isDevelopmentMode) {
        log.warn('VoiceRecipeService', 'Development mode: Using mock transcription', {
          hint: 'Set EXPO_PUBLIC_OPENAI_API_KEY in .env to use real Whisper API'
        });
        await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate processing delay

        return this.getMockTranscription();
      }

      log.info('VoiceRecipeService', 'Using OpenAI Whisper API for transcription');

      // Read audio file
      const audioFileInfo = await FileSystem.getInfoAsync(audioUri);
      if (!audioFileInfo.exists) {
        throw new Error('Audio file not found');
      }

      // Prepare FormData for Whisper API
      const formData = new FormData();

      // Read file as base64 and create blob
      const base64Audio = await FileSystem.readAsStringAsync(audioUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Convert base64 to blob
      const blob = await (await fetch(`data:audio/m4a;base64,${base64Audio}`)).blob();
      formData.append('file', blob, 'recording.m4a');
      formData.append('model', 'whisper-1');
      formData.append('language', 'en');
      formData.append('response_format', 'text');

      log.api('POST', 'https://api.openai.com/v1/audio/transcriptions', {
        model: 'whisper-1',
        fileSize: audioFileInfo.size
      });

      // Call Whisper API
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        log.error('VoiceRecipeService', 'Whisper API error', undefined, {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`Whisper API error: ${response.status} ${response.statusText}`);
      }

      const transcription = await response.text();
      log.info('VoiceRecipeService', 'Transcription successful', {
        length: transcription.length
      });

      return transcription;

    } catch (error: any) {
      log.error('VoiceRecipeService', 'Transcription failed', error);
      throw new Error(`Failed to transcribe audio: ${error.message}`);
    }
  }

  /**
   * Parse transcribed text into recipe components using AI
   */
  async parseVoiceRecipe(transcription: string): Promise<VoiceRecipeInput> {
    log.fn('VoiceRecipeService', 'parseVoiceRecipe', { transcriptionLength: transcription.length });

    try {
      // Use basic text parsing to extract recipe components
      const result: VoiceRecipeInput = {};

      // Simple keyword-based parsing
      const text = transcription.toLowerCase();

      // Extract title
      const titleMatch = text.match(/(?:recipe for|making|called|name is) (.+?)(?:\.|,|$)/i);
      if (titleMatch) {
        result.title = titleMatch[1].trim();
      }

      // Extract ingredients section
      const ingredientsMatch = text.match(/(?:ingredients?|you need|add|use)(.+?)(?:instructions?|directions?|steps?|method|now|then|$)/i);
      if (ingredientsMatch) {
        result.ingredients = ingredientsMatch[1].trim();
      }

      // Extract instructions section
      const instructionsMatch = text.match(/(?:instructions?|directions?|steps?|method|now|then)(.+?)(?:notes?|tips?|serve|enjoy|$)/i);
      if (instructionsMatch) {
        result.instructions = instructionsMatch[1].trim();
      }

      // Use remaining text as notes
      result.notes = transcription;

      log.info('VoiceRecipeService', 'Recipe parsed', {
        hasTitle: !!result.title,
        hasIngredients: !!result.ingredients,
        hasInstructions: !!result.instructions
      });

      return result;

    } catch (error) {
      log.error('VoiceRecipeService', 'Recipe parsing error', error);
      return { notes: transcription };
    }
  }

  /**
   * Get recording status
   */
  getRecordingStatus(): { isRecording: boolean } {
    return { isRecording: this.isRecording };
  }

  /**
   * Mock transcription for development/testing
   */
  private getMockTranscription(): string {
    const mockTranscriptions = [
      "This is a recipe for a Classic Old Fashioned. You'll need 2 ounces of bourbon whiskey, a quarter ounce of simple syrup, 2 dashes of Angostura bitters, and an orange peel for garnish. First, add the simple syrup and bitters to a rocks glass. Add the whiskey and stir to combine. Add a large ice cube and express the orange peel oils over the drink before dropping it in.",

      "I want to make a Virgin Mojito mocktail. The ingredients are 8 to 10 fresh mint leaves, 1 ounce of fresh lime juice, three quarters ounce of simple syrup, and 4 ounces of sparkling water. Start by gently muddling the mint leaves in the bottom of a glass. Add the lime juice and simple syrup, then fill with ice and stir. Top with sparkling water and stir once more. Garnish with a fresh mint sprig and lime wheel.",

      "This is about bourbon tasting techniques. Pour half an ounce of bourbon into a tulip-shaped glass. First, observe the color and viscosity. Then nose the whiskey with your mouth slightly open. Take a small sip and let it coat your palate. Try to identify flavors like vanilla, caramel, oak, and spice. This should take about 10 minutes for a proper tasting."
    ];

    return mockTranscriptions[Math.floor(Math.random() * mockTranscriptions.length)];
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    try {
      if (this.recording) {
        await this.cancelRecording();
      }
    } catch (error) {
      log.error('VoiceRecipeService', 'Cleanup error', error);
    }
  }
}