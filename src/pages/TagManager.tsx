import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit2, Merge, Tag } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface TagInfo { name: string; count: number; tables: string[]; }

export default function TagManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tags, setTags] = useState<TagInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [renameDialog, setRenameDialog] = useState(false);
  const [mergeDialog, setMergeDialog] = useState(false);
  const [selectedTag, setSelectedTag] = useState('');
  const [newName, setNewName] = useState('');
  const [mergeInto, setMergeInto] = useState('');

  const fetchTags = async () => {
    const tables = ['projects', 'tasks', 'links', 'bookmarks', 'resources'] as const;
    const tagMap = new Map<string, { count: number; tables: Set<string> }>();

    for (const table of tables) {
      const { data } = await supabase.from(table).select('tags');
      (data ?? []).forEach((row: any) => {
        ((row.tags as string[]) ?? []).forEach(tag => {
          if (!tagMap.has(tag)) tagMap.set(tag, { count: 0, tables: new Set() });
          const entry = tagMap.get(tag)!;
          entry.count++;
          entry.tables.add(table);
        });
      });
    }

    setTags(Array.from(tagMap.entries()).map(([name, { count, tables }]) => ({ name, count, tables: Array.from(tables) })).sort((a, b) => b.count - a.count));
    setLoading(false);
  };

  useEffect(() => { if (user) fetchTags(); }, [user]);

  const renameTag = async () => {
    if (!newName.trim() || !selectedTag) return;
    const tables = ['projects', 'links', 'bookmarks', 'resources'] as const;
    for (const table of tables) {
      const { data } = await supabase.from(table).select('id, tags').contains('tags', [selectedTag]);
      for (const row of data ?? []) {
        const updated = ((row as any).tags as string[]).map(t => t === selectedTag ? newName.trim() : t);
        await supabase.from(table).update({ tags: updated }).eq('id', (row as any).id);
      }
    }
    setRenameDialog(false);
    setSelectedTag('');
    setNewName('');
    toast({ title: 'Tag renamed' });
    fetchTags();
  };

  const mergeTags = async () => {
    if (!mergeInto.trim() || !selectedTag) return;
    const tables = ['projects', 'links', 'bookmarks', 'resources'] as const;
    for (const table of tables) {
      const { data } = await supabase.from(table).select('id, tags').contains('tags', [selectedTag]);
      for (const row of data ?? []) {
        let updated = ((row as any).tags as string[]).map(t => t === selectedTag ? mergeInto.trim() : t);
        updated = [...new Set(updated)];
        await supabase.from(table).update({ tags: updated }).eq('id', (row as any).id);
      }
    }
    setMergeDialog(false);
    setSelectedTag('');
    setMergeInto('');
    toast({ title: 'Tags merged' });
    fetchTags();
  };

  const deleteTag = async (tag: string) => {
    const tables = ['projects', 'links', 'bookmarks', 'resources'] as const;
    for (const table of tables) {
      const { data } = await supabase.from(table).select('id, tags').contains('tags', [tag]);
      for (const row of data ?? []) {
        const updated = ((row as any).tags as string[]).filter(t => t !== tag);
        await supabase.from(table).update({ tags: updated }).eq('id', (row as any).id);
      }
    }
    toast({ title: 'Tag deleted' });
    fetchTags();
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;

  return (
    <div className="animate-fade-in space-y-6 max-w-[800px]">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Tag Manager</h1>
        <p className="text-sm text-muted-foreground">{tags.length} tags across all content</p>
      </div>

      {tags.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No tags found</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {tags.map(tag => (
            <Card key={tag.name} className="group">
              <CardContent className="flex items-center gap-4 p-4">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <span className="text-sm font-medium text-foreground">{tag.name}</span>
                  <div className="flex gap-1 mt-1">
                    {tag.tables.map(t => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">{tag.count} uses</Badge>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedTag(tag.name); setNewName(tag.name); setRenameDialog(true); }}>
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedTag(tag.name); setMergeDialog(true); }}>
                    <Merge className="h-3.5 w-3.5" />
                  </Button>
                  {tag.count === 0 && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteTag(tag.name)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Rename Dialog */}
      <Dialog open={renameDialog} onOpenChange={setRenameDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Rename Tag</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Renaming "{selectedTag}" across all records.</p>
            <div className="space-y-2">
              <Label>New Name</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} />
            </div>
            <Button onClick={renameTag} className="w-full">Rename</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Merge Dialog */}
      <Dialog open={mergeDialog} onOpenChange={setMergeDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Merge Tag</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Merge "{selectedTag}" into another tag.</p>
            <div className="space-y-2">
              <Label>Merge Into</Label>
              <Input value={mergeInto} onChange={e => setMergeInto(e.target.value)} placeholder="Target tag name" />
            </div>
            <Button onClick={mergeTags} className="w-full">Merge</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
