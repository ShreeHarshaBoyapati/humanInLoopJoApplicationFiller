import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

/**
 * File parser utilities for extracting text from different file formats
 */

/**
 * Extract text from a PDF file buffer using pdf-parse v2 API
 * @param buffer - The PDF file buffer
 * @returns Promise resolving to extracted text
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy();
    return result.text;
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error('Failed to extract text from PDF file');
  }
}

/**
 * Extract text from a DOCX file buffer using mammoth
 * @param buffer - The DOCX file buffer
 * @returns Promise resolving to extracted text
 */
export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    console.error('Error parsing DOCX:', error);
    throw new Error('Failed to extract text from DOCX file');
  }
}

/**
 * Extract text from a DOC file buffer
 * Note: mammoth only supports DOCX, not legacy DOC files
 * TODO: Implement DOC parsing using a different library like antiword or libreoffice
 * @param buffer - The DOC file buffer
 * @returns Promise resolving to extracted text
 */
export async function extractTextFromDoc(buffer: Buffer): Promise<string> {
  // Legacy DOC format is not supported by mammoth
  // Would need a different library like antiword or libreoffice conversion
  console.log('Extracting text from legacy DOC format, buffer size:', buffer.length);
  throw new Error(
    'Legacy DOC format is not supported. Please convert to DOCX format or use a PDF file.'
  );
}

/**
 * Extract text from a TXT file buffer
 * @param buffer - The TXT file buffer
 * @returns Promise resolving to extracted text
 */
export async function extractTextFromTxt(buffer: Buffer): Promise<string> {
  // Simple implementation - just decode the buffer as UTF-8 text
  return buffer.toString('utf-8');
}

/**
 * Parse a file buffer and extract text based on file extension
 * @param buffer - The file buffer
 * @param fileName - The original file name (used to determine file type)
 * @returns Promise resolving to extracted text
 * @throws Error if file type is not supported
 */
export async function parseFile(buffer: Buffer, fileName: string): Promise<string> {
  const extension = fileName.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'pdf':
      return extractTextFromPdf(buffer);
    case 'docx':
      return extractTextFromDocx(buffer);
    case 'doc':
      return extractTextFromDoc(buffer);
    case 'txt':
      return extractTextFromTxt(buffer);
    default:
      throw new Error(`Unsupported file type: ${extension}. Supported types: pdf, docx, txt`);
  }
}
