import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckSquare, FileText, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface Project {
  id: string; name: string; description: string | null;
  status: string; color: string; created_at: string; updated_at: string;
}
interface Task {
  id: string; title: string; status: string; priority: string; due_date: string | null;
}
interface Note {
  id: string; title: string; content: string | null; updated_at: string;
}

const priorityColors: Record<string, string> = {
  urgent: 'bg-destructive/20 text-destructive',
  high: 'bg-warning/20 text-warning',
  medium: 'bg-primary/20 text-primary',
  low: 'bg-muted text-muted-foreground',
};
const statusColors: Record<string, string> = {
  active: 'bg-success/20 text-success',
  on_hold: 'bg-warning/20 text-warning',
  archived: 'bg-muted text-muted-foreground',
};
const taskStatusLabels: Record<string, string> = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' };

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !id) return;
    const fetch = async () => {
      const [projRes, tasksRes, notesRes] = await Promise.all([
        supabase.from('projects').select('*').eq('id', id).single(),
        supabase.from('tasks').select('id, title, status, priority, due_date').eq('project_id', id).order('created_at', { ascending: false }),
        supabase.from('notes').select('id, title, content, updated_at').eq('project_id', id).order('updated_at', { ascending: false }),
      ]);
      setProject(projRes.data);
      setTasks(tasksRes.data ?? []);
      setNotes(notesRes.data ?? []);
      setLoading(false);
    };
    fetch();
  }, [user, id]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="animate-fade-in space-y-4">
        <p className="text-muted-foreground">Project not found.</p>
        <Button variant="outline" asChild><Link to="/projects">Back to Projects</Link></Button>
      </div>
    );
  }

  const openTasks = tasks.filter((t) => t.status !== 'done');
  const doneTasks = tasks.filter((t) => t.status === 'done');

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/projects"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 rounded-full" style={{ backgroundColor: project.color }} />
          <h1 className="text-2xl font-semibold text-foreground">{project.name}</h1>
        </div>
        <Badge className={`text-xs capitalize ${statusColors[project.status]}`}>{project.status.replace('_', ' ')}</Badge>
      </div>

      {project.description && (
        <p className="text-sm text-muted-foreground">{project.description}</p>
      )}

      <div className="flex gap-4 text-xs text-muted-foreground">
        <span>Created {format(new Date(project.created_at), 'MMM d, yyyy')}</span>
        <span>Updated {format(new Date(project.updated_at), 'MMM d, yyyy')}</span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckSquare className="h-4 w-4 text-primary" />
              Tasks
              <Badge variant="secondary" className="text-xs">{tasks.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {tasks.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No tasks linked to this project</p>
            ) : (
              <>
                {openTasks.map((t) => (
                  <div key={t.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <Badge className={`text-xs ${priorityColors[t.priority]}`}>{t.priority}</Badge>
                      <span className="text-sm text-foreground">{t.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{taskStatusLabels[t.status]}</Badge>
                      {t.due_date && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />{format(new Date(t.due_date), 'MMM d')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {doneTasks.length > 0 && (
                  <div className="pt-2">
                    <p className="mb-2 text-xs font-medium text-muted-foreground">{doneTasks.length} completed</p>
                    {doneTasks.map((t) => (
                      <div key={t.id} className="flex items-center gap-2 px-3 py-1.5">
                        <span className="text-sm text-muted-foreground line-through">{t.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-primary" />
              Notes
              <Badge variant="secondary" className="text-xs">{notes.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {notes.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No notes linked to this project</p>
            ) : (
              notes.map((n) => (
                <div key={n.id} className="rounded-md border border-border px-3 py-2.5">
                  <h4 className="text-sm font-medium text-foreground">{n.title}</h4>
                  {n.content && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{n.content}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">{format(new Date(n.updated_at), 'MMM d, yyyy')}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
