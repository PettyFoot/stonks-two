'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import TopBar from '@/components/TopBar';
import { PageTriangleLoader } from '@/components/ui/TriangleLoader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { BlogEditor } from '@/components/blog/BlogEditor';
import { toast } from 'sonner';
import { Save, Eye, Clock } from 'lucide-react';

export default function NewBlogPostPage() {
  const { isAdmin, isLoading: authLoading } = useAdminAuth();
  const [saving, setSaving] = useState(false);
  const [postId, setPostId] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    author: '',
    status: 'DRAFT',
    tags: '',
    seoTitle: '',
    seoDescription: '',
  });

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  };

  // Autosave function
  const handleAutosave = React.useCallback(async () => {
    // Don't autosave if already saving
    if (saving) return;

    try {
      const tags = formData.tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      if (postId) {
        // Update existing post
        const res = await fetch(`/api/admin/blog/posts/${postId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            tags,
            isAutosave: true,
          }),
        });

        if (res.ok) {
          setLastSaved(new Date());
        }
      } else {
        // Create new post
        const res = await fetch('/api/admin/blog/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            status: 'DRAFT',
            tags,
            isAutosave: true,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setPostId(data.post.id);
          setLastSaved(new Date());
          // Update URL to edit mode without redirect
          window.history.replaceState({}, '', `/admin/blog/${data.post.id}`);
        }
      }
    } catch (error) {
      console.error('Autosave error:', error);
      // Silent fail for autosave
    }
  }, [saving, formData, postId]);

  // Autosave effect
  useEffect(() => {
    // Clear existing timer
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    // Only autosave if there's content
    if (formData.title || formData.content) {
      autosaveTimerRef.current = setTimeout(() => {
        handleAutosave();
      }, 10000); // 10 seconds
    }

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [formData, handleAutosave]);

  const handleTitleChange = (value: string) => {
    setFormData({
      ...formData,
      title: value,
      slug: formData.slug || generateSlug(value),
    });
  };

  const handleSubmit = async (status: 'DRAFT' | 'PUBLISHED') => {
    // Validate required fields only for publish
    if (status === 'PUBLISHED') {
      if (!formData.title || !formData.slug || !formData.content || !formData.author) {
        toast.error('Please fill in all required fields (title, slug, content, author)');
        return;
      }
    }

    setSaving(true);
    try {
      const tags = formData.tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      if (postId) {
        // Update existing post
        const res = await fetch(`/api/admin/blog/posts/${postId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            status,
            tags,
            publishedAt: status === 'PUBLISHED' ? new Date().toISOString() : null,
          }),
        });

        if (res.ok) {
          toast.success(`Post ${status === 'PUBLISHED' ? 'published' : 'saved'} successfully`);
          setLastSaved(new Date());
        } else {
          const error = await res.json();
          toast.error(error.error || 'Failed to save post');
        }
      } else {
        // Create new post
        const res = await fetch('/api/admin/blog/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            status,
            tags,
            publishedAt: status === 'PUBLISHED' ? new Date().toISOString() : null,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setPostId(data.post.id);
          toast.success(`Post ${status === 'PUBLISHED' ? 'published' : 'saved'} successfully`);
          setLastSaved(new Date());
          window.history.replaceState({}, '', `/admin/blog/${data.post.id}`);
        } else {
          const error = await res.json();
          toast.error(error.error || 'Failed to save post');
        }
      }
    } catch (error) {
      console.error('Error saving post:', error);
      toast.error('Failed to save post');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <PageTriangleLoader />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="flex flex-col h-full">
      <TopBar title="New Blog Post" showTimeRangeFilters={false} />

      <div className="flex justify-between items-center gap-2 px-6 py-4 border-b">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock className="h-4 w-4" />
          {lastSaved ? (
            <span>Last saved: {lastSaved.toLocaleTimeString()}</span>
          ) : (
            <span>Autosaving every 10 seconds</span>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleSubmit('DRAFT')} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          <Button onClick={() => handleSubmit('PUBLISHED')} disabled={saving}>
            <Eye className="h-4 w-4 mr-2" />
            Publish
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Editor */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div>
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      placeholder="Enter post title"
                    />
                  </div>

                  <div>
                    <Label htmlFor="slug">URL Slug *</Label>
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      placeholder="post-url-slug"
                    />
                  </div>

                  <div>
                    <Label htmlFor="excerpt">Excerpt</Label>
                    <Textarea
                      id="excerpt"
                      value={formData.excerpt}
                      onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                      placeholder="Brief description..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label>Content *</Label>
                    <BlogEditor
                      content={formData.content}
                      onChange={(content) => setFormData({ ...formData, content })}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div>
                    <Label htmlFor="author">Author *</Label>
                    <Input
                      id="author"
                      value={formData.author}
                      onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                      placeholder="Author name"
                    />
                  </div>

                  <div>
                    <Label htmlFor="tags">Tags (comma-separated)</Label>
                    <Input
                      id="tags"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      placeholder="trading, strategies, analysis"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 space-y-4">
                  <h3 className="font-semibold">SEO Settings</h3>

                  <div>
                    <Label htmlFor="seoTitle">Meta Title</Label>
                    <Input
                      id="seoTitle"
                      value={formData.seoTitle}
                      onChange={(e) => setFormData({ ...formData, seoTitle: e.target.value })}
                      placeholder="SEO title (optional)"
                    />
                  </div>

                  <div>
                    <Label htmlFor="seoDescription">Meta Description</Label>
                    <Textarea
                      id="seoDescription"
                      value={formData.seoDescription}
                      onChange={(e) => setFormData({ ...formData, seoDescription: e.target.value })}
                      placeholder="SEO description (optional)"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}