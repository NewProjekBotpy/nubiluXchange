import { ImageAnnotatorClient } from '@google-cloud/vision';
import fs from 'fs';
import path from 'path';
import { logError } from './utils/logger';

// DON'T DELETE THIS COMMENT
// Google Cloud Vision API integration for image analysis and OCR
// Requires GOOGLE_CLOUD_API_KEY in environment variables

let visionClient: ImageAnnotatorClient;

// Initialize Google Cloud Vision client
function initializeVisionClient() {
  if (!visionClient) {
    try {
      // Initialize with API key from environment
      visionClient = new ImageAnnotatorClient({
        apiKey: process.env.GOOGLE_CLOUD_API_KEY,
        // For local development/testing, you can also use:
        // keyFilename: './path/to/service-account.json'
      });
    } catch (error) {
      logError('Failed to initialize Google Cloud Vision client', { error, context: 'initializeVisionClient' });
      throw new Error('Google Cloud Vision initialization failed');
    }
  }
  return visionClient;
}

export interface ImageAnalysisResult {
  text?: string;
  labels?: Array<{ description: string; score: number }>;
  objects?: Array<{ name: string; score: number }>;
  safeSearch?: {
    adult: string;
    medical: string;
    spoofed: string;
    violence: string;
    racy: string;
  };
}

export interface OCRResult {
  text: string;
  confidence: number;
  boundingBoxes?: Array<{
    text: string;
    vertices: Array<{ x: number; y: number }>;
  }>;
}

/**
 * Extract text from image using Google Cloud Vision OCR
 */
export async function extractTextFromImage(
  imagePath: string
): Promise<OCRResult> {
  try {
    const client = initializeVisionClient();
    
    // Check if file exists
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image file not found: ${imagePath}`);
    }

    // Read image file
    const imageBuffer = fs.readFileSync(imagePath);

    // Perform text detection
    const [result] = await client.textDetection({
      image: {
        content: imageBuffer.toString('base64'),
      },
    });

    const textAnnotations = result.textAnnotations;
    if (!textAnnotations || textAnnotations.length === 0) {
      return {
        text: '',
        confidence: 0,
        boundingBoxes: []
      };
    }

    // First annotation contains the full text
    const fullText = textAnnotations[0].description || '';
    
    // Calculate average confidence from all detections
    const confidenceSum = textAnnotations.reduce((sum, annotation) => {
      return sum + (annotation.confidence || 0);
    }, 0);
    const avgConfidence = textAnnotations.length > 0 ? confidenceSum / textAnnotations.length : 0;

    // Extract bounding boxes for individual words/phrases
    const boundingBoxes = textAnnotations.slice(1).map(annotation => ({
      text: annotation.description || '',
      vertices: annotation.boundingPoly?.vertices?.map(vertex => ({
        x: vertex.x || 0,
        y: vertex.y || 0
      })) || []
    }));

    return {
      text: fullText,
      confidence: avgConfidence,
      boundingBoxes
    };
  } catch (error) {
    logError('OCR extraction failed', { error, context: 'extractTextFromImage' });
    throw new Error(`Failed to extract text from image: ${error}`);
  }
}

/**
 * Analyze image content with multiple detection features
 */
export async function analyzeImage(
  imagePath: string,
  options: {
    detectText?: boolean;
    detectLabels?: boolean;
    detectObjects?: boolean;
    safeSearch?: boolean;
  } = {}
): Promise<ImageAnalysisResult> {
  try {
    const client = initializeVisionClient();
    
    // Check if file exists
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image file not found: ${imagePath}`);
    }

    // Read image file
    const imageBuffer = fs.readFileSync(imagePath);
    
    // Build features array based on options
    const features = [];
    if (options.detectText !== false) {
      features.push({ type: 'TEXT_DETECTION' });
    }
    if (options.detectLabels !== false) {
      features.push({ type: 'LABEL_DETECTION', maxResults: 10 });
    }
    if (options.detectObjects) {
      features.push({ type: 'OBJECT_LOCALIZATION' });
    }
    if (options.safeSearch) {
      features.push({ type: 'SAFE_SEARCH_DETECTION' });
    }

    // Perform multi-feature analysis
    const [result] = await client.annotateImage({
      image: {
        content: imageBuffer.toString('base64'),
      },
      features: features,
    });

    const analysis: ImageAnalysisResult = {};

    // Extract text if requested
    if (options.detectText !== false && result.textAnnotations) {
      analysis.text = result.textAnnotations[0]?.description || '';
    }

    // Extract labels if requested
    if (options.detectLabels !== false && result.labelAnnotations) {
      analysis.labels = result.labelAnnotations.map(label => ({
        description: label.description || '',
        score: label.score || 0
      }));
    }

    // Extract objects if requested
    if (options.detectObjects && result.localizedObjectAnnotations) {
      analysis.objects = result.localizedObjectAnnotations.map(obj => ({
        name: obj.name || '',
        score: obj.score || 0
      }));
    }

    // Extract safe search if requested
    if (options.safeSearch && result.safeSearchAnnotation) {
      const safeSearch = result.safeSearchAnnotation;
      analysis.safeSearch = {
        adult: (safeSearch.adult?.toString() || 'UNKNOWN'),
        medical: (safeSearch.medical?.toString() || 'UNKNOWN'),
        spoofed: (safeSearch.spoof?.toString() || 'UNKNOWN'),
        violence: (safeSearch.violence?.toString() || 'UNKNOWN'),
        racy: (safeSearch.racy?.toString() || 'UNKNOWN')
      };
    }

    return analysis;
  } catch (error) {
    logError('Image analysis failed', { error, context: 'analyzeImage' });
    throw new Error(`Failed to analyze image: ${error}`);
  }
}

