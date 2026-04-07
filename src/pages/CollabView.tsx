import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { CheckSquare, Flag, LinkIcon, MessageSquare, Lock, Pin, ExternalLink, Clock, FolderKanban, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface Project { id: string; name: string; description: string | null; status: string; color: string; slug: string; type: string; tags: string[]; start_date: string | null; target_end_date: string | null; status_note: string | null; }
interface Task { id: string; title: string; status: string; priority: string; due_date: string | null; due_time: string | null; time_estimate_min: number | null; }
interface Milestone { id: string; title: string; date: string; is_completed: boolean; }
interface Resource { id: string; title: string; url: string | null; type: string; tags: string[]; }
interface Discussion { id: string; body_html: string; author: string; author_type: string; is_pinned: boolean; created_at: string; }
interface Meeting { id: string; title: string; scheduled_at: string; attendees: string | null; agenda_html: string | null; }
interface CollabProject { id: string; name: string; slug: string; status: string; color: string; type: string; description: string | null; role: string; open_tasks: number; total_tasks: number; }

const priorityColors: Record<string, string> = { urgent: 'bg-destructive/20 text-destructive', high: 'bg-warning/20 text-warning', medium: 'bg-primary/20 text-primary', low: 'bg-muted text-muted-foreground' };
const statusColors: Record<string, string> = { active: 'bg-success/20 text-success', on_hold: 'bg-warning/20 text-warning', archived: 'bg-muted text-muted-foreground' };

export default function CollabView() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [mode, setMode] = useState<'login' | 'projects' | 'detail'>('login');
  const [authMethod, setAuthMethod] = useState<'password' | 'account'>('account');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState('viewer');

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [collabProjects, setCollabProjects] = useState<CollabProject[]>([]);
  const [discussionText, setDiscussionText] = useState('');

  // Auto-login if user is authenticated
  useEffect(() => {
    if (user && slug) {
      handleAccountLogin(user.email!);
    } else if (user && !slug) {
      loadCollabProjects(user.email!);
    }
  }, [user, slug]);

  const handleAccountLogin = async (userEmail: string) => {
    setLoading(true);
    setError('');
    const { data, error: err } = await supabase.rpc('verify_collab_by_email', {
      p_project_slug: slug,
      p_email: userEmail,
    });
    if (err || !data?.success) {
      // Fallback to password auth
      setAuthMethod('password');
      setEmail(userEmail);
      setLoading(false);
      return;
    }
    setSessionId(data.session_id);
    setRole(data.role || 'viewer');
    await loadProjectData(data.session_id);
  };

  const loadCollabProjects = async (userEmail: string) => {
    const { data } = await supabase.rpc('get_collab_projects', { p_email: userEmail });
    if (data?.success) {
      setCollabProjects(data.projects || []);
      setMode('projects');
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { data, error: err } = await supabase.rpc('verify_collab_password', {
      p_project_slug: slug,
      p_email: email,
      p_password: password,
    });
    if (err || !data?.success) {
      setError(data?.error || err?.message || 'Authentication failed');
      setLoading(false);
      return;
    }
    setSessionId(data.session_id);
    setRole('viewer');
    await loadProjectData(data.session_id);
  };

  const loadProjectData = async (sid: string) => {
    const { data: projData, error: projErr } = await supabase.rpc('get_collab_project_data', { p_session_id: sid });
    if (projErr || !projData?.success) {
      setError('Failed to load project data');
      setLoading(false);
      return;
    }
    setProject(projData.project);
    setTasks(projData.tasks || []);
    setMilestones(projData.milestones || []);
    setResources(projData.resources || []);
    setDiscussions(projData.discussions || []);
    setMeetings(projData.meetings || []);
    setMode('detail');
    setLoading(false);
  };

  const addCollabDiscussion = async () => {
    if (!discussionText.trim() || !project || !sessionId) return;
    // Use RPC or direct insert won't work for anon. For account-based collabs:
    if (user) {
      await supabase.from('discussions').insert({
        body_html: `<p>${discussionText}</p>`,
        author: user.email!,
        author_type: 'collaborator',
        project_id: project.id,
        user_id: user.id,
      });
      setDiscussionText('');
      await loadProjectData(sessionId);
    }
  };

  // Projects list for authenticated collaborator
  if (mode === 'projects' && !slug) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-4xl p-4 sm:p-6 space-y-6">
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">My Shared Projects</h1>
          <p className="text-sm text-muted-foreground">Projects you have been invited to collaborate on.</p>
          {collabProjects.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No shared projects found for your account.</CardContent></Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {collabProjects.map(p => (
                <Link key={p.id} to={`/collab/${p.slug}`}>
                  <Card className="transition-colors hover:bg-card/80 cursor-pointer">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: p.color }} />
                        <span className="text-sm font-medium text-foreground">{p.name}</span>
                        <Badge className={`text-[10px] capitalize ${statusColors[p.status] || ''}`}>{p.status}</Badge>
                      </div>
                      {p.description && <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-[10px] capitalize">{p.role}</Badge>
                        <span>{p.total_tasks - p.open_tasks}/{p.total_tasks} tasks done</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Login form
  if (mode === 'login') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Lock className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-xl">Project Access</CardTitle>
            <p className="text-sm text-muted-foreground">
              {authMethod === 'account'
                ? 'Sign in with your account to access shared projects'
                : 'Enter the shared project password'}
            </p>
          </CardHeader>
          <CardContent>
            {authMethod === 'account' ? (
              <div className="space-y-4">
                <Button className="w-full" asChild>
                  <Link to={`/auth?redirect=/collab/${slug}`}>Sign in with your account</Link>
                </Button>
                <div className="text-center text-xs text-muted-foreground">or</div>
                <Button variant="outline" className="w-full" onClick={() => setAuthMethod('password')}>
                  Use project password instead
                </Button>
              </div>
            ) : (
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="your@email.com" />
                </div>
                <div className="space-y-2">
                  <Label>Project Password</Label>
                  <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Verifying...' : 'Access Project'}
                </Button>
                <Button variant="ghost" className="w-full text-xs" onClick={() => setAuthMethod('account')}>
                  Use account login instead
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!project) return null;

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const canComment = ['commenter', 'editor', 'admin'].includes(role);

  const taskStatuses = ['todo', 'in_progress', 'blocked', 'done', 'dropped'];
  const statusLabels: Record<string, string> = { todo: 'To Do', in_progress: 'In Progress', blocked: 'Blocked', done: 'Done', dropped: 'Dropped' };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl p-4 sm:p-6 space-y-6">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            {user && <Button variant="ghost" size="sm" asChild><Link to="/collab">← All Projects</Link></Button>}
            <div className="h-4 w-1 rounded" style={{ backgroundColor: project.color }} />
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground">{project.name}</h1>
            <Badge className={`capitalize ${statusColors[project.status] || 'bg-muted text-muted-foreground'}`}>{project.status.replace('_', ' ')}</Badge>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>{doneTasks}/{totalTasks} tasks</span>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-24 sm:w-32 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} /></div>
              <span>{pct}%</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary" className="text-xs capitalize">🔑 {role} access</Badge>
            <Badge variant="secondary" className="text-xs">👤 {email || user?.email}</Badge>
          </div>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto gap-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tasks"><CheckSquare className="mr-1 h-3.5 w-3.5" />Tasks</TabsTrigger>
            <TabsTrigger value="milestones"><Flag className="mr-1 h-3.5 w-3.5" />Milestones</TabsTrigger>
            <TabsTrigger value="resources"><LinkIcon className="mr-1 h-3.5 w-3.5" />Resources</TabsTrigger>
            <TabsTrigger value="discussions"><MessageSquare className="mr-1 h-3.5 w-3.5" />Discussions</TabsTrigger>
            <TabsTrigger value="meetings"><Calendar className="mr-1 h-3.5 w-3.5" />Meetings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {project.description && <Card><CardContent className="p-5"><p className="text-sm text-foreground whitespace-pre-wrap">{project.description}</p></CardContent></Card>}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Card><CardContent className="p-4 text-center"><p className="text-2xl font-semibold">{doneTasks}</p><p className="text-xs text-muted-foreground">Completed</p></CardContent></Card>
              <Card><CardContent className="p-4 text-center"><p className="text-2xl font-semibold">{totalTasks - doneTasks}</p><p className="text-xs text-muted-foreground">Remaining</p></CardContent></Card>
              <Card><CardContent className="p-4 text-center"><p className="text-2xl font-semibold">{milestones.filter(m => !m.is_completed).length}</p><p className="text-xs text-muted-foreground">Milestones</p></CardContent></Card>
              <Card><CardContent className="p-4 text-center"><p className="text-2xl font-semibold">{resources.length}</p><p className="text-xs text-muted-foreground">Resources</p></CardContent></Card>
            </div>
            {project.status_note && <p className="text-sm text-primary italic">{project.status_note}</p>}
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            {taskStatuses.map(status => {
              const statusTasks = tasks.filter(t => t.status === status);
              if (statusTasks.length === 0) return null;
              const isCollapsible = status === 'done' || status === 'dropped';
              const content = (
                <div className="space-y-1">
                  {statusTasks.map(t => (
                    <div key={t.id} className="flex items-center gap-3 rounded-md border border-border px-3 py-2.5">
                      <span className={`flex-1 text-sm ${t.status === 'done' ? 'text-muted-foreground line-through' : t.status === 'dropped' ? 'text-muted-foreground line-through italic' : 'text-foreground'}`}>{t.title}</span>
                      <Badge className={`text-xs ${priorityColors[t.priority]}`}>{t.priority}</Badge>
                      {t.due_date && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />{format(new Date(t.due_date), 'MMM d')}
                          {t.due_time && <span>· {t.due_time}</span>}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              );
              if (isCollapsible) {
                return (
                  <details key={status}>
                    <summary className="mb-2 cursor-pointer text-xs font-medium uppercase text-muted-foreground">{statusLabels[status]} ({statusTasks.length})</summary>
                    {content}
                  </details>
                );
              }
              return (
                <div key={status}>
                  <h3 className="mb-2 text-xs font-medium uppercase text-muted-foreground">{statusLabels[status]} ({statusTasks.length})</h3>
                  {content}
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="milestones" className="space-y-2">
            {milestones.map(ms => (
              <div key={ms.id} className="flex items-center gap-3 rounded-md border border-border px-4 py-3">
                <Flag className={`h-4 w-4 ${ms.is_completed ? 'text-success' : 'text-primary'}`} />
                <span className={`flex-1 text-sm ${ms.is_completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{ms.title}</span>
                <span className="text-xs text-muted-foreground">{format(new Date(ms.date), 'MMM d, yyyy')}</span>
              </div>
            ))}
            {milestones.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No milestones</p>}
          </TabsContent>

          <TabsContent value="resources" className="space-y-2">
            {resources.map(r => (
              <Card key={r.id}>
                <CardContent className="flex items-center gap-4 p-4">
                  <Badge variant="outline" className="text-xs capitalize">{r.type}</Badge>
                  <span className="flex-1 text-sm text-foreground">{r.title}</span>
                  {r.url && <a href={r.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4 text-muted-foreground hover:text-primary" /></a>}
                </CardContent>
              </Card>
            ))}
            {resources.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No resources</p>}
          </TabsContent>

          <TabsContent value="discussions" className="space-y-3">
            {canComment && (
              <div className="flex gap-2">
                <Textarea value={discussionText} onChange={e => setDiscussionText(e.target.value)} placeholder="Add a comment..." rows={2} className="flex-1" />
                <Button onClick={addCollabDiscussion} disabled={!discussionText.trim()} className="shrink-0">Post</Button>
              </div>
            )}
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
            {discussions.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No discussions</p>}
          </TabsContent>

          <TabsContent value="meetings" className="space-y-3">
            {meetings.map(m => (
              <Card key={m.id}>
                <CardContent className="p-4 space-y-1">
                  <h4 className="text-sm font-medium text-foreground">{m.title}</h4>
                  <p className="text-xs text-muted-foreground">{format(new Date(m.scheduled_at), 'EEEE, MMM d · h:mm a')}</p>
                  {m.attendees && <p className="text-xs text-muted-foreground">With: {m.attendees}</p>}
                </CardContent>
              </Card>
            ))}
            {meetings.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No meetings</p>}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
