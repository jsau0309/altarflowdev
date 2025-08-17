// Simplified Document AI implementation using REST API directly
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
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  const location = process.env.GOOGLE_CLOUD_LOCATION || 'us';
  const processorId = process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_ID;
  const apiKey = process.env.GOOGLE_CLOUD_API_KEY;

  if (!projectId || !processorId || !apiKey) {
    console.error('Document AI config check:', {
      hasProjectId: !!projectId,
      hasProcessorId: !!processorId,
      hasApiKey: !!apiKey,
      projectId: projectId || 'MISSING',
      processorId: processorId || 'MISSING',
      location
    });
    throw new Error('Document AI configuration missing. Please check environment variables.');
  }

  try {
    // Build the REST API endpoint
    const endpoint = `https://${location}-documentai.googleapis.com/v1/projects/${projectId}/locations/${location}/processors/${processorId}:process?key=${apiKey}`;

    // Prepare the request
    const requestBody = {
      rawDocument: {
        content: fileBuffer.toString('base64'),
        mimeType: mimeType,
      },
    };

    // Make the API call
    console.log('Document AI Request:', {
      endpoint: endpoint.replace(apiKey, 'REDACTED'),
      mimeType,
      contentLength: fileBuffer.length
    });

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Document AI API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        errorBody: errorText
      });
      
      // Parse Google API error format
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error) {
          throw new Error(`Document AI Error: ${errorJson.error.message || errorJson.error.status || response.statusText}`);
        }
      } catch (e) {
        // If not JSON, use original text
      }
      
      throw new Error(`Document AI API failed: ${response.status} ${response.statusText} - ${errorText.substring(0, 200)}`);
    }

    const result = await response.json();
    
    if (!result.document) {
      throw new Error('No document returned from Document AI');
    }

    const { document } = result;
    
    // Extract entities from the document
    const entities = document.entities || [];
    
    // Helper function to find entity by type
    const findEntity = (types: string[]): string | null => {
      for (const type of types) {
        const entity = entities.find((e: any) => 
          e.type?.toLowerCase().includes(type.toLowerCase()) ||
          e.type?.toLowerCase().replace(/_/g, ' ').includes(type.toLowerCase())
        );
        if (entity) {
          return entity.mentionText || entity.normalizedValue?.text || null;
        }
      }
      return null;
    };

    // Helper function to extract monetary value
    const extractMoney = (types: string[]): number | null => {
      for (const type of types) {
        const entity = entities.find((e: any) => 
          e.type?.toLowerCase().includes(type.toLowerCase()) ||
          e.type?.toLowerCase().replace(/_/g, ' ').includes(type.toLowerCase())
        );
        
        if (entity) {
          if (entity.normalizedValue?.moneyValue) {
            const money = entity.normalizedValue.moneyValue;
            // Convert to number (units + nanos/1e9)
            return Number(money.units || 0) + Number(money.nanos || 0) / 1e9;
          }
          
          // Fallback to text extraction
          const text = entity.mentionText || entity.normalizedValue?.text;
          if (text) {
            const cleaned = text.replace(/[^0-9.-]/g, '');
            const parsed = parseFloat(cleaned);
            return isNaN(parsed) ? null : parsed;
          }
        }
      }
      return null;
    };

    // Helper function to extract date
    const extractDate = (): string | null => {
      const dateEntity = entities.find((e: any) => 
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
      
      const lineItemEntities = entities.filter((e: any) => 
        e.type?.toLowerCase().includes('line_item') ||
        e.type?.toLowerCase().includes('item')
      );
      
      lineItemEntities.forEach((item: any) => {
        const properties = item.properties || [];
        
        const description = properties.find((p: any) => 
          p.type?.toLowerCase().includes('description') ||
          p.type?.toLowerCase().includes('item')
        )?.mentionText || item.mentionText || '';
        
        const amountProp = properties.find((p: any) => 
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
      vendor: findEntity(['supplier', 'vendor', 'merchant', 'supplier_name', 'vendor_name']),
      total: extractMoney(['total', 'total_amount', 'grand_total', 'amount_due']),
      date: extractDate(),
      netAmount: extractMoney(['net_amount', 'subtotal', 'net_total']),
      taxAmount: extractMoney(['tax', 'total_tax', 'tax_amount']),
      invoiceNumber: findEntity(['invoice_id', 'invoice_number', 'receipt_number', 'document_number']),
      currency: findEntity(['currency']) || 'USD',
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