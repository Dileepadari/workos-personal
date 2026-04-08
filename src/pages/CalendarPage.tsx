import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, CheckSquare, Flag, Calendar as CalIcon, Video, Plus, X, Clock } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, addWeeks, subWeeks, isToday, addDays } from 'date-fns';
import { PageHeader } from '@/components/PageHeader';
import { useToast } from '@/hooks/use-toast';

interface CalEvent {
  id: string;
  title: string;
  date: Date;
  type: 'task' | 'milestone' | 'meeting';
  color?: string;
  meta?: string;
  rawData?: any;
}

type ViewMode = 'month' | 'week' | 'agenda';

export default function CalendarPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [current, setCurrent] = useState(new Date());
  const [view, setView] = useState<ViewMode>('month');
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null);
  const [addDialog, setAddDialog] = useState(false);
  const [addDate, setAddDate] = useState('');
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [eventForm, setEventForm] = useState({ title: '', type: 'task' as string, date: '', time: '', project_id: '', description: '' });

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [tasksRes, msRes, meetRes, projRes] = await Promise.all([
        supabase.from('tasks').select('id, title, due_date, due_time, priority, project_id, status, time_estimate_min').not('due_date', 'is', null),
        supabase.from('milestones').select('id, title, date, is_completed, project_id'),
        supabase.from('meetings').select('id, title, scheduled_at, attendees, agenda_html, notes_html, action_items, project_id'),
        supabase.from('projects').select('id, name'),
      ]);

      setProjects(projRes.data ?? []);
      const items: CalEvent[] = [];
      (tasksRes.data ?? []).forEach(t => {
        if (t.due_date) items.push({ id: `t-${t.id}`, title: t.title, date: new Date(t.due_date), type: 'task', meta: t.priority, rawData: t });
      });
      (msRes.data ?? []).forEach(m => {
        items.push({ id: `m-${m.id}`, title: m.title, date: new Date(m.date), type: 'milestone', meta: m.is_completed ? 'done' : 'pending', rawData: m });
      });
      (meetRes.data ?? []).forEach(m => {
        items.push({ id: `mt-${m.id}`, title: m.title, date: new Date(m.scheduled_at), type: 'meeting', rawData: m });
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

  const monthStart = startOfMonth(current);
  const monthEnd = endOfMonth(current);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const weekStart = startOfWeek(current);
  const weekDays = eachDayOfInterval({ start: weekStart, end: endOfWeek(current) });
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

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (eventForm.type === 'task') {
      await supabase.from('tasks').insert({
        title: eventForm.title, due_date: eventForm.date, due_time: eventForm.time || null,
        project_id: eventForm.project_id || null, user_id: user.id, status: 'todo', priority: 'medium',
        description: eventForm.description || null,
      });
    } else if (eventForm.type === 'milestone') {
      if (!eventForm.project_id) { toast({ title: 'Select a project for milestone', variant: 'destructive' }); return; }
      await supabase.from('milestones').insert({
        title: eventForm.title, date: eventForm.date, project_id: eventForm.project_id, user_id: user.id,
      });
    } else if (eventForm.type === 'meeting') {
      if (!eventForm.project_id) { toast({ title: 'Select a project for meeting', variant: 'destructive' }); return; }
      const scheduledAt = eventForm.time ? `${eventForm.date}T${eventForm.time}` : `${eventForm.date}T09:00`;
      await supabase.from('meetings').insert({
        title: eventForm.title, scheduled_at: scheduledAt, project_id: eventForm.project_id, user_id: user.id,
      });
    }
    toast({ title: 'Event added to calendar' });
    setAddDialog(false);
    setEventForm({ title: '', type: 'task', date: '', time: '', project_id: '', description: '' });
    // Reload
    const [tasksRes, msRes, meetRes] = await Promise.all([
      supabase.from('tasks').select('id, title, due_date, due_time, priority, project_id, status, time_estimate_min').not('due_date', 'is', null),
      supabase.from('milestones').select('id, title, date, is_completed, project_id'),
      supabase.from('meetings').select('id, title, scheduled_at, attendees, agenda_html, notes_html, action_items, project_id'),
    ]);
    const items: CalEvent[] = [];
    (tasksRes.data ?? []).forEach(t => { if (t.due_date) items.push({ id: `t-${t.id}`, title: t.title, date: new Date(t.due_date), type: 'task', meta: t.priority, rawData: t }); });
    (msRes.data ?? []).forEach(m => { items.push({ id: `m-${m.id}`, title: m.title, date: new Date(m.date), type: 'milestone', meta: m.is_completed ? 'done' : 'pending', rawData: m }); });
    (meetRes.data ?? []).forEach(m => { items.push({ id: `mt-${m.id}`, title: m.title, date: new Date(m.scheduled_at), type: 'meeting', rawData: m }); });
    setEvents(items);
  };

  const projectName = (pid: string) => projects.find(p => p.id === pid)?.name || '';

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;

  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader title="Calendar" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => { setAddDialog(true); setEventForm({ ...eventForm, date: format(new Date(), 'yyyy-MM-dd') }); }}>
            <Plus className="mr-1 h-3.5 w-3.5" />Add Event
          </Button>
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
                      <button key={e.id} onClick={() => setSelectedEvent(e)} className={`flex items-center gap-1 rounded px-1 py-0.5 text-[10px] sm:text-xs truncate w-full text-left hover:bg-muted/50 ${typeColor(e.type)}`}>
                        {typeIcon(e.type)}
                        <span className="truncate">{e.title}</span>
                      </button>
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
                  <CardTitle className={`text-xs ${isToday(day) ? 'text-primary' : 'text-muted-foreground'}`}>{format(day, 'EEE d')}</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 space-y-1">
                  {dayEvents.map(e => (
                    <button key={e.id} onClick={() => setSelectedEvent(e)} className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs w-full text-left ${typeColor(e.type)} bg-muted/30 hover:bg-muted/60`}>
                      {typeIcon(e.type)}
                      <span className="truncate">{e.title}</span>
                    </button>
                  ))}
                  {dayEvents.length === 0 && <p className="text-xs text-muted-foreground/50 text-center py-2">-</p>}
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
                    <button key={e.id} onClick={() => setSelectedEvent(e)} className={`flex items-center gap-2 text-sm w-full text-left hover:underline ${typeColor(e.type)}`}>
                      {typeIcon(e.type)}
                      <span>{e.title}</span>
                      {e.type === 'meeting' && <span className="text-xs text-muted-foreground">{format(e.date, 'h:mm a')}</span>}
                      {e.rawData?.due_time && <span className="text-xs text-muted-foreground">{e.rawData.due_time}</span>}
                    </button>
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

      {/* Event Detail Modal */}
      <Dialog open={!!selectedEvent} onOpenChange={(v) => !v && setSelectedEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedEvent && typeIcon(selectedEvent.type)}
              {selectedEvent?.title}
            </DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize">{selectedEvent.type}</Badge>
                <span className="text-sm text-muted-foreground">{format(selectedEvent.date, 'EEEE, MMMM d, yyyy')}</span>
              </div>
              {selectedEvent.type === 'task' && selectedEvent.rawData && (
                <div className="space-y-2 text-sm">
                  <div className="flex gap-4">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant="secondary" className="capitalize">{selectedEvent.rawData.status}</Badge>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-muted-foreground">Priority:</span>
                    <Badge variant="secondary" className="capitalize">{selectedEvent.rawData.priority}</Badge>
                  </div>
                  {selectedEvent.rawData.due_time && (
                    <div className="flex gap-4">
                      <span className="text-muted-foreground">Time:</span>
                      <span>{selectedEvent.rawData.due_time}</span>
                    </div>
                  )}
                  {selectedEvent.rawData.time_estimate_min && (
                    <div className="flex gap-4">
                      <span className="text-muted-foreground">Estimate:</span>
                      <span>{selectedEvent.rawData.time_estimate_min} min</span>
                    </div>
                  )}
                  {selectedEvent.rawData.project_id && (
                    <div className="flex gap-4">
                      <span className="text-muted-foreground">Project:</span>
                      <span>{projectName(selectedEvent.rawData.project_id)}</span>
                    </div>
                  )}
                </div>
              )}
              {selectedEvent.type === 'milestone' && selectedEvent.rawData && (
                <div className="space-y-2 text-sm">
                  <div className="flex gap-4">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant={selectedEvent.rawData.is_completed ? 'default' : 'secondary'}>{selectedEvent.rawData.is_completed ? 'Completed' : 'Pending'}</Badge>
                  </div>
                  {selectedEvent.rawData.project_id && (
                    <div className="flex gap-4">
                      <span className="text-muted-foreground">Project:</span>
                      <span>{projectName(selectedEvent.rawData.project_id)}</span>
                    </div>
                  )}
                </div>
              )}
              {selectedEvent.type === 'meeting' && selectedEvent.rawData && (
                <div className="space-y-2 text-sm">
                  <div className="flex gap-4">
                    <span className="text-muted-foreground">Time:</span>
                    <span>{format(selectedEvent.date, 'h:mm a')}</span>
                  </div>
                  {selectedEvent.rawData.attendees && (
                    <div className="flex gap-4">
                      <span className="text-muted-foreground">Attendees:</span>
                      <span>{selectedEvent.rawData.attendees}</span>
                    </div>
                  )}
                  {selectedEvent.rawData.agenda_html && (
                    <div>
                      <span className="text-muted-foreground">Agenda:</span>
                      <div className="mt-1 rounded bg-muted/50 p-2 text-xs" dangerouslySetInnerHTML={{ __html: selectedEvent.rawData.agenda_html }} />
                    </div>
                  )}
                  {selectedEvent.rawData.notes_html && (
                    <div>
                      <span className="text-muted-foreground">Notes:</span>
                      <div className="mt-1 rounded bg-muted/50 p-2 text-xs" dangerouslySetInnerHTML={{ __html: selectedEvent.rawData.notes_html }} />
                    </div>
                  )}
                  {selectedEvent.rawData.action_items && (
                    <div className="flex gap-4">
                      <span className="text-muted-foreground">Action Items:</span>
                      <span>{selectedEvent.rawData.action_items}</span>
                    </div>
                  )}
                  {selectedEvent.rawData.project_id && (
                    <div className="flex gap-4">
                      <span className="text-muted-foreground">Project:</span>
                      <span>{projectName(selectedEvent.rawData.project_id)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Event Modal */}
      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Calendar Event</DialogTitle></DialogHeader>
          <form onSubmit={handleAddEvent} className="space-y-4">
            <div className="space-y-2"><Label>Title</Label><Input value={eventForm.title} onChange={e => setEventForm({ ...eventForm, title: e.target.value })} required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={eventForm.type} onValueChange={v => setEventForm({ ...eventForm, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="task">Task</SelectItem>
                    <SelectItem value="milestone">Milestone</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Project</Label>
                <Select value={eventForm.project_id} onValueChange={v => setEventForm({ ...eventForm, project_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>
                    {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Date</Label><Input type="date" value={eventForm.date} onChange={e => setEventForm({ ...eventForm, date: e.target.value })} required /></div>
              <div className="space-y-2"><Label>Time</Label><Input type="time" value={eventForm.time} onChange={e => setEventForm({ ...eventForm, time: e.target.value })} /></div>
            </div>
            {eventForm.type === 'task' && (
              <div className="space-y-2"><Label>Description</Label><Textarea value={eventForm.description} onChange={e => setEventForm({ ...eventForm, description: e.target.value })} rows={2} /></div>
            )}
            <Button type="submit" className="w-full">Add to Calendar</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
