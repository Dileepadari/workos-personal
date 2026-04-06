import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, AlertTriangle, Calendar, Flag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, isBefore, startOfToday, addHours, isWithinInterval } from 'date-fns';
import { Link } from 'react-router-dom';

interface Notification {
  id: string;
  type: 'overdue' | 'meeting' | 'milestone';
  title: string;
  subtitle?: string;
  link?: string;
  time?: string;
}

export function NotificationCenter() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const today = startOfToday();
      const twoHoursFromNow = addHours(new Date(), 2);
      const items: Notification[] = [];

      const [tasksRes, meetingsRes, msRes] = await Promise.all([
        supabase.from('tasks').select('id, title, due_date, project_id').neq('status', 'done').not('due_date', 'is', null),
        supabase.from('meetings').select('id, title, scheduled_at, project_id').gte('scheduled_at', new Date().toISOString()).order('scheduled_at'),
        supabase.from('milestones').select('id, title, date, project_id').eq('is_completed', false).order('date'),
      ]);

      // Overdue tasks
      (tasksRes.data ?? []).forEach(t => {
        if (t.due_date && isBefore(new Date(t.due_date), today)) {
          items.push({ id: `overdue-${t.id}`, type: 'overdue', title: t.title, subtitle: `Due ${format(new Date(t.due_date), 'MMM d')}` });
        }
      });

      // Upcoming meetings within 2 hours
      (meetingsRes.data ?? []).forEach(m => {
        const mDate = new Date(m.scheduled_at);
        if (isWithinInterval(mDate, { start: new Date(), end: twoHoursFromNow })) {
          items.push({ id: `meeting-${m.id}`, type: 'meeting', title: m.title, subtitle: `In ${Math.round((mDate.getTime() - Date.now()) / 60000)} min`, time: format(mDate, 'h:mm a') });
        }
      });

      // Upcoming milestones (within 3 days)
      (msRes.data ?? []).forEach(m => {
        const mDate = new Date(m.date);
        if (isWithinInterval(mDate, { start: today, end: addHours(today, 72) })) {
          items.push({ id: `ms-${m.id}`, type: 'milestone', title: m.title, subtitle: format(mDate, 'MMM d') });
        }
      });

      setNotifications(items);
    };
    fetch();
    const interval = setInterval(fetch, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, [user]);

  const activeNotifs = notifications.filter(n => !dismissed.has(n.id));
  const overdueCount = activeNotifs.filter(n => n.type === 'overdue').length;

  const iconMap = {
    overdue: <AlertTriangle className="h-4 w-4 text-destructive" />,
    meeting: <Calendar className="h-4 w-4 text-primary" />,
    milestone: <Flag className="h-4 w-4 text-warning" />,
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-4 w-4" />
          {activeNotifs.length > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {activeNotifs.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
          {overdueCount > 0 && (
            <p className="text-xs text-destructive">{overdueCount} overdue task{overdueCount > 1 ? 's' : ''}</p>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {activeNotifs.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">All caught up! 🎉</p>
          ) : (
            activeNotifs.map(n => (
              <div key={n.id} className="flex items-start gap-3 border-b border-border px-4 py-3 last:border-0 hover:bg-muted/30">
                <div className="mt-0.5">{iconMap[n.type]}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{n.title}</p>
                  {n.subtitle && <p className="text-xs text-muted-foreground">{n.subtitle}</p>}
                </div>
                <button onClick={() => setDismissed(prev => new Set([...prev, n.id]))} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
