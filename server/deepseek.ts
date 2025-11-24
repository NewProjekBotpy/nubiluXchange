import OpenAI from "openai";
import { logError, logWarning, logInfo } from "./utils/logger";

// DeepSeek API configuration - compatible with OpenAI SDK format
const deepseek = new OpenAI({ 
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com",
});

// OpenAI API configuration for image generation and enhanced AI features
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

export async function generatePoster(
  posterId: number, 
  profileImageUrl: string, 
  selectedSkins: string[]
): Promise<string> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      logInfo('OpenAI API key not found, using placeholder poster', { context: 'generatePoster', posterId });
      return 'https://via.placeholder.com/1024x1792/134D37/ffffff?text=Gaming+Account+Poster';
    }

    // Create detailed prompt for gaming account poster
    const skinsList = selectedSkins.length > 0 ? selectedSkins.join(', ') : 'various premium items';
    
    const prompt = `Create a professional gaming marketplace poster for a premium gaming account. Style: Modern, sleek, gaming-themed with dark green (#134D37) and black colors. Content: Gaming account showcase featuring ${skinsList}. Layout: Vertical poster (9:16 ratio) with bold typography, gaming aesthetics, professional presentation suitable for Indonesian gaming marketplace. Include gaming UI elements, achievement badges, and premium account indicators. High quality, professional marketing design.`;

    logInfo(`Generating AI poster for account ${posterId} with items: ${skinsList}`, { context: 'generatePoster', posterId });
    
    if (!openai) {
      throw new Error('OpenAI client not initialized');
    }
    
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1792", // Vertical poster format
      quality: "standard",
      response_format: "url"
    });

    if (!response.data || !response.data[0]?.url) {
      throw new Error('No image URL returned from OpenAI');
    }

    logInfo(`AI poster generated successfully for account ${posterId}`, { context: 'generatePoster', posterId });
    return response.data[0].url;
  } catch (error: any) {
    logError('AI Poster generation failed', {
      error,
      posterId,
      selectedSkins,
      context: 'generatePoster'
    });
    
    // Provide fallback with informative message
    if (error.message?.includes('billing') || error.message?.includes('quota')) {
      throw new Error('AI poster service temporarily unavailable due to billing limits. Please try again later.');
    }
    
    if (error.message?.includes('API key')) {
      throw new Error('AI poster service configuration error. Please contact support.');
    }
    
    // Return placeholder for other errors but don't fail the request
    logInfo('Falling back to placeholder poster due to AI generation error', { context: 'generatePoster', posterId });
    return `https://via.placeholder.com/1024x1792/134D37/ffffff?text=Gaming+Account+%23${posterId}`;
  }
}

