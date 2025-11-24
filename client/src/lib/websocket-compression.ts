/**
 * WebSocket Message Compression Utilities
 * 
 * Provides compression and decompression for large WebSocket messages (>1KB)
 * using browser's native CompressionStream/DecompressionStream APIs.
 * 
 * Format: Compressed messages are sent as base64-encoded strings with a prefix
 * to indicate compression: "COMPRESSED:" followed by the base64 data.
 */

import { logger } from './logger';

const COMPRESSION_THRESHOLD = 1024; // 1KB
const COMPRESSION_PREFIX = 'COMPRESSED:';

/**
 * Check if compression is supported in the current browser
 */
export function isCompressionSupported(): boolean {
  return typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';
}

/**
 * Compress a string using gzip compression
 * @param data - String data to compress
 * @returns Base64-encoded compressed data with prefix, or original if compression failed/not supported
 */
export async function compressMessage(data: string): Promise<string> {
  if (!isCompressionSupported()) {
    logger.warn('Compression not supported in this browser', { component: 'websocket-compression', operation: 'compressMessage' });
    return data;
  }

  try {
    const encoder = new TextEncoder();
    const inputStream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(data));
        controller.close();
      }
    });

    const compressedStream = inputStream.pipeThrough(new CompressionStream('gzip'));
    const chunks: Uint8Array[] = [];
    const reader = compressedStream.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const compressed = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      compressed.set(chunk, offset);
      offset += chunk.length;
    }

    const base64 = btoa(String.fromCharCode(...Array.from(compressed)));
    const compressedData = COMPRESSION_PREFIX + base64;

    const compressionRatio = (compressedData.length / data.length) * 100;
    logger.debug(`Compressed message: ${data.length} → ${compressedData.length} bytes (${compressionRatio.toFixed(1)}%)`, { 
      component: 'websocket-compression', 
      operation: 'compressMessage',
      originalSize: data.length,
      compressedSize: compressedData.length,
      ratio: compressionRatio.toFixed(1)
    });

    return compressedData;
  } catch (error) {
    logger.error('Compression failed', error, { component: 'websocket-compression', operation: 'compressMessage' });
    return data;
  }
}

/**
 * Decompress a compressed message
 * @param data - Compressed data with prefix, or uncompressed data
 * @returns Decompressed string
 */
export async function decompressMessage(data: string): Promise<string> {
  if (!data.startsWith(COMPRESSION_PREFIX)) {
    return data;
  }

  if (!isCompressionSupported()) {
    logger.error('Cannot decompress: Compression not supported in this browser', null, { component: 'websocket-compression', operation: 'decompressMessage' });
    return data;
  }

  try {
    const base64 = data.slice(COMPRESSION_PREFIX.length);
    const compressedData = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

    const inputStream = new ReadableStream({
      start(controller) {
        controller.enqueue(compressedData);
        controller.close();
      }
    });

    const decompressedStream = inputStream.pipeThrough(new DecompressionStream('gzip'));
    const chunks: Uint8Array[] = [];
    const reader = decompressedStream.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const decompressed = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      decompressed.set(chunk, offset);
      offset += chunk.length;
    }

    const decoder = new TextDecoder();
    const result = decoder.decode(decompressed);

    logger.debug(`Decompressed message: ${data.length} → ${result.length} bytes`, { 
      component: 'websocket-compression', 
      operation: 'decompressMessage',
      compressedSize: data.length,
      decompressedSize: result.length
    });

    return result;
  } catch (error) {
    logger.error('Decompression failed', error, { component: 'websocket-compression', operation: 'decompressMessage' });
    return data;
  }
}

/**
 * Check if a message should be compressed based on size
 * @param data - Message data as string
 * @returns True if message exceeds compression threshold
 */
export function shouldCompress(data: string): boolean {
  return isCompressionSupported() && data.length > COMPRESSION_THRESHOLD;
}

/**
 * Compress a WebSocket message object if it exceeds the threshold
 * @param message - Message object to potentially compress
 * @returns Object with compressed flag and data
 */
export async function maybeCompressMessage(message: any): Promise<{
  data: string;
  compressed: boolean;
}> {
  const messageStr = JSON.stringify(message);
  
  if (shouldCompress(messageStr)) {
    const compressed = await compressMessage(messageStr);
    return {
      data: compressed,
      compressed: true
    };
  }

  return {
    data: messageStr,
    compressed: false
  };
}

/**
 * Decompress a WebSocket message if it's compressed
 * @param data - Message data (possibly compressed)
 * @returns Parsed message object
 */
export async function maybeDecompressMessage(data: string): Promise<any> {
  const decompressed = await decompressMessage(data);
  return JSON.parse(decompressed);
}
