import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, ExternalLink, Edit2 } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { ConfirmDialog } from '@/components/ConfirmDialog';

interface Bookmark {
  id: string;
  title: string;
  url: string;
  description: string | null;
  tags: string[];
  created_at: string;
}

export default function Bookmarks() {
  const { user } = useAuth();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; bookmarkId: string | null }>({ open: false, bookmarkId: null });
  const [form, setForm] = useState({ title: '', url: '', description: '', tags: '' });

  const fetchBookmarks = async () => {
    const { data } = await supabase.from('bookmarks').select('*').order('created_at', { ascending: false });
    setBookmarks(data ?? []);
    setLoading(false);
  };

  useEffect(() => { if (user) fetchBookmarks(); }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.from('bookmarks').insert({
      title: form.title, url: form.url,
      description: form.description || null,
      tags: form.tags ? form.tags.split(',').map((t) => t.trim()) : [],
      user_id: user!.id,
    });
    setDialogOpen(false);
    setForm({ title: '', url: '', description: '', tags: '' });
    setEditingBookmark(null);
    fetchBookmarks();
  };

  const handleEdit = (b: Bookmark) => {
    setEditingBookmark(b);
    setForm({ title: b.title, url: b.url, description: b.description ?? '', tags: (b.tags ?? []).join(', ') });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    setDeleteConfirm({ open: true, bookmarkId: id });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.bookmarkId) return;
    await supabase.from('bookmarks').delete().eq('id', deleteConfirm.bookmarkId);
    setDeleteConfirm({ open: false, bookmarkId: null });
    fetchBookmarks();
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Bookmarks" />

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{bookmarks.length} bookmarks</p>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setForm({ title: '', url: '', description: '', tags: '' }); setEditingBookmark(null); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Add Bookmark</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingBookmark ? 'Edit Bookmark' : 'Add Bookmark'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>URL</Label>
                <Input type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} required placeholder="https://" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Tags (comma-separated)</Label>
                <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="design, dev, reference" />
              </div>
              <Button type="submit" className="w-full">Add Bookmark</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : bookmarks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="mb-2 text-muted-foreground">No bookmarks yet</p>
            <Button variant="outline" onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />Add your first bookmark
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {bookmarks.map((b) => (
            <Card key={b.id} className="group transition-colors hover:bg-card/80">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-foreground truncate">{b.title}</h3>
                    <a href={b.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{b.url}</p>
                  {b.tags.length > 0 && (
                    <div className="mt-1 flex gap-1">
                      {b.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(b)}>
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(b.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm({ ...deleteConfirm, open })}
        title="Delete bookmark?"
        description="This action cannot be undone. The bookmark will be permanently deleted."
        confirmText="Delete"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
