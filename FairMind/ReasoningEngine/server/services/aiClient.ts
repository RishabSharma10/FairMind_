import { HfInference } from '@huggingface/inference';
import { CohereClient } from 'cohere-ai';

const AI_PROVIDER = process.env.AI_PROVIDER || 'huggingface';

// Hugging Face client
const hf = process.env.HUGGINGFACE_API_KEY
  ? new HfInference(process.env.HUGGINGFACE_API_KEY)
  : null;

// Cohere client for speech-to-text
const cohere = process.env.COHERE_API_KEY
  ? new CohereClient({ token: process.env.COHERE_API_KEY })
  : null;

export interface AIResolution {
  id: string;
  title: string;
  description: string;
  ai_score: number;
  suggested_best: number;
}

export interface AIResolutionResponse {
  resolutions: AIResolution[];
}

export async function generateResolutions(messages: string[]): Promise<AIResolutionResponse> {
  if (!hf) {
    throw new Error('Hugging Face API key not configured');
  }

  const conversationText = messages.join('\n');
  const prompt = buildResolutionPrompt(conversationText);

  try {
    const response = await hf.textGeneration({
      model: 'mistralai/Mistral-7B-Instruct-v0.2',
      inputs: prompt,
      parameters: {
        max_new_tokens: 800,
        temperature: 0.7,
        top_p: 0.95,
        return_full_text: false,
      },
    });

    const generatedText = response.generated_text;
    
    // Try to parse JSON from the response
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed;
    }

    // Fallback to template-based generation
    return generateFallbackResolutions();
  } catch (error) {
    console.error('AI generation error:', error);
    // Retry once
    try {
      const response = await hf.textGeneration({
        model: 'mistralai/Mistral-7B-Instruct-v0.2',
        inputs: prompt,
        parameters: {
          max_new_tokens: 600,
          temperature: 0.5,
        },
      });
      
      const jsonMatch = response.generated_text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (retryError) {
      console.error('Retry failed:', retryError);
    }

    return generateFallbackResolutions();
  }
}

export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  if (!cohere) {
    throw new Error('Cohere API key not configured');
  }

  try {
    // Note: Cohere doesn't have direct audio transcription
    // For production, you'd use a service like Whisper API or Deepgram
    // This is a placeholder implementation
    throw new Error('Audio transcription requires additional service configuration');
  } catch (error) {
    console.error('Transcription error:', error);
    throw new Error('Failed to transcribe audio. Please try again or use text input.');
  }
}

function buildResolutionPrompt(conversation: string): string {
  return `You are a professional mediator analyzing a dispute between two people. Based on their conversation, generate EXACTLY 3 resolution options.

Conversation:
${conversation}

Generate a JSON response with exactly this structure (no extra text, just valid JSON):
{
  "resolutions": [
    {
      "id": "1",
      "title": "Short title",
      "description": "Detailed description of the resolution",
      "ai_score": 85,
      "suggested_best": 1
    },
    {
      "id": "2",
      "title": "Short title",
      "description": "Detailed description of the resolution",
      "ai_score": 75,
      "suggested_best": 0
    },
    {
      "id": "3",
      "title": "Short title",
      "description": "Detailed description of the resolution",
      "ai_score": 65,
      "suggested_best": 0
    }
  ]
}

Guidelines:
- ai_score: confidence level 0-100
- suggested_best: 1 for the best option, 0 for others
- Make resolutions balanced, fair, and actionable
- Consider both perspectives equally

Respond with ONLY valid JSON, no additional text:`;
}

function generateFallbackResolutions(): AIResolutionResponse {
  return {
    resolutions: [
      {
        id: '1',
        title: 'Compromise Solution',
        description: 'Both parties meet in the middle by making equal concessions to reach a balanced agreement that addresses core concerns.',
        ai_score: 80,
        suggested_best: 1,
      },
      {
        id: '2',
        title: 'Time-Based Trial',
        description: 'Implement one approach for a defined trial period, then evaluate and adjust based on results before committing long-term.',
        ai_score: 70,
        suggested_best: 0,
      },
      {
        id: '3',
        title: 'Alternative Perspective',
        description: 'Explore a third option that neither party initially considered, potentially solving the underlying issue differently.',
        ai_score: 65,
        suggested_best: 0,
      },
    ],
  };
}
