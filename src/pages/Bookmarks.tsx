import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, ExternalLink } from 'lucide-react';

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
    fetchBookmarks();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('bookmarks').delete().eq('id', id);
    fetchBookmarks();
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Bookmarks</h1>
          <p className="text-sm text-muted-foreground">{bookmarks.length} bookmarks</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Add Bookmark</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Bookmark</DialogTitle></DialogHeader>
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
                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => handleDelete(b.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
