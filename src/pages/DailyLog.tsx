import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Plus, Zap, AlertCircle, Trophy } from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';

interface DailyLog {
  id: string; date: string; notes_html: string | null;
  energy_level: number | null; wins: string[]; blockers: string[];
}

const energyEmojis = ['', '😩', '😴', '😐', '😊', '🔥'];

export default function DailyLogPage() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [log, setLog] = useState<DailyLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ notes: '', energy: 4, wins: '', blockers: '' });
  const [newWin, setNewWin] = useState('');
  const [newBlocker, setNewBlocker] = useState('');

  const fetchLog = async (date: string) => {
    setLoading(true);
    const { data } = await supabase.from('daily_log').select('*').eq('date', date).maybeSingle();
    setLog(data);
    if (data) {
      setForm({
        notes: data.notes_html ?? '',
        energy: data.energy_level ?? 4,
        wins: '',
        blockers: '',
      });
    } else {
      setForm({ notes: '', energy: 4, wins: '', blockers: '' });
    }
    setLoading(false);
  };

  useEffect(() => { if (user) fetchLog(currentDate); }, [user, currentDate]);

  const saveLog = async () => {
    setSaving(true);
    const payload = {
      date: currentDate,
      notes_html: form.notes || null,
      energy_level: form.energy,
      wins: log?.wins ?? [],
      blockers: log?.blockers ?? [],
      user_id: user!.id,
    };
    if (log) {
      await supabase.from('daily_log').update(payload).eq('id', log.id);
    } else {
      await supabase.from('daily_log').insert(payload);
    }
    await fetchLog(currentDate);
    setSaving(false);
  };

  const addWin = async () => {
    if (!newWin.trim()) return;
    const wins = [...(log?.wins ?? []), newWin.trim()];
    if (log) {
      await supabase.from('daily_log').update({ wins }).eq('id', log.id);
    } else {
      await supabase.from('daily_log').insert({ date: currentDate, wins, user_id: user!.id, energy_level: form.energy });
    }
    setNewWin('');
    fetchLog(currentDate);
  };

  const addBlocker = async () => {
    if (!newBlocker.trim()) return;
    const blockers = [...(log?.blockers ?? []), newBlocker.trim()];
    if (log) {
      await supabase.from('daily_log').update({ blockers }).eq('id', log.id);
    } else {
      await supabase.from('daily_log').insert({ date: currentDate, blockers, user_id: user!.id, energy_level: form.energy });
    }
    setNewBlocker('');
    fetchLog(currentDate);
  };

  return (
    <div className="animate-fade-in space-y-6 max-w-[800px]">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Daily Log</h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(format(subDays(new Date(currentDate), 1), 'yyyy-MM-dd'))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium text-foreground min-w-[120px] text-center">
            {format(new Date(currentDate), 'EEEE, MMM d')}
          </span>
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(format(addDays(new Date(currentDate), 1), 'yyyy-MM-dd'))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(format(new Date(), 'yyyy-MM-dd'))}>Today</Button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
      ) : (
        <div className="space-y-4">
          {/* Energy Level */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm"><Zap className="h-4 w-4 text-warning" />Energy Level</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(level => (
                  <button
                    key={level}
                    onClick={() => setForm({ ...form, energy: level })}
                    className={`flex h-12 w-12 items-center justify-center rounded-lg text-xl transition-colors ${
                      form.energy === level ? 'bg-primary/20 ring-2 ring-primary' : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    {energyEmojis[level]}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Wins */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm"><Trophy className="h-4 w-4 text-success" />Wins</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(log?.wins ?? []).map((win, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-foreground">
                    <span className="text-success">✓</span> {win}
                  </div>
                ))}
                <form onSubmit={e => { e.preventDefault(); addWin(); }} className="flex gap-2">
                  <Input value={newWin} onChange={e => setNewWin(e.target.value)} placeholder="Add a win..." className="flex-1" />
                  <Button type="submit" variant="secondary" size="sm" disabled={!newWin.trim()}><Plus className="h-4 w-4" /></Button>
                </form>
              </CardContent>
            </Card>

            {/* Blockers */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm"><AlertCircle className="h-4 w-4 text-destructive" />Blockers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(log?.blockers ?? []).map((b, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-foreground">
                    <span className="text-destructive">•</span> {b}
                  </div>
                ))}
                <form onSubmit={e => { e.preventDefault(); addBlocker(); }} className="flex gap-2">
                  <Input value={newBlocker} onChange={e => setNewBlocker(e.target.value)} placeholder="Add a blocker..." className="flex-1" />
                  <Button type="submit" variant="secondary" size="sm" disabled={!newBlocker.trim()}><Plus className="h-4 w-4" /></Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Notes */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                rows={6}
                placeholder="What happened today? Reflections, learnings, thoughts..."
              />
              <Button onClick={saveLog} disabled={saving}>{saving ? 'Saving...' : 'Save Entry'}</Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