/**
 * Verify identity document using OCR and content analysis
 * Useful for KYC verification in rekber applications
 */
export async function verifyIdentityDocument(
  imagePath: string
): Promise<{
  isValid: boolean;
  extractedText: string;
  confidence: number;
  detectedLabels: string[];
  safetyCheck: boolean;
  analysis?: {
    containsPersonalInfo: boolean;
    documentType?: string;
    riskFlags: string[];
  };
}> {
  try {
    // Perform comprehensive analysis
    const [ocrResult, analysis] = await Promise.all([
      extractTextFromImage(imagePath),
      analyzeImage(imagePath, {
        detectText: true,
        detectLabels: true,
        safeSearch: true
      })
    ]);

    const extractedText = ocrResult.text.toLowerCase();
    const labels = analysis.labels?.map(l => l.description.toLowerCase()) || [];
    
    // Check for document-related keywords
    const documentKeywords = [
      'identity', 'card', 'license', 'passport', 'id',
      'ktp', 'sim', 'paspor', 'identitas', 'dokumen'
    ];
    
    const containsDocumentTerms = documentKeywords.some(keyword => 
      extractedText.includes(keyword) || labels.some(label => label.includes(keyword))
    );

    // Check for personal information patterns
    const containsPersonalInfo = /\d{16}|\d{4}-\d{2}-\d{2}|born|birth|alamat|address/.test(extractedText);
    
    // Safety checks
    const safetyCheck = analysis.safeSearch ? 
      analysis.safeSearch.adult === 'VERY_UNLIKELY' &&
      analysis.safeSearch.violence === 'VERY_UNLIKELY' &&
      analysis.safeSearch.racy === 'VERY_UNLIKELY' : true;

    // Risk flags
    const riskFlags: string[] = [];
    if (ocrResult.confidence < 0.7) {
      riskFlags.push('Low OCR confidence');
    }
    if (!containsDocumentTerms && !containsPersonalInfo) {
      riskFlags.push('Document content not detected');
    }
    if (!safetyCheck) {
      riskFlags.push('Safety check failed');
    }

    return {
      isValid: containsDocumentTerms || containsPersonalInfo,
      extractedText: ocrResult.text,
      confidence: ocrResult.confidence,
      detectedLabels: labels,
      safetyCheck,
      analysis: {
        containsPersonalInfo,
        documentType: labels.find(l => 
          ['card', 'license', 'passport', 'document'].some(type => l.includes(type))
        ),
        riskFlags
      }
    };
  } catch (error) {
    logError('Identity document verification failed', { error, context: 'verifyIdentityDocument' });
    throw new Error(`Failed to verify identity document: ${error}`);
  }
}

/**
 * Analyze receipt or financial document
 * Useful for payment verification in rekber transactions
 */
export async function analyzeFinancialDocument(
  imagePath: string
): Promise<{
  extractedText: string;
  confidence: number;
  detectedAmounts: string[];
  bankInfo?: string;
  transactionDate?: string;
  isReceiptLike: boolean;
}> {
  try {
    const ocrResult = await extractTextFromImage(imagePath);
    const text = ocrResult.text;
    
    // Extract monetary amounts (Rupiah format)
    const amountRegex = /Rp\s*[\d,.]+|IDR\s*[\d,.]+|\d+\.\d{3}(?:\.\d{3})*(?:,\d{2})?/g;
    const detectedAmounts = text.match(amountRegex) || [];
    
    // Extract bank information
    const bankRegex = /BCA|BNI|BRI|Mandiri|CIMB|Permata|Bank|ATM|Transfer/gi;
    const bankInfo = text.match(bankRegex)?.[0];
    
    // Extract date patterns
    const dateRegex = /\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{2,4}/gi;
    const transactionDate = text.match(dateRegex)?.[0];
    
    // Check if it looks like a receipt
    const receiptKeywords = [
      'receipt', 'transfer', 'payment', 'transaction', 'struk', 'bukti', 
      'pembayaran', 'transfer', 'transaksi', 'saldo', 'balance'
    ];
    const isReceiptLike = receiptKeywords.some(keyword => 
      text.toLowerCase().includes(keyword)
    );

    return {
      extractedText: text,
      confidence: ocrResult.confidence,
      detectedAmounts,
      bankInfo,
      transactionDate,
      isReceiptLike
    };
  } catch (error) {
    logError('Financial document analysis failed', { error, context: 'analyzeFinancialDocument' });
    throw new Error(`Failed to analyze financial document: ${error}`);
  }
}