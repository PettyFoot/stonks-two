'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { validateFeedbackToken } from '@/lib/feedback/tokens';
import { MessageSquare, CheckCircle, XCircle } from 'lucide-react';
import { PageTriangleLoader } from '@/components/ui/TriangleLoader';

const questions = [
  'How easy was it to navigate and use the application?',
  'How useful are the trading analytics and insights provided?',
  'How would you rate the quality of the data visualizations (charts, graphs)?',
  'How satisfied are you with the application\'s performance and speed?',
  'How likely are you to recommend Trade Voyager Analytics to other traders?',
];

export default function FeedbackPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');

  const [ratings, setRatings] = useState<number[]>([5, 5, 5, 5, 5]);
  const [comment, setComment] = useState('');

  useEffect(() => {
    // Validate token on mount
    const tokenPayload = validateFeedbackToken(token);
    if (!tokenPayload) {
      setError('This feedback link is invalid or has expired.');
      setLoading(false);
      return;
    }

    setUserName(tokenPayload.name || 'User');
    setLoading(false);
  }, [token]);

  const handleRatingChange = (questionIndex: number, value: number) => {
    const newRatings = [...ratings];
    newRatings[questionIndex] = value;
    setRatings(newRatings);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/feedback/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          question1Rating: ratings[0],
          question2Rating: ratings[1],
          question3Rating: ratings[2],
          question4Rating: ratings[3],
          question5Rating: ratings[4],
          comment: comment.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit feedback');
      }

      setSubmitted(true);
    } catch (err) {
      console.error('Error submitting feedback:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <PageTriangleLoader />
      </div>
    );
  }

  if (error && !submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Link</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={() => router.push('/')} variant="outline">
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h1>
            <p className="text-gray-600 mb-2">
              Your feedback has been submitted successfully.
            </p>
            <p className="text-gray-600 mb-6">
              We really appreciate you taking the time to share your thoughts with us!
            </p>
            <Button onClick={() => router.push('/')} className="w-full">
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <MessageSquare className="h-12 w-12 text-blue-600" />
            </div>
            <CardTitle className="text-3xl">We'd Love Your Feedback!</CardTitle>
            <p className="text-gray-600 mt-2">
              Hi {userName}! Please take a moment to share your experience with Trade Voyager Analytics.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              {questions.map((question, index) => (
                <div key={index} className="space-y-3">
                  <label className="block text-sm font-medium text-gray-900">
                    {index + 1}. {question}
                  </label>
                  <div className="space-y-2">
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={ratings[index]}
                      onChange={(e) => handleRatingChange(index, parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>1 - Poor</span>
                      <span className="font-bold text-lg text-blue-600">{ratings[index]}</span>
                      <span>10 - Excellent</span>
                    </div>
                  </div>
                </div>
              ))}

              <div className="space-y-3 pt-4 border-t">
                <label htmlFor="comment" className="block text-sm font-medium text-gray-900">
                  Additional Comments (Optional)
                </label>
                <Textarea
                  id="comment"
                  placeholder="Feel free to share any additional thoughts, suggestions, or feedback..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={5}
                  className="w-full"
                />
                <p className="text-xs text-gray-500">
                  You can also respond directly to the feedback email if you prefer.
                </p>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={submitting}
                className="w-full"
                size="lg"
              >
                {submitting ? 'Submitting...' : 'Submit Feedback'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}