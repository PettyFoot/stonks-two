import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface BlogPostCardProps {
  id: string;
  slug: string;
  title: string;
  excerpt?: string | null;
  coverImage?: string | null;
  author: string;
  publishedAt: Date | string | null;
  viewCount: number;
  tags?: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
}

export function BlogPostCard({
  slug,
  title,
  excerpt,
  coverImage,
  author,
  publishedAt,
  viewCount,
  tags = [],
}: BlogPostCardProps) {
  const date = publishedAt ? (typeof publishedAt === 'string' ? new Date(publishedAt) : publishedAt) : new Date();

  return (
    <Link href={`/blog/${slug}`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full flex flex-col">
        {coverImage && (
          <CardHeader className="p-0">
            <div className="relative w-full h-48 overflow-hidden rounded-t-xl">
              <Image
                src={coverImage}
                alt={title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            </div>
          </CardHeader>
        )}
        <CardContent className="flex-1 p-6">
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {tags.slice(0, 3).map((tag) => (
                <Badge key={tag.id} variant="secondary" className="text-xs">
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}
          <CardTitle className="line-clamp-2 mb-2 text-xl">{title}</CardTitle>
          {excerpt && (
            <p className="text-sm text-gray-600 line-clamp-3">{excerpt}</p>
          )}
        </CardContent>
        <CardFooter className="text-sm text-gray-600 p-6 pt-0">
          <span>{format(date, 'MMM dd, yyyy')}</span>
        </CardFooter>
      </Card>
    </Link>
  );
}