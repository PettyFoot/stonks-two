'use client';

import React from 'react';

interface BlogPostContentProps {
  content: string;
}

export function BlogPostContent({ content }: BlogPostContentProps) {
  return (
    <article
      className="prose prose-lg max-w-3xl mx-auto
        prose-headings:font-bold prose-headings:text-gray-900
        prose-h1:!text-[36px] prose-h1:!leading-tight prose-h1:mt-12 prose-h1:mb-6 prose-h1:font-bold
        prose-h2:!text-[28px] prose-h2:!leading-tight prose-h2:mt-12 prose-h2:mb-6 prose-h2:font-bold
        prose-h3:!text-[22px] prose-h3:!leading-snug prose-h3:mt-10 prose-h3:mb-5 prose-h3:font-semibold
        prose-h4:!text-[18px] prose-h4:mt-8 prose-h4:mb-4
        prose-p:mb-6 prose-p:leading-relaxed prose-p:text-gray-700 prose-p:text-base
        prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
        prose-img:rounded-lg prose-img:my-8 prose-img:shadow-md
        prose-ul:my-8 prose-ul:pl-6
        prose-ol:my-8 prose-ol:pl-6
        prose-li:text-gray-700 prose-li:leading-relaxed prose-li:mb-4 prose-li:pl-2
        prose-li:marker:text-blue-600 prose-li:marker:font-semibold
        prose-strong:font-semibold prose-strong:text-gray-900
        prose-blockquote:border-l-4 prose-blockquote:border-blue-500
        prose-blockquote:pl-6 prose-blockquote:italic prose-blockquote:my-6 prose-blockquote:text-gray-600
        prose-code:bg-gray-100 prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:text-sm prose-code:text-gray-800
        prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:p-4 prose-pre:rounded-lg prose-pre:my-6 prose-pre:overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}