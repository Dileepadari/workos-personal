import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { format } from 'date-fns';

interface Note {
  id: string;
  title: string;
  content: string | null;
  project_id: string | null;
  created_at: string;
  updated_at: string;
}

export default function Notes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [form, setForm] = useState({ title: '', content: '' });

  const fetchNotes = async () => {
    const { data } = await supabase.from('notes').select('*').order('updated_at', { ascending: false });
    setNotes(data ?? []);
    setLoading(false);
  };

  useEffect(() => { if (user) fetchNotes(); }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      await supabase.from('notes').update({ title: form.title, content: form.content }).eq('id', editing.id);
    } else {
      await supabase.from('notes').insert({ title: form.title, content: form.content, user_id: user!.id });
    }
    setDialogOpen(false);
    setForm({ title: '', content: '' });
    setEditing(null);
    fetchNotes();
  };

  const handleEdit = (n: Note) => {
    setEditing(n);
    setForm({ title: n.title, content: n.content ?? '' });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('notes').delete().eq('id', id);
    fetchNotes();
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Notes</h1>
          <p className="text-sm text-muted-foreground">{notes.length} notes</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setForm({ title: '', content: '' }); setEditing(null); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />New Note</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? 'Edit Note' : 'New Note'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Content</Label>
                <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={8} />
              </div>
              <Button type="submit" className="w-full">{editing ? 'Save' : 'Create Note'}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : notes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="mb-2 text-muted-foreground">No notes yet</p>
            <Button variant="outline" onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />Create your first note
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {notes.map((n) => (
            <Card key={n.id} className="group transition-colors hover:bg-card/80">
              <CardContent className="p-5">
                <div className="mb-2 flex items-start justify-between">
                  <h3 className="font-medium text-foreground">{n.title}</h3>
                  <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(n)}><Edit2 className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(n.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                {n.content && <p className="mb-3 text-sm text-muted-foreground line-clamp-4 whitespace-pre-wrap">{n.content}</p>}
                <p className="text-xs text-muted-foreground">{format(new Date(n.updated_at), 'MMM d, yyyy')}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
