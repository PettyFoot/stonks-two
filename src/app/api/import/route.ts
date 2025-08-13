import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth0';
import { BrokerImporter } from '@/lib/brokerImporter';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const brokerType = formData.get('brokerType') as string;
    const accountTags = formData.get('accountTags') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!brokerType) {
      return NextResponse.json({ error: 'Broker type is required' }, { status: 400 });
    }

    // Read file content
    const csvContent = await file.text();
    
    // Parse account tags
    const parsedTags = accountTags ? accountTags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : [];
    
    // Create importer and process
    const importer = new BrokerImporter(user.id, brokerType);
    const result = await importer.importCsv(csvContent, file.name, parsedTags);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Import API error:', error);
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Import failed'
    }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { getImportHistory } = await import('@/lib/brokerImporter');
    const history = await getImportHistory(user.id);

    return NextResponse.json(history);

  } catch (error) {
    console.error('Import history API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}