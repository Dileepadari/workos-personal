import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FolderKanban, CheckSquare, FileText, Link2, Plus, Clock, AlertTriangle, Calendar, CalendarClock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { format, isToday, isBefore, startOfToday, addDays, isWithinInterval } from 'date-fns';
import { cn } from '@/lib/utils';

interface Task {
  id: string; title: string; status: string; priority: string;
  due_date: string | null; time_estimate_min: number | null;
  project_id: string | null;
}
interface Project {
  id: string; name: string; status: string; color: string; slug: string | null;
}
interface Milestone {
  id: string; title: string; date: string; project_id: string; is_completed: boolean;
}

const priorityColors: Record<string, string> = {
  urgent: 'bg-destructive/20 text-destructive',
  high: 'bg-warning/20 text-warning',
  medium: 'bg-primary/20 text-primary',
  low: 'bg-muted text-muted-foreground',
};
const projectStatusColors: Record<string, string> = {
  active: 'bg-success/20 text-success',
  on_hold: 'bg-warning/20 text-warning',
  archived: 'bg-muted text-muted-foreground',
};

export default function Dashboard() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickTask, setQuickTask] = useState('');
  const [stats, setStats] = useState({ projects: 0, links: 0, notes: 0 });

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [tasksRes, projRes, msRes, linksRes, notesRes] = await Promise.all([
        supabase.from('tasks').select('id, title, status, priority, due_date, time_estimate_min, project_id').order('due_date', { ascending: true }),
        supabase.from('projects').select('id, name, status, color, slug').order('updated_at', { ascending: false }),
        supabase.from('milestones').select('*').eq('is_completed', false).order('date', { ascending: true }),
        supabase.from('links').select('id', { count: 'exact', head: true }),
        supabase.from('notes').select('id', { count: 'exact', head: true }),
      ]);
      setTasks(tasksRes.data ?? []);
      setProjects(projRes.data ?? []);
      setMilestones(msRes.data ?? []);
      setStats({ projects: projRes.data?.length ?? 0, links: linksRes.count ?? 0, notes: notesRes.count ?? 0 });
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const today = startOfToday();
  const openTasks = tasks.filter(t => t.status !== 'done');
  const todayTasks = openTasks.filter(t => t.due_date && isToday(new Date(t.due_date)));
  const overdueTasks = openTasks.filter(t => t.due_date && isBefore(new Date(t.due_date), today));
  const upcomingTasks = openTasks.filter(t => t.due_date && isWithinInterval(new Date(t.due_date), { start: addDays(today, 1), end: addDays(today, 7) }));
  const doneTodayTasks = tasks.filter(t => t.status === 'done');
  const projectMap = Object.fromEntries(projects.map(p => [p.id, p]));

  const totalEstimateToday = todayTasks.reduce((sum, t) => sum + (t.time_estimate_min ?? 0), 0);
  const totalEstimateWeek = openTasks.filter(t => t.due_date && isWithinInterval(new Date(t.due_date), { start: today, end: addDays(today, 7) })).reduce((sum, t) => sum + (t.time_estimate_min ?? 0), 0);
  const availableHours = 7 * 8; // 7 days * 8h
  const workloadWarning = totalEstimateWeek / 60 > availableHours;

  const handleQuickTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTask.trim()) return;
    await supabase.from('tasks').insert({ title: quickTask.trim(), user_id: user!.id, status: 'todo', priority: 'medium' });
    setQuickTask('');
    const { data } = await supabase.from('tasks').select('id, title, status, priority, due_date, time_estimate_min, project_id').order('due_date', { ascending: true });
    setTasks(data ?? []);
  };

  const toggleTask = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'done' ? 'todo' : 'done';
    await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
  };

  const snoozeTask = async (taskId: string, newDate: Date) => {
    const dateStr = format(newDate, 'yyyy-MM-dd');
    await supabase.from('tasks').update({ due_date: dateStr }).eq('id', taskId);
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, due_date: dateStr } : t));
  };

  const TaskRow = ({ task, showSnooze }: { task: Task; showSnooze?: boolean }) => (
    <div className="flex items-center gap-2 sm:gap-3 rounded-md px-2 sm:px-3 py-2 transition-colors hover:bg-muted/50">
      <Checkbox checked={task.status === 'done'} onCheckedChange={() => toggleTask(task.id, task.status)} />
      <div className="flex-1 min-w-0">
        <span className={`text-xs sm:text-sm ${task.status === 'done' ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{task.title}</span>
      </div>
      {task.project_id && projectMap[task.project_id] && (
        <Badge variant="outline" className="text-[10px] sm:text-xs shrink-0 hidden sm:flex">
          <span className="mr-1 h-1.5 w-1.5 rounded-full inline-block" style={{ backgroundColor: projectMap[task.project_id].color }} />
          {projectMap[task.project_id].name.substring(0, 12)}
        </Badge>
      )}
      <Badge className={`text-[10px] sm:text-xs shrink-0 ${priorityColors[task.priority]}`}>{task.priority}</Badge>
      {task.time_estimate_min && <span className="text-[10px] sm:text-xs text-muted-foreground shrink-0 hidden sm:inline">{task.time_estimate_min}m</span>}
      {showSnooze && (
        <div className="flex gap-1 shrink-0">
          <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px]" onClick={() => snoozeTask(task.id, addDays(new Date(), 1))}>
            Tomorrow
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 px-1.5"><CalendarClock className="h-3 w-3" /></Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarPicker mode="single" onSelect={(d) => d && snoozeTask(task.id, d)} className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="animate-fade-in space-y-4 sm:space-y-6 max-w-[1200px]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {todayTasks.length} tasks today · {totalEstimateToday > 0 ? `${Math.floor(totalEstimateToday / 60)}h ${totalEstimateToday % 60}m estimated` : 'no estimates'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" asChild><Link to="/tasks"><CheckSquare className="mr-1 h-3.5 w-3.5" />Tasks</Link></Button>
          <Button size="sm" asChild><Link to="/projects"><Plus className="mr-1 h-3.5 w-3.5" />Project</Link></Button>
        </div>
      </div>

      {/* Quick Task */}
      <form onSubmit={handleQuickTask} className="flex gap-2">
        <Input value={quickTask} onChange={e => setQuickTask(e.target.value)} placeholder="Quick add a task... press Enter" className="flex-1" />
        <Button type="submit" variant="secondary" disabled={!quickTask.trim()}><Plus className="h-4 w-4" /></Button>
      </form>

      {/* Workload warning */}
      {workloadWarning && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="flex items-center gap-3 p-3">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
            <p className="text-xs sm:text-sm text-warning">Workload warning: {Math.round(totalEstimateWeek / 60)}h estimated this week exceeds {availableHours}h available.</p>
          </CardContent>
        </Card>
      )}

      {/* Time Estimates Summary */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-xs sm:text-sm font-medium text-foreground">This Week</span>
            </div>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>{Math.round(totalEstimateWeek / 60)}h estimated</span>
              <span>{doneTodayTasks.length} completed</span>
              <span>{openTasks.length} open</span>
            </div>
          </div>
          {/* Per-project breakdown */}
          <div className="mt-3 space-y-1.5">
            {projects.slice(0, 5).map(p => {
              const projTasks = openTasks.filter(t => t.project_id === p.id);
              const est = projTasks.reduce((s, t) => s + (t.time_estimate_min ?? 0), 0);
              if (est === 0) return null;
              return (
                <div key={p.id} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-20 sm:w-28 truncate">{p.name}</span>
                  <div className="flex-1 h-2 rounded-full bg-muted">
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min((est / totalEstimateWeek) * 100, 100)}%`, backgroundColor: p.color }} />
                  </div>
                  <span className="text-[10px] text-muted-foreground w-10 text-right">{Math.round(est / 60)}h</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Project Status Strip */}
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        {projects.map(p => {
          const projTasks = tasks.filter(t => t.project_id === p.id);
          const done = projTasks.filter(t => t.status === 'done').length;
          const total = projTasks.length;
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;
          return (
            <Link key={p.id} to={`/projects/${p.slug || p.id}`} className="shrink-0">
              <Card className="w-40 sm:w-48 transition-colors hover:bg-card/80">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                    <span className="text-xs sm:text-sm font-medium text-foreground truncate">{p.name.substring(0, 18)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground">{pct}%</span>
                  </div>
                  <Badge className={`mt-2 text-[10px] capitalize ${projectStatusColors[p.status] || 'bg-muted text-muted-foreground'}`}>{p.status.replace('_', ' ')}</Badge>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
        {/* Overdue */}
        {overdueTasks.length > 0 && (
          <Card className="border-destructive/30">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4" />Overdue
                <Badge variant="destructive" className="text-xs">{overdueTasks.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {overdueTasks.map(t => <TaskRow key={t.id} task={t} showSnooze />)}
            </CardContent>
          </Card>
        )}

        {/* Today */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-primary" />Today
              <Badge variant="secondary" className="text-xs">{todayTasks.length}</Badge>
              {todayTasks.length > 0 && (
                <span className="ml-auto text-[10px] sm:text-xs text-muted-foreground">
                  {doneTodayTasks.length}/{todayTasks.length + doneTodayTasks.length} done
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {todayTasks.length === 0 ? (
              <p className="py-3 text-center text-xs text-muted-foreground">No tasks due today</p>
            ) : todayTasks.map(t => <TaskRow key={t.id} task={t} />)}
            {doneTodayTasks.length > 0 && (
              <details className="pt-2">
                <summary className="cursor-pointer text-xs text-muted-foreground">✓ {doneTodayTasks.length} completed</summary>
                <div className="mt-1 space-y-1">
                  {doneTodayTasks.slice(0, 5).map(t => <TaskRow key={t.id} task={t} />)}
                </div>
              </details>
            )}
          </CardContent>
        </Card>

        {/* Upcoming 7 Days */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-primary" />Next 7 Days
              <Badge variant="secondary" className="text-xs">{upcomingTasks.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {upcomingTasks.length === 0 ? (
              <p className="py-3 text-center text-xs text-muted-foreground">No upcoming tasks</p>
            ) : upcomingTasks.map(t => (
              <div key={t.id} className="flex items-center gap-2 sm:gap-3 rounded-md px-2 sm:px-3 py-2 hover:bg-muted/50">
                <span className="text-[10px] sm:text-xs text-muted-foreground w-10 sm:w-12 shrink-0">{format(new Date(t.due_date!), 'MMM d')}</span>
                <span className="text-xs sm:text-sm text-foreground flex-1 truncate">{t.title}</span>
                <Badge className={`text-[10px] sm:text-xs ${priorityColors[t.priority]}`}>{t.priority}</Badge>
              </div>
            ))}
            {milestones.filter(m => isWithinInterval(new Date(m.date), { start: today, end: addDays(today, 7) })).map(m => (
              <div key={m.id} className="flex items-center gap-2 sm:gap-3 rounded-md px-2 sm:px-3 py-2 bg-primary/5">
                <span className="text-[10px] sm:text-xs text-primary w-10 sm:w-12 shrink-0">{format(new Date(m.date), 'MMM d')}</span>
                <span className="text-xs sm:text-sm text-primary flex-1 truncate">🚩 {m.title}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-4">
        {[
          { label: 'Projects', value: stats.projects, icon: FolderKanban, to: '/projects' },
          { label: 'Open Tasks', value: openTasks.length, icon: CheckSquare, to: '/tasks' },
          { label: 'Links Saved', value: stats.links, icon: Link2, to: '/links' },
          { label: 'Notes', value: stats.notes, icon: FileText, to: '/notes' },
        ].map(({ label, value, icon: Icon, to }) => (
          <Link key={label} to={to}>
            <Card className="transition-colors hover:bg-card/80">
              <CardContent className="flex items-center gap-3 p-3 sm:p-4">
                <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <div>
                  <p className="text-lg sm:text-xl font-semibold text-foreground">{value}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">{label}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
