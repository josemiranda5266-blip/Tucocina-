import React, { useState, useEffect } from 'react';
import { Comment } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, Send, Trash2, LogIn, User, AlertCircle } from 'lucide-react';

interface VideoCommentsProps {
  videoId: string;
}

export const VideoComments: React.FC<VideoCommentsProps> = ({ videoId }) => {
  const { user, signInWithGoogle, isAdmin } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newCommentText, setNewCommentText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    api.getComments(videoId)
      .then((data) => {
        if (active) setComments(data);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Error al cargar comentarios');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [videoId]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || submitting) return;

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const created = await api.addComment(videoId, newCommentText.trim());
      setComments((prev) => [created, ...prev]);
      setNewCommentText('');
      setSuccessMsg('Comentario publicado exitosamente');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err?.message || 'No se pudo publicar el comentario');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este comentario?')) return;

    setDeletingId(commentId);
    setError(null);

    try {
      await api.deleteComment(videoId, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err: any) {
      setError(err?.message || 'Error al eliminar el comentario');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Reciente';
    }
  };

  return (
    <div id="video-comments-section" className="bg-white p-6 sm:p-8 rounded-2xl border border-stone-200/80 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b border-stone-100 pb-4">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-5 h-5 text-amber-600" />
          <h3 className="text-xl font-bold text-stone-900 font-serif">
            Comentarios <span className="text-sm font-sans text-stone-500 font-normal">({comments.length})</span>
          </h3>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-medium">
          {successMsg}
        </div>
      )}

      {/* Add comment form or login prompt */}
      {user ? (
        <form onSubmit={handleAddComment} className="space-y-3 bg-stone-50 p-4 rounded-xl border border-stone-200/70">
          <div className="flex items-center space-x-3">
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || 'Usuario'} className="w-8 h-8 rounded-full object-cover border border-amber-300" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-amber-600 text-white font-bold flex items-center justify-center text-xs">
                {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-xs font-semibold text-stone-800">
              Comentar como <strong className="text-amber-800">{user.displayName || user.email}</strong>
            </span>
          </div>

          <textarea
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            placeholder="¿Qué te pareció esta receta? Escribe un comentario..."
            rows={3}
            maxLength={1000}
            required
            className="w-full text-sm p-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white placeholder-stone-400"
          />

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-stone-400">
              {1000 - newCommentText.length} caracteres restantes
            </span>
            <button
              type="submit"
              disabled={submitting || !newCommentText.trim()}
              className="inline-flex items-center space-x-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-xl text-xs shadow transition-all"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Publicando...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Publicar comentario</span>
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-xl text-center space-y-3">
          <p className="text-xs text-amber-900 font-medium">
            Inicia sesión para compartir tu opinión o preguntas sobre esta receta.
          </p>
          <button
            onClick={signInWithGoogle}
            className="inline-flex items-center space-x-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold px-4 py-2 rounded-xl text-xs shadow transition-all"
          >
            <LogIn className="w-4 h-4" />
            <span>Iniciar sesión con Google</span>
          </button>
        </div>
      )}

      {/* List of comments */}
      {loading ? (
        <div className="py-8 text-center text-stone-400 text-xs">
          <div className="w-5 h-5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <span>Cargando comentarios...</span>
        </div>
      ) : comments.length === 0 ? (
        <div className="py-8 text-center text-stone-500 text-xs space-y-1">
          <User className="w-8 h-8 text-stone-300 mx-auto" />
          <p className="font-medium text-stone-600">Aún no hay comentarios en esta receta.</p>
          <p className="text-stone-400">Sé el primero en comentar.</p>
        </div>
      ) : (
        <div className="space-y-4 divide-y divide-stone-100">
          {comments.map((comment) => {
            const canDelete = user && (user.uid === comment.userId || isAdmin);
            return (
              <div key={comment.id} className="pt-4 first:pt-0 space-y-2 group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    {comment.userPhoto ? (
                      <img
                        src={comment.userPhoto}
                        alt={comment.userName}
                        className="w-7 h-7 rounded-full object-cover border border-amber-200"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-stone-200 text-stone-700 font-bold flex items-center justify-center text-xs">
                        {comment.userName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <span className="text-xs font-bold text-stone-900 block leading-tight">
                        {comment.userName}
                      </span>
                      <span className="text-[10px] text-stone-400">
                        {formatDate(comment.createdAt)}
                      </span>
                    </div>
                  </div>

                  {canDelete && (
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      disabled={deletingId === comment.id}
                      title="Eliminar comentario"
                      className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors opacity-80 group-hover:opacity-100"
                    >
                      {deletingId === comment.id ? (
                        <div className="w-3.5 h-3.5 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>

                <p className="text-xs text-stone-700 leading-relaxed whitespace-pre-line pl-9">
                  {comment.text}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
