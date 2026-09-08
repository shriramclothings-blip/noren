import React, { useState, useCallback } from 'react';
import { Plus, Search, BookOpen, Edit, Trash2, X } from 'lucide-react';
import { getKBArticles, createKBArticle, updateKBArticle, deleteKBArticle } from '../../api/support';
import { EmptyState } from '../../components/ui/EmptyState';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { Modal, ConfirmModal } from '../../components/ui/Modal';
import { formatDate, debounce, timeAgo } from '../../lib/utils';
import toast from 'react-hot-toast';

const CATEGORIES = ['orders', 'payments', 'account', 'returns', 'technical', 'seller', 'influencer', 'general'];

export default function KnowledgeBase() {
  const [articles, setArticles] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editArticle, setEditArticle] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState({ title: '', content: '', category: 'general', tags: '' });

  const load = useCallback(async (q = search) => {
    setLoading(true);
    try {
      const res = await getKBArticles({ search: q });
      setArticles(res.data.articles || []);
      setTotal(res.data.total || 0);
    } catch {}
    setLoading(false);
  }, []);

  const debouncedSearch = useCallback(debounce((q) => load(q), 350), [load]);
  const handleSearch = (v) => { setSearch(v); debouncedSearch(v); };

  React.useEffect(() => { load(); }, []);

  const handleSave = async () => {
    try {
      if (editArticle) {
        await updateKBArticle(editArticle.id, form);
        toast.success('Article updated');
      } else {
        await createKBArticle(form);
        toast.success('Article created');
      }
      setShowCreate(false);
      setEditArticle(null);
      setForm({ title: '', content: '', category: 'general', tags: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteKBArticle(deleteId);
      toast.success('Article deleted');
      setDeleteId(null);
      load();
    } catch {}
  };

  const openEdit = (a) => {
    setEditArticle(a);
    setForm({ title: a.title, content: a.content, category: a.category, tags: a.tags?.join(', ') || '' });
    setShowCreate(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Knowledge Base</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{total} articles</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => { setEditArticle(null); setForm({ title: '', content: '', category: 'general', tags: '' }); setShowCreate(true); }}>
          <Plus size={13} /> New Article
        </button>
      </div>

      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
        <input placeholder="Search knowledge base…" value={search} onChange={e => handleSearch(e.target.value)} className="input pl-8" />
        {search && <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => handleSearch('')}><X size={13} style={{ color: 'var(--text-muted)' }} /></button>}
      </div>

      {loading ? (
        <TableSkeleton rows={6} cols={4} />
      ) : articles.length === 0 ? (
        <div className="card">
          <EmptyState icon={BookOpen} title="No articles" description={search ? 'No articles match your search.' : 'Start building your knowledge base.'} action={
            <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}><Plus size={12} /> Create article</button>
          } />
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Status</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {articles.map(a => (
                <tr key={a.id}>
                  <td className="text-xs font-medium">{a.title}</td>
                  <td><span className="badge bg-gray-100 text-gray-700 capitalize">{a.category}</span></td>
                  <td>{a.is_published !== false ? <span className="badge bg-green-100 text-green-800">Published</span> : <span className="badge bg-yellow-100 text-yellow-800">Draft</span>}</td>
                  <td className="text-xs" style={{ color: 'var(--text-muted)' }}>{timeAgo(a.updated_at || a.created_at)}</td>
                  <td>
                    <div className="flex gap-1">
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(a)}><Edit size={12} /></button>
                      <button className="btn btn-ghost btn-sm text-red-600" onClick={() => setDeleteId(a.id)}><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={showCreate}
        onClose={() => { setShowCreate(false); setEditArticle(null); }}
        title={editArticle ? 'Edit Article' : 'New Article'}
        size="lg"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => { setShowCreate(false); setEditArticle(null); }}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave}>Save Article</button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="label">Title *</label>
            <input className="input" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Category</label>
              <select className="input text-xs" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Tags (comma-separated)</label>
              <input className="input text-xs" value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} placeholder="refund, return, policy" />
            </div>
          </div>
          <div>
            <label className="label">Content *</label>
            <textarea className="input resize-none" rows={8} value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} required />
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Article"
        description="This article will be permanently deleted."
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
