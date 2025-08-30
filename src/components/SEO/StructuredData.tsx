import { generateStructuredData } from '@/lib/seo';

interface StructuredDataProps {
  type: 'organization' | 'softwareApplication' | 'breadcrumb';
  data?: any;
}

export function StructuredData({ type, data }: StructuredDataProps) {
  const structuredData = generateStructuredData(type, data);
  
  if (!structuredData) return null;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData, null, 2) }}
      suppressHydrationWarning
    />
  );
}

// Specific components for different types
export function OrganizationStructuredData() {
  return <StructuredData type="organization" />;
}

export function SoftwareApplicationStructuredData() {
  return <StructuredData type="softwareApplication" />;
}

export function BreadcrumbStructuredData({ items }: { items: Array<{ name: string; url: string }> }) {
  return <StructuredData type="breadcrumb" data={{ items }} />;
}