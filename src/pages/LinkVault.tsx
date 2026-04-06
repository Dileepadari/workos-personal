import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, ExternalLink, Search, Link2, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LinkItem {
  id: string; url: string; short_key: string | null; title: string;
  tags: string[]; description: string | null; category: string;
  click_count: number; created_at: string;
}

const categoryColors: Record<string, string> = {
  development: 'bg-primary/20 text-primary',
  reference: 'bg-warning/20 text-warning',
  reading: 'bg-success/20 text-success',
  tools: 'bg-muted text-muted-foreground',
  course: 'bg-destructive/20 text-destructive',
  social: 'bg-accent/20 text-accent-foreground',
  other: 'bg-secondary text-secondary-foreground',
};

export default function LinkVault() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ url: '', title: '', short_key: '', tags: '', description: '', category: 'other' });

  const fetchLinks = async () => {
    const { data } = await supabase.from('links').select('*').order('created_at', { ascending: false });
    setLinks(data ?? []);
    setLoading(false);
  };

  useEffect(() => { if (user) fetchLinks(); }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.from('links').insert({
      url: form.url, title: form.title, short_key: form.short_key || null,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()) : [],
      description: form.description || null, category: form.category,
      user_id: user!.id,
    });
    setDialogOpen(false);
    setForm({ url: '', title: '', short_key: '', tags: '', description: '', category: 'other' });
    fetchLinks();
  };

  const handleOpen = async (link: LinkItem) => {
    await supabase.from('links').update({ click_count: link.click_count + 1 }).eq('id', link.id);
    window.open(link.url, '_blank');
    setLinks(prev => prev.map(l => l.id === link.id ? { ...l, click_count: l.click_count + 1 } : l));
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard' });
  };

  const handleDelete = async (id: string) => {
    await supabase.from('links').delete().eq('id', id);
    fetchLinks();
  };

  const filtered = links.filter(l => {
    const q = search.toLowerCase();
    const matchesSearch = !q || l.title.toLowerCase().includes(q) || l.url.toLowerCase().includes(q)
      || (l.short_key?.toLowerCase().includes(q)) || l.tags.some(t => t.toLowerCase().includes(q))
      || (l.description?.toLowerCase().includes(q));
    const matchesCat = categoryFilter === 'all' || l.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  // Short key exact match — auto-focus
  const exactMatch = search && links.find(l => l.short_key?.toLowerCase() === search.toLowerCase());

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Link Vault</h1>
          <p className="text-sm text-muted-foreground">{links.length} links saved</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Save Link</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Save a Link</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>URL</Label>
                <Input type="url" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} required placeholder="https://" />
              </div>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Short Key</Label>
                  <Input value={form.short_key} onChange={e => setForm({ ...form, short_key: e.target.value })} placeholder="e.g. gsoc26" />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['development', 'reference', 'reading', 'tools', 'course', 'social', 'other'].map(c => (
                        <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tags (comma-separated)</Label>
                <Input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="react, docs" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <Button type="submit" className="w-full">Save Link</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search links, short keys, tags... (type a short key for instant open)"
          className="pl-9"
          autoFocus
        />
      </div>

      {/* Exact short key match banner */}
      {exactMatch && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Link2 className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">{exactMatch.title}</p>
                <p className="text-xs text-muted-foreground">{exactMatch.url}</p>
              </div>
            </div>
            <Button size="sm" onClick={() => handleOpen(exactMatch)}>Open <ExternalLink className="ml-1 h-3 w-3" /></Button>
          </CardContent>
        </Card>
      )}

      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'development', 'reference', 'reading', 'tools', 'course', 'other'].map(c => (
          <Button key={c} variant={categoryFilter === c ? 'default' : 'secondary'} size="sm" onClick={() => setCategoryFilter(c)} className="capitalize">
            {c}
          </Button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No links found</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(l => (
            <Card key={l.id} className="group transition-colors hover:bg-card/80">
              <CardContent className="flex items-center gap-4 p-4">
                <img src={`https://www.google.com/s2/favicons?domain=${new URL(l.url).hostname}&sz=32`} alt="" className="h-5 w-5 rounded shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleOpen(l)} className="text-sm font-medium text-foreground hover:text-primary truncate">{l.title}</button>
                    {l.short_key && <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">{l.short_key}</code>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{l.url}</p>
                  {l.tags.length > 0 && (
                    <div className="mt-1 flex gap-1 flex-wrap">
                      {l.tags.map(tag => <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>)}
                    </div>
                  )}
                </div>
                <Badge className={`text-xs capitalize shrink-0 ${categoryColors[l.category] || ''}`}>{l.category}</Badge>
                <span className="text-xs text-muted-foreground shrink-0">{l.click_count} opens</span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCopy(l.url)}><Copy className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpen(l)}><ExternalLink className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(l.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
