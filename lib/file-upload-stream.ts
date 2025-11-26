import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';

export interface StreamUploadResult {
  file: File | null;
  error: string | null;
  bytesRead: number;
}

/**
 * Safely stream and validate file upload with progressive size checking
 * @param request - The NextRequest containing the file
 * @param maxSize - Maximum file size in bytes
 * @param validTypes - Array of valid MIME types
 * @returns StreamUploadResult with file or error
 */
export async function streamFileUpload(
  request: NextRequest,
  maxSize: number,
  validTypes: string[]
): Promise<StreamUploadResult> {
  try {
    // Parse the multipart form data boundary from content-type
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return {
        file: null,
        error: 'Invalid content type. Expected multipart/form-data',
        bytesRead: 0,
      };
    }

    // Get the request body as a stream
    const reader = request.body?.getReader();
    if (!reader) {
      return {
        file: null,
        error: 'No request body',
        bytesRead: 0,
      };
    }

    // Read chunks and check size progressively
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    const decoder = new TextDecoder();
    let headersParsed = false;
    let fileType = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        totalBytes += value.length;
        
        // Check size limit before accumulating more data
        if (totalBytes > maxSize) {
          reader.cancel(); // Stop reading immediately
          return {
            file: null,
            error: `File too large. Maximum size is ${maxSize / 1024 / 1024}MB`,
            bytesRead: totalBytes,
          };
        }
        
        chunks.push(value);
        
        // Parse headers from the first chunks if not done yet
        if (!headersParsed && chunks.length > 0) {
          const headerData = decoder.decode(
            new Uint8Array(chunks.flatMap(chunk => Array.from(chunk)).slice(0, 1024))
          );
          
          // Extract filename (used for early validation)
          const fileNameMatch = headerData.match(/filename="([^"]+)"/);
          if (fileNameMatch) {
            // Note: fileName stored for potential logging/debugging, not currently used
            void fileNameMatch[1];
          }
          
          // Extract content-type
          const contentTypeMatch = headerData.match(/Content-Type:\s*([^\r\n]+)/i);
          if (contentTypeMatch) {
            fileType = contentTypeMatch[1].trim();
            headersParsed = true;
            
            // Validate file type early
            if (!validTypes.includes(fileType)) {
              reader.cancel();
              return {
                file: null,
                error: `Invalid file type: ${fileType}. Allowed types: ${validTypes.join(', ')}`,
                bytesRead: totalBytes,
              };
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Combine all chunks
    const allBytes = new Uint8Array(totalBytes);
    let position = 0;
    for (const chunk of chunks) {
      allBytes.set(chunk, position);
      position += chunk.length;
    }

    // Parse the multipart data
    const formData = await parseMultipartData(allBytes, contentType);
    const file = formData.get('file') as File;
    
    if (!file) {
      return {
        file: null,
        error: 'No file found in request',
        bytesRead: totalBytes,
      };
    }

    // Final validation
    if (!validTypes.includes(file.type)) {
      return {
        file: null,
        error: `Invalid file type: ${file.type}. Allowed types: ${validTypes.join(', ')}`,
        bytesRead: totalBytes,
      };
    }

    return {
      file,
      error: null,
      bytesRead: totalBytes,
    };
  } catch (error) {
    logger.error('Stream upload error', { operation: 'file.upload_stream_error' }, error instanceof Error ? error : new Error(String(error)));
    return {
      file: null,
      error: error instanceof Error ? error.message : 'Failed to process upload',
      bytesRead: 0,
    };
  }
}

/**
 * Parse multipart form data from bytes
 * This is a simplified implementation for handling file uploads
 */
async function parseMultipartData(
  bytes: Uint8Array,
  contentType: string
): Promise<FormData> {
  // Extract boundary from content-type
  const boundaryMatch = contentType.match(/boundary=([^;]+)/);
  if (!boundaryMatch) {
    throw new Error('No boundary found in content-type');
  }
  
  const boundary = boundaryMatch[1].trim();
  
  // Convert bytes to string for parsing (this is simplified)
  const decoder = new TextDecoder();
  const text = decoder.decode(bytes);
  
  // Find the file content between boundaries
  const parts = text.split(`--${boundary}`);
  
  const formData = new FormData();
  
  for (const part of parts) {
    if (part.includes('Content-Disposition: form-data')) {
      // Extract field name
      const nameMatch = part.match(/name="([^"]+)"/);
      if (!nameMatch) continue;
      
      const fieldName = nameMatch[1];
      
      // Check if it's a file
      const fileNameMatch = part.match(/filename="([^"]+)"/);
      if (fileNameMatch) {
        const fileName = fileNameMatch[1];
        
        // Extract content type
        const contentTypeMatch = part.match(/Content-Type:\s*([^\r\n]+)/);
        const fileType = contentTypeMatch ? contentTypeMatch[1].trim() : 'application/octet-stream';
        
        // Find the actual file content (after double CRLF)
        const contentStart = part.indexOf('\r\n\r\n');
        if (contentStart === -1) continue;
        
        // Extract binary content
        const contentStartIndex = text.indexOf(part) + contentStart + 4;
        const contentEndBoundary = `\r\n--${boundary}`;
        const contentEndIndex = text.indexOf(contentEndBoundary, contentStartIndex);
        
        if (contentEndIndex === -1) continue;
        
        // Get the file bytes
        const fileBytes = bytes.slice(
          new TextEncoder().encode(text.substring(0, contentStartIndex)).length,
          new TextEncoder().encode(text.substring(0, contentEndIndex)).length
        );
        
        // Create file object
        const file = new File([fileBytes], fileName, { type: fileType });
        formData.append(fieldName, file);
      }
    }
  }
  
  return formData;
}

/**
 * Alternative implementation using the standard FormData API
 * This is simpler but doesn't allow progressive size checking
 */
export async function safeFormDataParse(
  request: NextRequest,
  maxSize: number
): Promise<{ formData: FormData | null; error: string | null }> {
  try {
    // Check content-length header first
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > maxSize) {
      return {
        formData: null,
        error: `File too large. Maximum size is ${maxSize / 1024 / 1024}MB`,
      };
    }

    // Parse form data
    const formData = await request.formData();
    
    // Check file size after parsing
    const file = formData.get('file') as File;
    if (file && file.size > maxSize) {
      return {
        formData: null,
        error: `File too large. Maximum size is ${maxSize / 1024 / 1024}MB`,
      };
    }

    return {
      formData,
      error: null,
    };
  } catch (error) {
    return {
      formData: null,
      error: error instanceof Error ? error.message : 'Failed to parse form data',
    };
  }
}