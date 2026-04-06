import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, CheckSquare, Flag, Calendar as CalIcon, Video } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, addWeeks, subWeeks, isToday, addDays } from 'date-fns';

interface CalEvent {
  id: string;
  title: string;
  date: Date;
  type: 'task' | 'milestone' | 'meeting';
  color?: string;
  meta?: string;
}

type ViewMode = 'month' | 'week' | 'agenda';

export default function CalendarPage() {
  const { user } = useAuth();
  const [current, setCurrent] = useState(new Date());
  const [view, setView] = useState<ViewMode>('month');
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [tasksRes, msRes, meetRes] = await Promise.all([
        supabase.from('tasks').select('id, title, due_date, priority, project_id').not('due_date', 'is', null),
        supabase.from('milestones').select('id, title, date, is_completed'),
        supabase.from('meetings').select('id, title, scheduled_at'),
      ]);

      const items: CalEvent[] = [];
      (tasksRes.data ?? []).forEach(t => {
        if (t.due_date) items.push({ id: `t-${t.id}`, title: t.title, date: new Date(t.due_date), type: 'task', meta: t.priority });
      });
      (msRes.data ?? []).forEach(m => {
        items.push({ id: `m-${m.id}`, title: m.title, date: new Date(m.date), type: 'milestone', meta: m.is_completed ? 'done' : 'pending' });
      });
      (meetRes.data ?? []).forEach(m => {
        items.push({ id: `mt-${m.id}`, title: m.title, date: new Date(m.scheduled_at), type: 'meeting' });
      });
      setEvents(items);
      setLoading(false);
    };
    load();
  }, [user]);

  const navigate = (dir: number) => {
    if (view === 'month') setCurrent(dir > 0 ? addMonths(current, 1) : subMonths(current, 1));
    else if (view === 'week') setCurrent(dir > 0 ? addWeeks(current, 1) : subWeeks(current, 1));
  };

  // Month grid
  const monthStart = startOfMonth(current);
  const monthEnd = endOfMonth(current);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  // Week days
  const weekStart = startOfWeek(current);
  const weekDays = eachDayOfInterval({ start: weekStart, end: endOfWeek(current) });

  // Agenda: next 30 days
  const agendaDays = eachDayOfInterval({ start: new Date(), end: addDays(new Date(), 30) });

  const getEventsForDay = (day: Date) => events.filter(e => isSameDay(e.date, day));

  const typeIcon = (type: string) => {
    if (type === 'task') return <CheckSquare className="h-3 w-3" />;
    if (type === 'milestone') return <Flag className="h-3 w-3" />;
    return <Video className="h-3 w-3" />;
  };

  const typeColor = (type: string) => {
    if (type === 'task') return 'text-primary';
    if (type === 'milestone') return 'text-warning';
    return 'text-success';
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;

  return (
    <div className="animate-fade-in space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Calendar</h1>
          <p className="text-sm text-muted-foreground">{events.length} events</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-border">
            {(['month', 'week', 'agenda'] as const).map(v => (
              <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${view === v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                {v}
              </button>
            ))}
          </div>
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-sm font-medium min-w-[120px] text-center">
            {view === 'month' ? format(current, 'MMMM yyyy') : view === 'week' ? `Week of ${format(weekStart, 'MMM d')}` : 'Next 30 Days'}
          </span>
          <Button variant="ghost" size="icon" onClick={() => navigate(1)}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setCurrent(new Date())}>Today</Button>
        </div>
      </div>

      {/* Month View */}
      {view === 'month' && (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border bg-muted/30">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="p-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map(day => {
              const dayEvents = getEventsForDay(day);
              return (
                <div key={day.toISOString()} className={`min-h-[80px] sm:min-h-[100px] border-b border-r border-border p-1 sm:p-2 ${!isSameMonth(day, current) ? 'bg-muted/20' : ''} ${isToday(day) ? 'bg-primary/5' : ''}`}>
                  <span className={`text-xs ${isToday(day) ? 'rounded-full bg-primary px-1.5 py-0.5 text-primary-foreground font-bold' : isSameMonth(day, current) ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {format(day, 'd')}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {dayEvents.slice(0, 3).map(e => (
                      <div key={e.id} className={`flex items-center gap-1 rounded px-1 py-0.5 text-[10px] sm:text-xs truncate ${typeColor(e.type)}`}>
                        {typeIcon(e.type)}
                        <span className="truncate">{e.title}</span>
                      </div>
                    ))}
                    {dayEvents.length > 3 && <span className="text-[10px] text-muted-foreground">+{dayEvents.length - 3} more</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Week View */}
      {view === 'week' && (
        <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
          {weekDays.map(day => {
            const dayEvents = getEventsForDay(day);
            return (
              <Card key={day.toISOString()} className={isToday(day) ? 'border-primary/50' : ''}>
                <CardHeader className="p-3 pb-1">
                  <CardTitle className={`text-xs ${isToday(day) ? 'text-primary' : 'text-muted-foreground'}`}>
                    {format(day, 'EEE d')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 space-y-1">
                  {dayEvents.map(e => (
                    <div key={e.id} className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs ${typeColor(e.type)} bg-muted/30`}>
                      {typeIcon(e.type)}
                      <span className="truncate">{e.title}</span>
                    </div>
                  ))}
                  {dayEvents.length === 0 && <p className="text-xs text-muted-foreground/50 text-center py-2">—</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Agenda View */}
      {view === 'agenda' && (
        <div className="space-y-1">
          {agendaDays.map(day => {
            const dayEvents = getEventsForDay(day);
            if (dayEvents.length === 0) return null;
            return (
              <div key={day.toISOString()} className="flex gap-4 rounded-md px-4 py-2 hover:bg-muted/30">
                <div className="w-20 shrink-0">
                  <p className={`text-sm font-medium ${isToday(day) ? 'text-primary' : 'text-foreground'}`}>{format(day, 'MMM d')}</p>
                  <p className="text-xs text-muted-foreground">{format(day, 'EEEE')}</p>
                </div>
                <div className="flex-1 space-y-1">
                  {dayEvents.map(e => (
                    <div key={e.id} className={`flex items-center gap-2 text-sm ${typeColor(e.type)}`}>
                      {typeIcon(e.type)}
                      <span>{e.title}</span>
                      {e.type === 'meeting' && <span className="text-xs text-muted-foreground">{format(e.date, 'h:mm a')}</span>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><CheckSquare className="h-3 w-3 text-primary" /> Tasks</span>
        <span className="flex items-center gap-1"><Flag className="h-3 w-3 text-warning" /> Milestones</span>
        <span className="flex items-center gap-1"><Video className="h-3 w-3 text-success" /> Meetings</span>
      </div>
    </div>
  );
}
