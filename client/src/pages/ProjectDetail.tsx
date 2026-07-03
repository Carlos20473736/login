import { useAuth } from "@/_core/hooks/useAuth";
import { Header } from "@/components/Header";
import { Toast } from "@/components/Toast";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";

type TaskStatus = 'pendente' | 'em_andamento' | 'concluida';

const STATUS_LABELS: Record<TaskStatus, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
};

export default function ProjectDetail() {
  const { user, loading } = useAuth();
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const projectId = parseInt(params.id || '0', 10);

  const [statusFilter, setStatusFilter] = useState<TaskStatus | ''>('');
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<TaskStatus>('pendente');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; title: string } | null>(null);
  const [dontAskAgain, setDontAskAgain] = useState(false);

  const utils = trpc.useUtils();

  const projectQuery = trpc.projects.getById.useQuery(
    { id: projectId },
    { enabled: !!user && projectId > 0 }
  );

  const tasksQuery = trpc.tasks.list.useQuery(
    { projectId, status: statusFilter || undefined },
    { enabled: !!user && projectId > 0 }
  );

  const createMutation = trpc.tasks.create.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      resetForm();
      setToast({ message: 'Tarefa criada!', type: 'success' });
    },
    onError: () => setToast({ message: 'Erro ao criar tarefa', type: 'error' }),
  });

  const updateMutation = trpc.tasks.update.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      resetForm();
      setToast({ message: 'Tarefa atualizada!', type: 'success' });
    },
    onError: () => setToast({ message: 'Erro ao atualizar', type: 'error' }),
  });

  const updateStatusMutation = trpc.tasks.updateStatus.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
    },
    onError: () => setToast({ message: 'Erro ao atualizar status', type: 'error' }),
  });

  const deleteMutation = trpc.tasks.delete.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      setToast({ message: 'Tarefa excluída!', type: 'success' });
    },
    onError: () => setToast({ message: 'Erro ao excluir', type: 'error' }),
  });

  useEffect(() => {
    if (!loading && !user) {
      setLocation('/auth/login');
    }
  }, [loading, user, setLocation]);

  if (!loading && !user) {
    return null;
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
      </div>
    );
  }

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDueDate('');
    setStatus(statusFilter || 'pendente');
    setEditingTask(null);
    setShowForm(false);
  };

  const openEdit = (task: any) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description || '');
    setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : '');
    setStatus(task.status);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      dueDate: dueDate ? new Date(dueDate).getTime() : null,
      status,
    };

    if (editingTask) {
      updateMutation.mutate({ id: editingTask.id, ...payload });
    } else {
      createMutation.mutate({ ...payload, projectId });
    }
  };

  const handleStatusChange = (taskId: number, newStatus: TaskStatus) => {
    updateStatusMutation.mutate({ id: taskId, status: newStatus });
  };

  const getSkipConfirm = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('skipDeleteTaskConfirm') === 'true';
    }
    return false;
  };

  const handleDelete = (id: number, taskTitle: string) => {
    if (getSkipConfirm()) {
      deleteMutation.mutate({ id });
    } else {
      setDeleteTarget({ id, title: taskTitle });
    }
  };

  const confirmDeleteTask = () => {
    if (deleteTarget) {
      if (dontAskAgain) {
        localStorage.setItem('skipDeleteTaskConfirm', 'true');
      }
      deleteMutation.mutate({ id: deleteTarget.id });
      setDeleteTarget(null);
      setDontAskAgain(false);
    }
  };

  const cancelDeleteTask = () => {
    setDeleteTarget(null);
    setDontAskAgain(false);
  };

  const project = projectQuery.data;
  const tasks = tasksQuery.data || [];

  const getDueDateColor = (dueDateMs: number | null) => {
    if (!dueDateMs) return {};
    const now = Date.now();
    const diff = dueDateMs - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days < 0) return { color: 'var(--color-error)', fontWeight: 500 };
    if (days <= 3) return { color: '#e37400', fontWeight: 500 };
    return { color: 'var(--color-text-tertiary)' };
  };

  const formatDueDate = (dueDateMs: number | null) => {
    if (!dueDateMs) return '';
    return new Date(dueDateMs).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      <Header />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Task form modal */}
      {showForm && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }}
          onClick={(e) => { if (e.target === e.currentTarget) resetForm(); }}
        >
          <div style={{ width: '100%', maxWidth: '480px', background: 'var(--color-surface)', borderRadius: '16px', padding: '32px', boxShadow: '0 24px 48px rgba(0, 0, 0, 0.2)', animation: 'fadeIn 0.2s ease' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 500, color: 'var(--color-text-primary)', margin: '0 0 24px' }}>
              {editingTask ? 'Editar tarefa' : 'Nova tarefa'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: '6px', letterSpacing: '0.4px' }}>Título</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="input-field" placeholder="Nome da tarefa" autoFocus />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: '6px', letterSpacing: '0.4px' }}>Descrição (opcional)</label>
                <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="input-field" placeholder="Detalhes da tarefa" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '28px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: '6px', letterSpacing: '0.4px' }}>Status</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)} className="input-field" style={{ cursor: 'pointer' }}>
                    <option value="pendente">Pendente</option>
                    <option value="em_andamento">Em andamento</option>
                    <option value="concluida">Concluída</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: '6px', letterSpacing: '0.4px' }}>Prazo</label>
                  <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input-field" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={resetForm} className="btn-secondary">Cancelar</button>
                <button type="submit" disabled={!title.trim() || createMutation.isPending || updateMutation.isPending} className="btn-primary">
                  {(createMutation.isPending || updateMutation.isPending) ? (
                    <span style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.6s linear infinite', display: 'inline-block' }} />
                  ) : editingTask ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete task confirmation modal */}
      {deleteTarget && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '24px' }}>
          <div style={{ width: '100%', maxWidth: '420px', background: 'var(--color-surface)', borderRadius: '16px', padding: '28px 32px', boxShadow: '0 24px 48px rgba(0, 0, 0, 0.2)', animation: 'fadeIn 0.2s ease' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 500, color: 'var(--color-text-primary)', margin: '0 0 16px' }}>Excluir tarefa</h3>
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', margin: '0 0 20px', lineHeight: 1.5 }}>
              Tem certeza que deseja excluir a tarefa <strong style={{ color: 'var(--color-text-primary)' }}>&ldquo;{deleteTarget.title}&rdquo;</strong>? Esta ação não pode ser desfeita.
            </p>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--color-text-secondary)', cursor: 'pointer', marginBottom: '24px', userSelect: 'none' }}>
              <input type="checkbox" checked={dontAskAgain} onChange={(e) => setDontAskAgain(e.target.checked)} style={{ width: '16px', height: '16px', borderRadius: '3px', cursor: 'pointer', accentColor: 'var(--color-primary)' }} />
              Não perguntar novamente
            </label>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={cancelDeleteTask} className="btn-secondary">Cancelar</button>
              <button
                onClick={confirmDeleteTask}
                className="btn-secondary"
                style={{ color: '#d93025', borderColor: '#d93025' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#fce8e6'; e.currentTarget.style.borderColor = '#fce8e6'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#d93025'; }}
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main style={{ maxWidth: '960px', margin: '0 auto', padding: '32px 24px' }}>
        {/* Back + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
          <button
            onClick={() => setLocation('/')}
            style={{ width: '36px', height: '36px', borderRadius: '50%', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9aa0a6', transition: 'background 0.15s' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-primary-light)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '22px', fontWeight: 400, color: '#e8eaed', margin: 0 }}>
              {project?.name || 'Carregando...'}
            </h1>
            {project?.description && (
              <p style={{ fontSize: '13px', color: '#9aa0a6', margin: '4px 0 0' }}>{project.description}</p>
            )}
          </div>
          <button onClick={() => { setEditingTask(null); setTitle(''); setDescription(''); setDueDate(''); setStatus(statusFilter || 'pendente'); setShowForm(true); }} className="btn-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nova tarefa
          </button>
        </div>

        {/* Status filter chips */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
          {(['', 'pendente', 'em_andamento', 'concluida'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s as TaskStatus | '')}
              className="chip"
              style={{
                cursor: 'pointer',
                border: statusFilter === s ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                background: statusFilter === s ? 'var(--color-primary-light)' : 'var(--color-surface)',
                color: statusFilter === s ? 'var(--color-primary)' : '#9aa0a6',
                fontWeight: statusFilter === s ? 500 : 400,
              }}
            >
              {s === '' ? 'Todas' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        {/* Tasks list */}
        {tasksQuery.isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <div style={{ width: '32px', height: '32px', border: '3px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
          </div>
        ) : tasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 24px', background: 'var(--color-surface)', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 500, color: 'var(--color-text-primary)', margin: '0 0 8px' }}>
              {statusFilter ? 'Nenhuma tarefa com este filtro' : 'Nenhuma tarefa ainda'}
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', margin: 0 }}>
              {statusFilter ? 'Tente outro filtro ou crie uma nova tarefa.' : 'Adicione sua primeira tarefa a este projeto.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '8px' }}>
            {tasks.map((task) => (
              <div key={task.id} className="card" style={{ padding: '16px 24px', borderRadius: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  {/* Status chip */}
                  <select
                    value={task.status}
                    onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                    className={`chip chip-${task.status}`}
                    style={{ cursor: 'pointer', border: 'none', appearance: 'none', paddingRight: '12px', fontSize: '11px' }}
                  >
                    <option value="pendente">Pendente</option>
                    <option value="em_andamento">Em andamento</option>
                    <option value="concluida">Concluída</option>
                  </select>

                  {/* Task info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 500, color: task.status === 'concluida' ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)', margin: 0, textDecoration: task.status === 'concluida' ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {task.title}
                    </h4>
                    {task.description && (
                      <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.description}</p>
                    )}
                  </div>

                  {/* Due date */}
                  {task.dueDate && (
                    <span style={{ fontSize: '12px', whiteSpace: 'nowrap', ...getDueDateColor(task.dueDate) }}>
                      {formatDueDate(task.dueDate)}
                    </span>
                  )}

                  {/* Actions */}
                  <button
                    onClick={() => openEdit(task)}
                    style={{ width: '32px', height: '32px', borderRadius: '50%', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-tertiary)', transition: 'background 0.15s, color 0.15s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-primary-light)'; e.currentTarget.style.color = 'var(--color-primary)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-tertiary)'; }}
                    title="Editar"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(task.id, task.title)}
                    style={{ width: '32px', height: '32px', borderRadius: '50%', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-tertiary)', transition: 'background 0.15s, color 0.15s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-error-bg)'; e.currentTarget.style.color = 'var(--color-error)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-tertiary)'; }}
                    title="Excluir"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
