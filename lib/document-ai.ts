import { DocumentProcessorServiceClient } from '@google-cloud/documentai';

// Document AI configuration
const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
const location = process.env.GOOGLE_CLOUD_LOCATION || 'us';
const processorId = process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_ID;
const apiKey = process.env.GOOGLE_CLOUD_API_KEY;

// Initialize the client with API key
const client = new DocumentProcessorServiceClient({
  apiEndpoint: `${location}-documentai.googleapis.com`,
  // Use API key authentication
  auth: {
    apiKey: apiKey,
  } as any, // Type assertion needed as the types don't directly support API key
});

export interface ExtractedReceiptData {
  vendor: string | null;
  total: number | null;
  date: string | null;
  netAmount?: number | null;
  taxAmount?: number | null;
  invoiceNumber?: string | null;
  currency?: string | null;
  items?: Array<{
    description: string;
    amount: number;
    quantity?: number;
  }>;
}

export async function processReceiptWithDocumentAI(
  fileBuffer: Buffer,
  mimeType: string
): Promise<ExtractedReceiptData> {
  if (!projectId || !processorId || !apiKey) {
    throw new Error('Document AI configuration missing. Please check environment variables.');
  }

  try {
    // The full resource name of the processor
    const name = `projects/${projectId}/locations/${location}/processors/${processorId}`;

    // Configure the request
    const request = {
      name,
      rawDocument: {
        content: fileBuffer.toString('base64'),
        mimeType: mimeType,
      },
    };

    // Process the document
    const [result] = await client.processDocument(request);
    
    if (!result.document) {
      throw new Error('No document returned from Document AI');
    }

    const { document } = result;
    
    // Extract entities from the document
    const entities = document.entities || [];
    
    // Helper function to find entity by type
    const findEntity = (type: string) => {
      const entity = entities.find(e => 
        e.type?.toLowerCase().includes(type.toLowerCase()) ||
        e.type?.toLowerCase().replace(/_/g, ' ').includes(type.toLowerCase())
      );
      return entity?.mentionText || entity?.normalizedValue?.text || null;
    };

    // Helper function to extract monetary value
    const extractMoney = (type: string): number | null => {
      const entity = entities.find(e => 
        e.type?.toLowerCase().includes(type.toLowerCase()) ||
        e.type?.toLowerCase().replace(/_/g, ' ').includes(type.toLowerCase())
      );
      
      if (entity?.normalizedValue?.moneyValue) {
        const money = entity.normalizedValue.moneyValue;
        // Convert to number (units + nanos/1e9)
        return Number(money.units || 0) + Number(money.nanos || 0) / 1e9;
      }
      
      // Fallback to text extraction
      const text = entity?.mentionText || entity?.normalizedValue?.text;
      if (text) {
        const cleaned = text.replace(/[^0-9.-]/g, '');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? null : parsed;
      }
      
      return null;
    };

    // Helper function to extract date
    const extractDate = (): string | null => {
      const dateEntity = entities.find(e => 
        e.type?.toLowerCase().includes('date') ||
        e.type?.toLowerCase() === 'invoice_date' ||
        e.type?.toLowerCase() === 'due_date'
      );
      
      if (dateEntity?.normalizedValue?.dateValue) {
        const date = dateEntity.normalizedValue.dateValue;
        // Format as YYYY-MM-DD
        return `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
      }
      
      // Fallback to text
      return dateEntity?.mentionText || null;
    };

    // Extract line items if available
    const extractLineItems = () => {
      const items: ExtractedReceiptData['items'] = [];
      
      const lineItemEntities = entities.filter(e => 
        e.type?.toLowerCase().includes('line_item') ||
        e.type?.toLowerCase().includes('item')
      );
      
      lineItemEntities.forEach(item => {
        const properties = item.properties || [];
        
        const description = properties.find(p => 
          p.type?.toLowerCase().includes('description') ||
          p.type?.toLowerCase().includes('item')
        )?.mentionText || item.mentionText || '';
        
        const amountProp = properties.find(p => 
          p.type?.toLowerCase().includes('amount') ||
          p.type?.toLowerCase().includes('price')
        );
        
        let amount = 0;
        if (amountProp?.normalizedValue?.moneyValue) {
          const money = amountProp.normalizedValue.moneyValue;
          amount = Number(money.units || 0) + Number(money.nanos || 0) / 1e9;
        } else if (amountProp?.mentionText) {
          const cleaned = amountProp.mentionText.replace(/[^0-9.-]/g, '');
          amount = parseFloat(cleaned) || 0;
        }
        
        if (description && amount > 0) {
          items.push({ description, amount });
        }
      });
      
      return items.length > 0 ? items : undefined;
    };

    // Build the extracted data object
    const extractedData: ExtractedReceiptData = {
      vendor: findEntity('supplier') || 
              findEntity('vendor') || 
              findEntity('merchant') ||
              findEntity('supplier_name') ||
              findEntity('vendor_name'),
      
      total: extractMoney('total') || 
             extractMoney('total_amount') ||
             extractMoney('grand_total') ||
             extractMoney('amount_due'),
      
      date: extractDate(),
      
      netAmount: extractMoney('net_amount') || 
                 extractMoney('subtotal') ||
                 extractMoney('net_total'),
      
      taxAmount: extractMoney('tax') || 
                 extractMoney('total_tax') ||
                 extractMoney('tax_amount'),
      
      invoiceNumber: findEntity('invoice_id') ||
                     findEntity('invoice_number') ||
                     findEntity('receipt_number') ||
                     findEntity('document_number'),
      
      currency: findEntity('currency') || 'USD',
      
      items: extractLineItems(),
    };

    // Log for debugging
    console.log('Document AI Extraction Results:', {
      entitiesFound: entities.length,
      extractedData,
    });

    return extractedData;

  } catch (error) {
    console.error('Document AI processing error:', error);
    throw new Error(`Failed to process document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper function to map Document AI results to your expense format
export function mapToExpenseFormat(data: ExtractedReceiptData) {
  return {
    vendor: data.vendor || 'Unknown Vendor',
    amount: data.total || 0,
    date: data.date || new Date().toISOString().split('T')[0],
    taxAmount: data.taxAmount,
    invoiceNumber: data.invoiceNumber,
    currency: data.currency || 'USD',
    items: data.items,
  };
}