export async function processAdminMention(
  chatHistory: any[], 
  chat: any
): Promise<string> {
  try {
    // Prepare chat context for AI analysis
    const chatContext = chatHistory.map(msg => 
      `${msg.senderId === chat.buyerId ? 'Buyer' : 'Seller'}: ${msg.content}`
    ).join('\n');

    // Try OpenAI first, fallback to DeepSeek if needed
    let aiClient = openai;
    let model = "gpt-3.5-turbo";
    
    if (!process.env.OPENAI_API_KEY && process.env.DEEPSEEK_API_KEY) {
      aiClient = deepseek;
      model = "deepseek-chat";
    } else if (!process.env.OPENAI_API_KEY) {
      // No AI available, return static response
      return "Hello! I'm the AI Admin. Fitur AI admin sedang dalam pemeliharaan. Untuk bantuan segera, silakan hubungi customer service kami atau gunakan fitur laporan di aplikasi.";
    }

    if (!aiClient) {
      return "Hello! I'm the AI Admin. Fitur AI admin sedang dalam pemeliharaan. Untuk bantuan segera, silakan hubungi customer service kami atau gunakan fitur laporan di aplikasi.";
    }

    const response = await aiClient.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: `You are an AI admin for NubiluXchange, a gaming marketplace platform in Indonesia. Your role is to:
          1. Mediate disputes between buyers and sellers
          2. Provide transaction guidance and policy clarification
          3. Resolve conflicts fairly and professionally  
          4. Ensure smooth marketplace operations
          5. Protect both parties from fraud
          6. Respond in Bahasa Indonesia for better user experience
          
          Always respond in a helpful, professional tone in Bahasa Indonesia. If a transaction dispute occurs, analyze the conversation and provide a fair resolution. For policy questions, refer to marketplace guidelines.
          
          Respond with JSON in this format: { "response": "your response message in Bahasa Indonesia", "action": "none|warning|suspend|refund|escalate" }`
        },
        {
          role: "user",
          content: `Chat history:\n${chatContext}\n\nPlease analyze this conversation and provide appropriate admin assistance in Bahasa Indonesia.`
        }
      ],
      max_tokens: 300,
      temperature: 0.7
    });

    try {
      const result = JSON.parse(response.choices[0].message.content!);
      
      // Log admin action if needed
      if (result.action !== "none") {
        logInfo(`AI Admin action taken: ${result.action} for chat ${chat.id}`, { context: 'processAdminMention', chatId: chat.id, action: result.action });
      }
      
      return result.response;
    } catch (parseError) {
      // If JSON parsing fails, return the raw response
      logWarning('Failed to parse AI admin JSON response, using raw text', { error: parseError, context: 'processAdminMention', chatId: chat.id });
      return response.choices[0].message.content || "Saya adalah AI Admin yang siap membantu menyelesaikan masalah Anda. Silakan jelaskan keluhan atau pertanyaan Anda dengan lebih detail.";
    }
  } catch (error: any) {
    logError('AI admin processing failed', {
      error,
      chatId: chat.id,
      context: 'processAdminMention'
    });
    
    // Provide fallback based on error type
    if (error.message?.includes('billing') || error.message?.includes('quota')) {
      return "Halo! Saya adalah AI Admin NubiluXchange. Layanan AI sedang mengalami keterbatasan sementara. Untuk bantuan segera, silakan hubungi customer service kami.";
    }
    
    return "Halo! Saya adalah AI Admin NubiluXchange. Saat ini sedang mengalami gangguan teknis, tapi saya tetap siap membantu menyelesaikan masalah Anda. Silakan jelaskan keluhan Anda dan saya akan membantu secepatnya.";
  }
}

export async function moderateContent(content: string): Promise<{
  isAppropriate: boolean;
  confidence: number;
  reason?: string;
}> {
  try {
    const response = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: `You are a content moderator for a gaming marketplace. Analyze content for:
          - Inappropriate language or harassment
          - Scam attempts or fraudulent behavior
          - Spam or promotional content outside guidelines
          - Personal information sharing that could be unsafe
          
          Respond with JSON: { "isAppropriate": boolean, "confidence": number (0-1), "reason": "explanation if inappropriate" }`
        },
        {
          role: "user",
          content: content
        }
      ],
    });

    const result = JSON.parse(response.choices[0].message.content!);
    return {
      isAppropriate: result.isAppropriate,
      confidence: Math.max(0, Math.min(1, result.confidence)),
      reason: result.reason
    };
  } catch (error) {
    logError('Content moderation failed', { error, context: 'moderateContent' });
    // Default to allowing content if moderation fails
    return {
      isAppropriate: true,
      confidence: 0.5,
      reason: "Moderation service unavailable"
    };
  }
}

export async function generateProductDescription(
  title: string,
  gameCategory: string,
  additionalDetails?: string
): Promise<string> {
  try {
    const response = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: `You are a gaming marketplace expert. Generate compelling product descriptions for gaming accounts that highlight key selling points while being honest and accurate. Focus on rank, items, characters, achievements, and account value.`
        },
        {
          role: "user",
          content: `Generate a professional product description for:
          Title: ${title}
          Game: ${gameCategory}
          Additional details: ${additionalDetails || 'None provided'}
          
          Make it engaging but factual, highlighting the account's value proposition.`
        }
      ],
    });

    return response.choices[0].message.content!;
  } catch (error) {
    logError('Description generation failed', { error, context: 'generateProductDescription' });
    return "Premium gaming account with excellent progress and valuable items. Contact seller for detailed information about rank, characters, and achievements.";
  }
}
