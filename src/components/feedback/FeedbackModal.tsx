import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { fetchApi } from '../../lib/api';
import { toast } from 'sonner';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [activeTab, setActiveTab] = useState<'submit' | 'mine'>('submit');
  const [myFeedback, setMyFeedback] = useState<any[]>([]);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [category, setCategory] = useState('Bug Report');
  const [priority, setPriority] = useState('Medium');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      toast.error('Subject and description are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await fetchApi('/feedback/', {
        method: 'POST',
        body: JSON.stringify({
          category,
          priority,
          subject,
          description,
          browser_info: navigator.userAgent,
          os: navigator.platform,
          app_version: '1.0.0-rc1', // Can be dynamically injected if available
          current_route: window.location.pathname,
        })
      });
      toast.success('Feedback submitted successfully. Thank you!');
      onClose();
      setSubject('');
      setDescription('');
    } catch (error) {
      // Error handled by fetchApi
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === 'mine') {
      const fetchMyFeedback = async () => {
        setIsLoadingFeedback(true);
        try {
          const resp = await fetchApi('/feedback/mine');
          if (resp?.success) {
            setMyFeedback(resp.data || []);
          }
        } catch (error) {
          toast.error('Failed to load your feedback');
        } finally {
          setIsLoadingFeedback(false);
        }
      };
      fetchMyFeedback();
    }
  }, [isOpen, activeTab]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Submit Feedback"
      description="Report a bug or request a feature."
      footer={
        activeTab === 'submit' ? (
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </Button>
          </div>
        ) : (
          <div className="flex justify-end w-full">
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
        )
      }
    >
      <div className="flex border-b border-white/10 mb-4 mt-2">
        <button 
          className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'submit' ? 'border-violet-500 text-violet-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
          onClick={() => setActiveTab('submit')}
        >
          Submit Feedback
        </button>
        <button 
          className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'mine' ? 'border-violet-500 text-violet-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
          onClick={() => setActiveTab('mine')}
        >
          My Feedback
        </button>
      </div>

      {activeTab === 'submit' ? (
        <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Category</label>
            <select 
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="Bug Report">Bug Report</option>
              <option value="Feature Request">Feature Request</option>
              <option value="General Suggestion">General Suggestion</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Priority</label>
            <select 
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Subject</label>
          <Input 
            placeholder="Brief summary of your feedback" 
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Description</label>
          <textarea
            className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Please provide details..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isSubmitting}
          />
        </div>
      </form>
      ) : (
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
          {isLoadingFeedback ? (
            <div className="text-center text-sm text-gray-500 py-8 animate-pulse">Loading feedback...</div>
          ) : myFeedback.length === 0 ? (
            <div className="text-center text-sm text-gray-500 py-8">You haven't submitted any feedback yet.</div>
          ) : (
            myFeedback.map((f: any) => (
              <div key={f.id} className="p-4 rounded-lg border border-white/10 bg-white/5 space-y-2">
                <div className="flex justify-between items-start">
                  <h4 className="font-medium text-white text-sm">{f.subject}</h4>
                  <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-gray-300 uppercase tracking-wider">
                    {f.status}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">{new Date(f.created_at).toLocaleDateString()}</p>
                <p className="text-sm text-gray-300 bg-black/20 p-2 rounded">{f.description}</p>
                {f.admin_reply && (
                  <div className="mt-3 p-3 bg-violet-500/10 border border-violet-500/20 rounded-lg">
                    <p className="text-xs font-semibold text-violet-400 mb-1">Admin Reply:</p>
                    <p className="text-sm text-gray-300 whitespace-pre-wrap">{f.admin_reply}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </Modal>
  );
}
