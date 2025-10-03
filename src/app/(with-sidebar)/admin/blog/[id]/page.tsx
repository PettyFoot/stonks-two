'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
import { Save, Eye, Trash2, Clock } from 'lucide-react';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  author: string;
  status: string;
  tags: Array<{ id: string; name: string }>;
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: string | null;
}

export default function EditBlogPostPage() {
  const router = useRouter();
  const params = useParams();
  const { isAdmin, isLoading: authLoading } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
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

  const fetchPost = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/blog/posts/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        const post: BlogPost = data.post;
        setFormData({
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt || '',
          content: post.content,
          author: post.author,
          status: post.status,
          tags: post.tags.map(t => t.name).join(', '),
          seoTitle: post.seoTitle || '',
          seoDescription: post.seoDescription || '',
        });
      } else {
        toast.error('Failed to load post');
      }
    } catch (error) {
      console.error('Error fetching post:', error);
      toast.error('Failed to load post');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (isAdmin && !authLoading && params.id) {
      fetchPost();
    }
  }, [isAdmin, authLoading, params.id, fetchPost]);

  // Autosave function
  const handleAutosave = React.useCallback(async () => {
    // Don't autosave if already saving
    if (saving) return;

    try {
      const tags = formData.tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      // Sanitize data for autosave - convert empty strings to null
      const sanitizedData = {
        title: formData.title || null,
        slug: formData.slug || null,
        excerpt: formData.excerpt || null,
        content: formData.content || null,
        author: formData.author || null,
        seoTitle: formData.seoTitle || null,
        seoDescription: formData.seoDescription || null,
        tags,
        isAutosave: true,
      };

      const res = await fetch(`/api/admin/blog/posts/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sanitizedData),
      });

      if (res.ok) {
        setLastSaved(new Date());
      } else {
        // Log validation errors for debugging
        const errorData = await res.json();
        console.error('Autosave failed with status:', res.status);
        console.error('Error details:', errorData);
        if (errorData.details) {
          console.error('Validation issues:', errorData.details);
        }
      }
    } catch (error) {
      console.error('Autosave error:', error);
      // Silent fail for autosave
    }
  }, [saving, formData, params.id]);

  // Autosave effect
  useEffect(() => {
    // Don't autosave while loading initial data
    if (loading) return;

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
  }, [formData, loading, handleAutosave]);

  const handleTitleChange = (value: string) => {
    setFormData({
      ...formData,
      title: value,
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

      const res = await fetch(`/api/admin/blog/posts/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          status,
          tags,
          publishedAt: status === 'PUBLISHED' && formData.status === 'DRAFT'
            ? new Date().toISOString()
            : undefined,
        }),
      });

      if (res.ok) {
        toast.success(`Post ${status === 'PUBLISHED' ? 'published' : 'saved'} successfully`);
        setLastSaved(new Date());
        // Stay on this page - no redirect
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to save post');
      }
    } catch (error) {
      console.error('Error saving post:', error);
      toast.error('Failed to save post');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/blog/posts/${params.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Post deleted successfully');
        router.push('/admin/blog');
      } else {
        toast.error('Failed to delete post');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
    } finally {
      setDeleting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <PageTriangleLoader />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Edit Blog Post" showTimeRangeFilters={false} />

      <div className="flex justify-between items-center gap-2 px-6 py-4 border-b">
        <div className="flex items-center gap-4">
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={saving || deleting}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="h-4 w-4" />
            {lastSaved ? (
              <span>Last saved: {lastSaved.toLocaleTimeString()}</span>
            ) : (
              <span>Autosaving every 10 seconds</span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleSubmit('DRAFT')} disabled={saving || deleting}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
          {formData.status === 'DRAFT' && (
            <Button onClick={() => handleSubmit('PUBLISHED')} disabled={saving || deleting}>
              <Eye className="h-4 w-4 mr-2" />
              Publish
            </Button>
          )}
          {formData.status === 'PUBLISHED' && (
            <Button onClick={() => handleSubmit('PUBLISHED')} disabled={saving || deleting}>
              <Save className="h-4 w-4 mr-2" />
              Update Published Post
            </Button>
          )}
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
