import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, CheckSquare, FileText, Flag, LinkIcon, MessageSquare, Calendar, Users, Plus, Trash2, ExternalLink, Clock, Pin } from 'lucide-react';
import { format } from 'date-fns';

interface Project { id: string; name: string; description: string | null; status: string; color: string; slug: string | null; type: string; tags: string[]; start_date: string | null; target_end_date: string | null; repo_url: string | null; status_note: string | null; created_at: string; updated_at: string; }
interface Task { id: string; title: string; status: string; priority: string; due_date: string | null; time_estimate_min: number | null; description: string | null; }
interface Milestone { id: string; title: string; date: string; is_completed: boolean; }
interface Resource { id: string; title: string; url: string | null; type: string; tags: string[]; }
interface Discussion { id: string; body_html: string; author: string; author_type: string; is_pinned: boolean; created_at: string; }
interface Meeting { id: string; title: string; scheduled_at: string; attendees: string | null; agenda_html: string | null; notes_html: string | null; }
interface Note { id: string; title: string; content: string | null; updated_at: string; }

const priorityColors: Record<string, string> = { urgent: 'bg-destructive/20 text-destructive', high: 'bg-warning/20 text-warning', medium: 'bg-primary/20 text-primary', low: 'bg-muted text-muted-foreground' };
const statusColors: Record<string, string> = { active: 'bg-success/20 text-success', on_hold: 'bg-warning/20 text-warning', archived: 'bg-muted text-muted-foreground' };

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  // Add forms
  const [taskDialog, setTaskDialog] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', priority: 'medium', due_date: '', time_estimate_min: '' });
  const [milestoneDialog, setMilestoneDialog] = useState(false);
  const [msForm, setMsForm] = useState({ title: '', date: '' });
  const [resourceDialog, setResourceDialog] = useState(false);
  const [resForm, setResForm] = useState({ title: '', url: '', type: 'link' });
  const [discussionText, setDiscussionText] = useState('');

  useEffect(() => {
    if (!user || !id) return;
    const load = async () => {
      // Try slug first, then id
      let projRes = await supabase.from('projects').select('*').eq('slug', id).maybeSingle();
      if (!projRes.data) projRes = await supabase.from('projects').select('*').eq('id', id).maybeSingle();
      if (!projRes.data) { setLoading(false); return; }
      setProject(projRes.data);
      const pid = projRes.data.id;
      const [t, m, r, d, mt, n] = await Promise.all([
        supabase.from('tasks').select('*').eq('project_id', pid).order('sort_order').order('created_at', { ascending: false }),
        supabase.from('milestones').select('*').eq('project_id', pid).order('date'),
        supabase.from('resources').select('*').eq('project_id', pid).order('created_at', { ascending: false }),
        supabase.from('discussions').select('*').eq('project_id', pid).order('is_pinned', { ascending: false }).order('created_at', { ascending: false }),
        supabase.from('meetings').select('*').eq('project_id', pid).order('scheduled_at', { ascending: false }),
        supabase.from('notes').select('*').eq('project_id', pid).order('updated_at', { ascending: false }),
      ]);
      setTasks(t.data ?? []); setMilestones(m.data ?? []); setResources(r.data ?? []);
      setDiscussions(d.data ?? []); setMeetings(mt.data ?? []); setNotes(n.data ?? []);
      setLoading(false);
    };
    load();
  }, [user, id]);

  const reload = async () => {
    if (!project) return;
    const pid = project.id;
    const [t, m, r, d, mt, n] = await Promise.all([
      supabase.from('tasks').select('*').eq('project_id', pid).order('sort_order').order('created_at', { ascending: false }),
      supabase.from('milestones').select('*').eq('project_id', pid).order('date'),
      supabase.from('resources').select('*').eq('project_id', pid).order('created_at', { ascending: false }),
      supabase.from('discussions').select('*').eq('project_id', pid).order('is_pinned', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('meetings').select('*').eq('project_id', pid).order('scheduled_at', { ascending: false }),
      supabase.from('notes').select('*').eq('project_id', pid).order('updated_at', { ascending: false }),
    ]);
    setTasks(t.data ?? []); setMilestones(m.data ?? []); setResources(r.data ?? []);
    setDiscussions(d.data ?? []); setMeetings(mt.data ?? []); setNotes(n.data ?? []);
  };

  const toggleTask = async (task: Task) => {
    await supabase.from('tasks').update({ status: task.status === 'done' ? 'todo' : 'done' }).eq('id', task.id);
    reload();
  };

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.from('tasks').insert({ title: taskForm.title, priority: taskForm.priority, due_date: taskForm.due_date || null, time_estimate_min: taskForm.time_estimate_min ? parseInt(taskForm.time_estimate_min) : null, project_id: project!.id, user_id: user!.id, status: 'todo' });
    setTaskDialog(false); setTaskForm({ title: '', priority: 'medium', due_date: '', time_estimate_min: '' }); reload();
  };

  const addMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.from('milestones').insert({ title: msForm.title, date: msForm.date, project_id: project!.id, user_id: user!.id });
    setMilestoneDialog(false); setMsForm({ title: '', date: '' }); reload();
  };

  const toggleMilestone = async (ms: Milestone) => {
    await supabase.from('milestones').update({ is_completed: !ms.is_completed }).eq('id', ms.id);
    reload();
  };

  const addResource = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.from('resources').insert({ title: resForm.title, url: resForm.url || null, type: resForm.type, project_id: project!.id, user_id: user!.id });
    setResourceDialog(false); setResForm({ title: '', url: '', type: 'link' }); reload();
  };

  const addDiscussion = async () => {
    if (!discussionText.trim()) return;
    await supabase.from('discussions').insert({ body_html: `<p>${discussionText}</p>`, author: user!.email!, author_type: 'owner', project_id: project!.id, user_id: user!.id });
    setDiscussionText(''); reload();
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  if (!project) return <div className="animate-fade-in space-y-4"><p className="text-muted-foreground">Project not found.</p><Button variant="outline" asChild><Link to="/projects">Back</Link></Button></div>;

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <div className="animate-fade-in space-y-6 max-w-[1200px]">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild><Link to="/projects"><ArrowLeft className="h-4 w-4" /></Link></Button>
          <div className="h-4 w-1 rounded" style={{ backgroundColor: project.color }} />
          <h1 className="text-2xl font-semibold text-foreground">{project.name}</h1>
          <Badge className={`capitalize ${statusColors[project.status] || 'bg-muted text-muted-foreground'}`}>{project.status.replace('_', ' ')}</Badge>
          {project.type && <Badge variant="outline" className="capitalize">{project.type.replace('_', ' ')}</Badge>}
        </div>
        {project.tags?.length > 0 && (
          <div className="flex gap-1 pl-12">{project.tags.map(t => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}</div>
        )}
        <div className="flex items-center gap-6 pl-12 text-xs text-muted-foreground">
          <span>{doneTasks}/{totalTasks} tasks</span>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-32 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} /></div>
            <span>{pct}%</span>
          </div>
          {project.repo_url && <a href={project.repo_url} target="_blank" rel="noopener noreferrer" className="hover:text-primary">Repository ↗</a>}
        </div>
        {project.status_note && <p className="ml-12 text-sm text-primary italic">{project.status_note}</p>}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks"><CheckSquare className="mr-1 h-3.5 w-3.5" />Tasks ({totalTasks})</TabsTrigger>
          <TabsTrigger value="milestones"><Flag className="mr-1 h-3.5 w-3.5" />Milestones ({milestones.length})</TabsTrigger>
          <TabsTrigger value="resources"><LinkIcon className="mr-1 h-3.5 w-3.5" />Resources ({resources.length})</TabsTrigger>
          <TabsTrigger value="discussions"><MessageSquare className="mr-1 h-3.5 w-3.5" />Discussions ({discussions.length})</TabsTrigger>
          <TabsTrigger value="meetings"><Calendar className="mr-1 h-3.5 w-3.5" />Meetings ({meetings.length})</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-4">
          {project.description && <Card><CardContent className="p-5"><p className="text-sm text-foreground">{project.description}</p></CardContent></Card>}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-semibold text-foreground">{doneTasks}</p><p className="text-xs text-muted-foreground">Completed</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-semibold text-foreground">{totalTasks - doneTasks}</p><p className="text-xs text-muted-foreground">Remaining</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-semibold text-foreground">{milestones.filter(m => !m.is_completed).length}</p><p className="text-xs text-muted-foreground">Milestones</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-semibold text-foreground">{resources.length}</p><p className="text-xs text-muted-foreground">Resources</p></CardContent></Card>
          </div>
          {project.start_date && <div className="flex gap-4 text-xs text-muted-foreground"><span>Started: {format(new Date(project.start_date), 'MMM d, yyyy')}</span>{project.target_end_date && <span>Target: {format(new Date(project.target_end_date), 'MMM d, yyyy')}</span>}</div>}
        </TabsContent>

        {/* Tasks */}
        <TabsContent value="tasks" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={taskDialog} onOpenChange={setTaskDialog}>
              <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-3.5 w-3.5" />Add Task</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Task</DialogTitle></DialogHeader>
                <form onSubmit={addTask} className="space-y-4">
                  <div className="space-y-2"><Label>Title</Label><Input value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} required /></div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2"><Label>Priority</Label><Input value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Due Date</Label><Input type="date" value={taskForm.due_date} onChange={e => setTaskForm({ ...taskForm, due_date: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Est. (min)</Label><Input type="number" value={taskForm.time_estimate_min} onChange={e => setTaskForm({ ...taskForm, time_estimate_min: e.target.value })} /></div>
                  </div>
                  <Button type="submit" className="w-full">Add Task</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          {['todo', 'in_progress', 'done'].map(status => {
            const statusTasks = tasks.filter(t => t.status === status);
            if (statusTasks.length === 0) return null;
            return (
              <div key={status}>
                <h3 className="mb-2 text-xs font-medium uppercase text-muted-foreground">{status === 'todo' ? 'To Do' : status === 'in_progress' ? 'In Progress' : 'Done'} ({statusTasks.length})</h3>
                <div className="space-y-1">
                  {statusTasks.map(task => (
                    <div key={task.id} className="flex items-center gap-3 rounded-md border border-border px-3 py-2.5 transition-colors hover:bg-muted/30">
                      <Checkbox checked={task.status === 'done'} onCheckedChange={() => toggleTask(task)} />
                      <span className={`flex-1 text-sm ${task.status === 'done' ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{task.title}</span>
                      <Badge className={`text-xs ${priorityColors[task.priority]}`}>{task.priority}</Badge>
                      {task.time_estimate_min && <span className="text-xs text-muted-foreground">{task.time_estimate_min}m</span>}
                      {task.due_date && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" />{format(new Date(task.due_date), 'MMM d')}</span>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </TabsContent>

        {/* Milestones */}
        <TabsContent value="milestones" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={milestoneDialog} onOpenChange={setMilestoneDialog}>
              <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-3.5 w-3.5" />Add Milestone</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Milestone</DialogTitle></DialogHeader>
                <form onSubmit={addMilestone} className="space-y-4">
                  <div className="space-y-2"><Label>Title</Label><Input value={msForm.title} onChange={e => setMsForm({ ...msForm, title: e.target.value })} required /></div>
                  <div className="space-y-2"><Label>Date</Label><Input type="date" value={msForm.date} onChange={e => setMsForm({ ...msForm, date: e.target.value })} required /></div>
                  <Button type="submit" className="w-full">Add Milestone</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          {milestones.map(ms => (
            <div key={ms.id} className="flex items-center gap-3 rounded-md border border-border px-4 py-3 transition-colors hover:bg-muted/30">
              <Checkbox checked={ms.is_completed} onCheckedChange={() => toggleMilestone(ms)} />
              <Flag className={`h-4 w-4 ${ms.is_completed ? 'text-success' : 'text-primary'}`} />
              <span className={`flex-1 text-sm ${ms.is_completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{ms.title}</span>
              <span className="text-xs text-muted-foreground">{format(new Date(ms.date), 'MMM d, yyyy')}</span>
            </div>
          ))}
          {milestones.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No milestones yet</p>}
        </TabsContent>

        {/* Resources */}
        <TabsContent value="resources" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={resourceDialog} onOpenChange={setResourceDialog}>
              <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-3.5 w-3.5" />Add Resource</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Resource</DialogTitle></DialogHeader>
                <form onSubmit={addResource} className="space-y-4">
                  <div className="space-y-2"><Label>Title</Label><Input value={resForm.title} onChange={e => setResForm({ ...resForm, title: e.target.value })} required /></div>
                  <div className="space-y-2"><Label>URL</Label><Input value={resForm.url} onChange={e => setResForm({ ...resForm, url: e.target.value })} placeholder="https://" /></div>
                  <div className="space-y-2"><Label>Type</Label><Input value={resForm.type} onChange={e => setResForm({ ...resForm, type: e.target.value })} placeholder="link, pdf, doc, etc." /></div>
                  <Button type="submit" className="w-full">Add Resource</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          {resources.map(r => (
            <Card key={r.id}>
              <CardContent className="flex items-center gap-4 p-4">
                <Badge variant="outline" className="text-xs capitalize">{r.type}</Badge>
                <span className="flex-1 text-sm text-foreground">{r.title}</span>
                {r.tags?.length > 0 && r.tags.map(tag => <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>)}
                {r.url && <a href={r.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4 text-muted-foreground hover:text-primary" /></a>}
              </CardContent>
            </Card>
          ))}
          {resources.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No resources yet</p>}
        </TabsContent>

        {/* Discussions */}
        <TabsContent value="discussions" className="space-y-4">
          <div className="flex gap-2">
            <Textarea value={discussionText} onChange={e => setDiscussionText(e.target.value)} placeholder="Write a discussion entry..." rows={2} className="flex-1" />
            <Button onClick={addDiscussion} disabled={!discussionText.trim()} className="shrink-0">Post</Button>
          </div>
          {discussions.map(d => (
            <Card key={d.id} className={d.is_pinned ? 'border-primary/30' : ''}>
              <CardContent className="p-4">
                <div className="mb-2 flex items-center gap-2">
                  {d.is_pinned && <Pin className="h-3.5 w-3.5 text-primary" />}
                  <span className="text-xs font-medium text-foreground">{d.author}</span>
                  <Badge variant="outline" className="text-xs capitalize">{d.author_type}</Badge>
                  <span className="text-xs text-muted-foreground">{format(new Date(d.created_at), 'MMM d, h:mm a')}</span>
                </div>
                <div className="text-sm text-foreground" dangerouslySetInnerHTML={{ __html: d.body_html }} />
              </CardContent>
            </Card>
          ))}
          {discussions.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No discussions yet</p>}
        </TabsContent>

        {/* Meetings */}
        <TabsContent value="meetings" className="space-y-4">
          {meetings.map(m => {
            const isPast = new Date(m.scheduled_at) < new Date();
            return (
              <Card key={m.id} className={isPast ? 'opacity-70' : ''}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-foreground">{m.title}</h4>
                    <span className="text-xs text-muted-foreground">{format(new Date(m.scheduled_at), 'MMM d, h:mm a')}</span>
                  </div>
                  {m.attendees && <p className="text-xs text-muted-foreground">With: {m.attendees}</p>}
                  {m.agenda_html && <div className="text-xs text-muted-foreground" dangerouslySetInnerHTML={{ __html: m.agenda_html }} />}
                  {m.notes_html && <div className="mt-2 rounded bg-muted/50 p-3 text-xs text-foreground" dangerouslySetInnerHTML={{ __html: m.notes_html }} />}
                </CardContent>
              </Card>
            );
          })}
          {meetings.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No meetings yet</p>}
        </TabsContent>
      </Tabs>
    </div>
  );
}
