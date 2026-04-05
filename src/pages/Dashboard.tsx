import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FolderKanban, CheckSquare, FileText, Bookmark, Plus, Clock, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';

interface Stats { projects: number; tasks: number; notes: number; bookmarks: number; }
interface RecentProject { id: string; name: string; status: string; updated_at: string; color: string; }
interface RecentTask { id: string; title: string; status: string; priority: string; due_date: string | null; project_id: string | null; }

const priorityColors: Record<string, string> = {
  urgent: 'bg-destructive/20 text-destructive',
  high: 'bg-warning/20 text-warning',
  medium: 'bg-primary/20 text-primary',
  low: 'bg-muted text-muted-foreground',
};
const statusLabels: Record<string, string> = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' };

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({ projects: 0, tasks: 0, notes: 0, bookmarks: 0 });
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickTask, setQuickTask] = useState('');

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [projectsRes, tasksRes, notesRes, bookmarksRes, recentProjRes, recentTaskRes] = await Promise.all([
        supabase.from('projects').select('id', { count: 'exact', head: true }),
        supabase.from('tasks').select('id', { count: 'exact', head: true }).neq('status', 'done'),
        supabase.from('notes').select('id', { count: 'exact', head: true }),
        supabase.from('bookmarks').select('id', { count: 'exact', head: true }),
        supabase.from('projects').select('id, name, status, updated_at, color').order('updated_at', { ascending: false }).limit(5),
        supabase.from('tasks').select('id, title, status, priority, due_date, project_id').neq('status', 'done').order('created_at', { ascending: false }).limit(8),
      ]);
      setStats({ projects: projectsRes.count ?? 0, tasks: tasksRes.count ?? 0, notes: notesRes.count ?? 0, bookmarks: bookmarksRes.count ?? 0 });
      setRecentProjects(recentProjRes.data ?? []);
      setRecentTasks(recentTaskRes.data ?? []);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const handleQuickTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTask.trim()) return;
    await supabase.from('tasks').insert({ title: quickTask.trim(), user_id: user!.id, status: 'todo', priority: 'medium' });
    setQuickTask('');
    // Refresh stats and tasks
    const [tasksRes, recentTaskRes] = await Promise.all([
      supabase.from('tasks').select('id', { count: 'exact', head: true }).neq('status', 'done'),
      supabase.from('tasks').select('id, title, status, priority, due_date, project_id').neq('status', 'done').order('created_at', { ascending: false }).limit(8),
    ]);
    setStats((s) => ({ ...s, tasks: tasksRes.count ?? s.tasks }));
    setRecentTasks(recentTaskRes.data ?? []);
  };

  const statCards = [
    { label: 'Projects', value: stats.projects, icon: FolderKanban, to: '/projects' },
    { label: 'Open Tasks', value: stats.tasks, icon: CheckSquare, to: '/tasks' },
    { label: 'Notes', value: stats.notes, icon: FileText, to: '/notes' },
    { label: 'Bookmarks', value: stats.bookmarks, icon: Bookmark, to: '/bookmarks' },
  ];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Your workspace overview</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" asChild>
            <Link to="/tasks"><Plus className="mr-2 h-4 w-4" />New Task</Link>
          </Button>
          <Button asChild>
            <Link to="/projects"><Plus className="mr-2 h-4 w-4" />New Project</Link>
          </Button>
        </div>
      </div>

      {/* Quick Task Add */}
      <form onSubmit={handleQuickTask} className="flex gap-2">
        <Input
          value={quickTask}
          onChange={(e) => setQuickTask(e.target.value)}
          placeholder="Quick add a task... press Enter to save"
          className="flex-1"
        />
        <Button type="submit" variant="secondary" disabled={!quickTask.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </form>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon, to }) => (
          <Link key={label} to={to}>
            <Card className="transition-colors hover:bg-card/80">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-foreground">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Projects */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Recent Projects</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/projects" className="flex items-center gap-1">View all <ArrowRight className="h-3 w-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {recentProjects.length === 0 ? (
              <div className="flex flex-col items-center py-6">
                <p className="mb-2 text-sm text-muted-foreground">No projects yet</p>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/projects"><Plus className="mr-1 h-3 w-3" />Create one</Link>
                </Button>
              </div>
            ) : (
              recentProjects.map((p) => (
                <Link
                  key={p.id}
                  to={`/projects/${p.id}`}
                  className="flex items-center justify-between rounded-md px-3 py-2.5 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                    <span className="text-sm text-foreground">{p.name}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs capitalize">{p.status.replace('_', ' ')}</Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Open Tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Open Tasks</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/tasks" className="flex items-center gap-1">View all <ArrowRight className="h-3 w-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {recentTasks.length === 0 ? (
              <div className="flex flex-col items-center py-6">
                <p className="mb-2 text-sm text-muted-foreground">No open tasks</p>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/tasks"><Plus className="mr-1 h-3 w-3" />Add one</Link>
                </Button>
              </div>
            ) : (
              recentTasks.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-md px-3 py-2.5 transition-colors hover:bg-muted/50">
                  <div className="flex items-center gap-3 min-w-0">
                    <Badge className={`text-xs shrink-0 ${priorityColors[t.priority]}`}>{t.priority}</Badge>
                    <span className="text-sm text-foreground truncate">{t.title}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-xs">{statusLabels[t.status]}</Badge>
                    {t.due_date && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(new Date(t.due_date), 'MMM d')}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
