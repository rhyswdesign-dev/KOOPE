import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { log } from '../lib/logger';
import { supabase } from '../lib/supabase';

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
      const audioFileInfo = await FileSystem.getInfoAsync(audioUri);
      if (!audioFileInfo.exists) {
        throw new Error('Audio file not found');
      }

      const audioBase64 = await FileSystem.readAsStringAsync(audioUri, {
        encoding: 'base64',
      });

      // Route through the voice-transcribe Edge Function — Whisper key never touches the client
      const { data, error } = await supabase.functions.invoke('voice-transcribe', {
        body: { audioBase64, mimeType: 'audio/m4a' },
      });

      if (error || !data?.transcript) {
        log.error('VoiceRecipeService', 'Transcription edge function error', error);
        throw new Error('Transcription service unavailable');
      }

      log.info('VoiceRecipeService', 'Transcription successful', { length: data.transcript.length });
      return data.transcript as string;
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
