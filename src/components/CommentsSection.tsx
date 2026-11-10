import React, { useState, useEffect } from 'react';
import { MessageSquare, ThumbsUp, Reply, Send, User } from 'lucide-react';
import { Comment } from '../types/movie';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';

interface CommentsSectionProps {
  movieId: string;
}

export const CommentsSection: React.FC<CommentsSectionProps> = ({ movieId }) => {
  const { currentUser, openModal, showToast } = useApp();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [authorName, setAuthorName] = useState(currentUser?.username || '');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    api.getComments(movieId).then(setComments);
  }, [movieId]);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    const name = currentUser?.username || authorName.trim() || 'Anonymous Moviegoer';
    const avatar = currentUser?.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${name}`;

    const created = await api.addComment(movieId, {
      author: name,
      avatar,
      content: newCommentText.trim()
    });

    setComments(prev => [created, ...prev]);
    setNewCommentText('');
    showToast('Comment posted successfully!');
  };

  const handleLike = (commentId: string) => {
    setComments(prev => prev.map(c => {
      if (c.id === commentId) {
        return { ...c, likes: c.likes + 1 };
      }
      return c;
    }));
    showToast('Liked comment');
  };

  return (
    <div className="w-full bg-[#242832] rounded-3xl p-5 sm:p-6 border border-[#2e3442] shadow-xl space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between pb-3 border-b border-[#1a1c23]">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-[#db6937]" />
          <h3 className="text-base sm:text-lg font-bold text-white tracking-wide">
            Discussion &amp; Comments ({comments.length})
          </h3>
        </div>
        {!currentUser && (
          <button
            onClick={() => openModal('login')}
            className="text-xs text-[#4f83d3] hover:text-white transition-colors"
          >
            Sign in to post faster
          </button>
        )}
      </div>

      {/* Post Comment Form */}
      <form onSubmit={handlePostComment} className="space-y-3">
        {!currentUser && (
          <div className="flex items-center gap-2 max-w-xs">
            <div className="w-8 h-8 rounded-full bg-[#1a1c23] flex items-center justify-center text-neutral-400 shrink-0">
              <User className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Your display name..."
              className="w-full bg-[#1a1c23] border border-[#3e4555] rounded-xl px-3 py-1.5 text-xs text-[#e9ecef] focus:outline-none focus:border-[#4f83d3]"
            />
          </div>
        )}

        <div className="relative">
          <textarea
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            rows={3}
            placeholder="Share your thoughts on this movie or TV show..."
            className="w-full bg-[#1a1c23] border border-[#3e4555] rounded-2xl p-3 text-xs sm:text-sm text-[#e9ecef] placeholder-neutral-500 focus:outline-none focus:border-[#4f83d3] resize-none"
          />
          <button
            type="submit"
            disabled={!newCommentText.trim()}
            className="absolute right-3 bottom-4 bg-gradient-flixer disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-full flex items-center gap-1.5 shadow transition-all cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Post</span>
          </button>
        </div>
      </form>

      {/* Comment List */}
      <div className="space-y-4 pt-2 divide-y divide-[#1e2129]">
        {comments.map((comment) => (
          <div key={comment.id} className="pt-4 first:pt-0 space-y-3">
            <div className="flex items-start gap-3">
              <img
                src={comment.avatar}
                alt={comment.author}
                referrerPolicy="no-referrer"
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover shrink-0 ring-1 ring-[#3e4555]"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs sm:text-sm font-semibold text-white">{comment.author}</h4>
                  <span className="text-[11px] text-[#6c757d]">• {comment.date}</span>
                </div>
                <p className="text-xs sm:text-sm text-[#b2b1ad] mt-1 leading-relaxed">
                  {comment.content}
                </p>

                {/* Comment actions: Like, Reply */}
                <div className="flex items-center gap-4 mt-2 text-xs text-[#6c757d]">
                  <button
                    onClick={() => handleLike(comment.id)}
                    className="flex items-center gap-1 hover:text-[#4f83d3] transition-colors cursor-pointer"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span>{comment.likes}</span>
                  </button>
                  <button
                    onClick={() => setReplyingToId(replyingToId === comment.id ? null : comment.id)}
                    className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                  >
                    <Reply className="w-3.5 h-3.5" />
                    <span>Reply</span>
                  </button>
                </div>

                {/* Reply Input Box */}
                {replyingToId === comment.id && (
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={`Reply to ${comment.author}...`}
                      className="flex-1 bg-[#1a1c23] border border-[#3e4555] rounded-xl px-3 py-1.5 text-xs text-[#e9ecef] focus:outline-none"
                    />
                    <button
                      onClick={() => {
                        if (!replyText.trim()) return;
                        if (!comment.replies) comment.replies = [];
                        comment.replies.push({
                          id: `rep-${Date.now()}`,
                          author: currentUser?.username || 'You',
                          avatar: currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop',
                          date: 'Just now',
                          content: replyText.trim(),
                          likes: 0
                        });
                        setReplyText('');
                        setReplyingToId(null);
                        showToast('Reply submitted');
                      }}
                      className="bg-[#4f83d3] text-white text-xs px-3 py-1.5 rounded-xl cursor-pointer"
                    >
                      Send
                    </button>
                  </div>
                )}

                {/* Threaded Nested Replies */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="mt-3 pl-4 border-l-2 border-[#1e2129] space-y-3">
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="flex items-start gap-2.5">
                        <img
                          src={reply.avatar}
                          alt={reply.author}
                          referrerPolicy="no-referrer"
                          className="w-7 h-7 rounded-full object-cover shrink-0"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-white">{reply.author}</span>
                            <span className="text-[10px] text-[#6c757d]">• {reply.date}</span>
                          </div>
                          <p className="text-xs text-[#b2b1ad] mt-0.5 leading-relaxed">
                            {reply.content}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
