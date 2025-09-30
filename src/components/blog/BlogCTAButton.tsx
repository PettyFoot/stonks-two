import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export function BlogCTAButton() {
  return (
    <div className="flex justify-center my-8">
      <Link href="/login">
        <Button size="lg" className="font-semibold bg-green-600 hover:bg-green-700">
          Try TradeVoyager Analytics
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </Link>
    </div>
  );
}
