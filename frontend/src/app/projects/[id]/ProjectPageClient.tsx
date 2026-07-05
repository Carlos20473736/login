'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components/ui/Header';
import { Toast } from '@/components/ui/Toast';
import { useProjects } from '@/features/projects';
import { useTasks } from '@/features/tasks';

type TaskStatus = 'pendente' | 'em_andamento' | 'concluida';

const STATUS_LABELS: Record<TaskStatus, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
};

export default function ProjectPageClient() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const { projects } = useProjects();
  const project = projects.find((p) => p.id === projectId);

  const [statusFilter, setStatusFilter] = useState<TaskStatus | ''>('');
  const { tasks, isLoading, create, update, remove } = useTasks(projectId, statusFilter || undefined);

  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<TaskStatus>('pendente');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [dontAskAgain, setDontAskAgain] = useState(false);

  // Check localStorage for skip confirmation
  const getSkipConfirm = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('skipDeleteTaskConfirm') === 'true';
    }
    return false;
  };

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
    setDueDate(task.dueDate ? task.dueDate.slice(0, 10) : '');
    setStatus(task.status);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title,
      description: description || undefined,
      dueDate: dueDate || undefined,
      status,
    };

    if (editingTask) {
      update.mutate(
        { id: editingTask.id, ...payload },
        {
          onSuccess: () => {
            resetForm();
            setToast({ message: 'Tarefa atualizada!', type: 'success' });
          },
          onError: (error: any) => {
            setToast({ message: error?.response?.data?.message || 'Erro ao atualizar', type: 'error' });
          },
        },
      );
    } else {
      create.mutate(payload, {
        onSuccess: () => {
          resetForm();
          setToast({ message: 'Tarefa criada!', type: 'success' });
        },
        onError: (error: any) => {
          setToast({ message: error?.response?.data?.message || 'Erro ao criar tarefa', type: 'error' });
        },
      });
    }
  };

  const handleDelete = (id: string, taskTitle: string) => {
    if (getSkipConfirm()) {
      executeDelete(id);
    } else {
      setDeleteTarget({ id, title: taskTitle });
    }
  };

  const executeDelete = (id: string) => {
    remove.mutate(id, {
      onSuccess: () => setToast({ message: 'Tarefa excluída!', type: 'success' }),
      onError: (error: any) => {
        setToast({ message: error?.response?.data?.message || 'Erro ao excluir', type: 'error' });
      },
    });
  };

  const confirmDeleteTask = () => {
    if (deleteTarget) {
      if (dontAskAgain) {
        localStorage.setItem('skipDeleteTaskConfirm', 'true');
      }
      executeDelete(deleteTarget.id);
      setDeleteTarget(null);
      setDontAskAgain(false);
    }
  };

  const cancelDeleteTask = () => {
    setDeleteTarget(null);
    setDontAskAgain(false);
  };

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    update.mutate(
      { id: taskId, status: newStatus },
      {
        onSuccess: () => setToast({ message: `Status atualizado para "${STATUS_LABELS[newStatus]}"`, type: 'success' }),
        onError: (error: any) => {
          setToast({ message: error?.response?.data?.message || 'Erro ao atualizar status', type: 'error' });
        },
      },
    );
  };

  const filters: { label: string; value: TaskStatus | '' }[] = [
    { label: 'Todas', value: '' },
    { label: 'Pendente', value: 'pendente' },
    { label: 'Em andamento', value: 'em_andamento' },
    { label: 'Concluída', value: 'concluida' },
  ];

  return (
    <div style={{ minHeight: '100vh' }}>
      <Header />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px' }}>
        {/* Breadcrumb + Title */}
        <div style={{ marginBottom: '24px' }}>
          <button
            onClick={() => router.push('/dashboard')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              color: 'var(--color-primary)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              marginBottom: '12px',
              fontWeight: 500,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Meus Projetos
          </button>
          <h1 style={{ fontSize: '22px', fontWeight: 400, color: 'var(--color-text-primary)', margin: '0 0 4px' }}>
            {project?.name || 'Projeto'}
          </h1>
          {project?.description && (
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', margin: 0 }}>
              {project.description}
            </p>
          )}
        </div>

        {/* Toolbar: filters + add button */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          {/* Filter chips */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {filters.map((f) => {
              const isActive = statusFilter === f.value;
              const chipColors: Record<string, { bg: string; border: string; color: string; activeBg: string; activeBorder: string; activeColor: string }> = {
                '': { bg: 'var(--color-surface)', border: 'var(--color-border)', color: 'var(--color-text-secondary)', activeBg: 'var(--color-primary-light)', activeBorder: 'var(--color-primary)', activeColor: 'var(--color-primary)' },
                'pendente': { bg: 'var(--color-surface)', border: 'var(--color-border)', color: 'var(--color-text-secondary)', activeBg: 'var(--color-warning-bg)', activeBorder: 'var(--color-warning)', activeColor: 'var(--color-warning)' },
                'em_andamento': { bg: 'var(--color-surface)', border: 'var(--color-border)', color: 'var(--color-text-secondary)', activeBg: 'var(--color-info-bg)', activeBorder: 'var(--color-info)', activeColor: 'var(--color-info)' },
                'concluida': { bg: 'var(--color-surface)', border: 'var(--color-border)', color: 'var(--color-text-secondary)', activeBg: 'var(--color-success-bg)', activeBorder: 'var(--color-success)', activeColor: 'var(--color-success)' },
              };
              const c = chipColors[f.value] || chipColors[''];
              return (
                <button
                  key={f.value}
                  onClick={() => setStatusFilter(f.value)}
                  style={{
                    height: '34px',
                    padding: '0 18px',
                    fontSize: '13px',
                    fontWeight: 600,
                    borderRadius: '9999px',
                    border: `1.5px solid ${isActive ? c.activeBorder : c.border}`,
                    background: isActive ? c.activeBg : c.bg,
                    color: isActive ? c.activeColor : c.color,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: isActive ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => {
              resetForm();
              setShowForm(!showForm);
            }}
            className="btn-primary"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nova tarefa
          </button>
        </div>

        {/* Create/Edit form */}
        {showForm && (
          <div className="card-elevated" style={{ padding: '24px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 500, color: 'var(--color-text-primary)', margin: '0 0 20px' }}>
              {editingTask ? 'Editar tarefa' : 'Nova tarefa'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                    Título
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="input-field"
                    placeholder="Ex: Implementar login"
                    autoFocus
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                    Data de vencimento
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                  Descrição (opcional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input-field"
                  style={{ height: '72px', padding: '12px 16px', resize: 'vertical' }}
                  placeholder="Detalhes da tarefa"
                />
              </div>
              {editingTask && (
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as TaskStatus)}
                    className="input-field"
                    style={{ cursor: 'pointer' }}
                  >
                    <option value="pendente">Pendente</option>
                    <option value="em_andamento">Em andamento</option>
                    <option value="concluida">Concluída</option>
                  </select>
                </div>
              )}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={resetForm} className="btn-secondary">
                  Cancelar
                </button>
                <button type="submit" disabled={create.isPending || update.isPending} className="btn-primary">
                  {create.isPending || update.isPending
                    ? 'Salvando...'
                    : editingTask
                    ? 'Salvar alterações'
                    : 'Criar tarefa'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tasks list */}
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                border: '3px solid var(--color-border)',
                borderTopColor: 'var(--color-primary)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
          </div>
        ) : tasks.length === 0 && showForm ? (
          null
        ) : tasks.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '40px 24px',
              background: 'var(--color-surface)',
              borderRadius: '12px',
              border: '1px solid var(--color-border)',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', margin: '0 auto 16px' }}>
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
            </svg>
            <h2 style={{ fontSize: '16px', fontWeight: 500, color: 'var(--color-text-primary)', margin: 0 }}>
              {statusFilter ? 'Nenhuma tarefa com esse status' : 'Nenhuma tarefa ainda'}
            </h2>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {tasks.map((task) => (
              <div
                key={task.id}
                className="card"
                style={{
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                }}
              >
                {/* Status dropdown */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <select
                    value={task.status}
                    onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                    style={{
                      appearance: 'none',
                      WebkitAppearance: 'none',
                      padding: '6px 28px 6px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      borderRadius: '16px',
                      border: `1.5px solid ${
                        task.status === 'concluida'
                          ? 'var(--color-success)'
                          : task.status === 'em_andamento'
                          ? 'var(--color-info)'
                          : 'var(--color-warning)'
                      }`,
                      background: task.status === 'concluida'
                        ? 'var(--color-success-bg)'
                        : task.status === 'em_andamento'
                        ? 'var(--color-info-bg)'
                        : 'var(--color-warning-bg)',
                      color: task.status === 'concluida'
                        ? 'var(--color-success)'
                        : task.status === 'em_andamento'
                        ? 'var(--color-info)'
                        : 'var(--color-warning)',
                      cursor: 'pointer',
                      outline: 'none',
                      minWidth: '125px',
                      transition: 'all 0.2s ease',
                    }}
                    title={`Status: ${STATUS_LABELS[task.status as TaskStatus]}`}
                  >
                    <option value="pendente">Pendente</option>
                    <option value="em_andamento">Em andamento</option>
                    <option value="concluida">Concluída</option>
                  </select>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      pointerEvents: 'none',
                      color: task.status === 'concluida'
                        ? 'var(--color-success)'
                        : task.status === 'em_andamento'
                        ? 'var(--color-info)'
                        : 'var(--color-warning)',
                    }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>

                {/* Task content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2px' }}>
                    <span
                      style={{
                        fontSize: '14px',
                        fontWeight: 500,
                        color: task.status === 'concluida' ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)',
                        textDecoration: task.status === 'concluida' ? 'line-through' : 'none',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {task.title}
                    </span>
                  </div>
                  {(task.description || task.dueDate) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                      {task.description && (
                        <span
                          style={{
                            fontSize: '12px',
                            color: 'var(--color-text-secondary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '300px',
                          }}
                        >
                          {task.description}
                        </span>
                      )}
                      {task.dueDate && (
                        <span
                          style={{
                            fontSize: '12px',
                            color: new Date(task.dueDate) < new Date() && task.status !== 'concluida'
                              ? 'var(--color-error)'
                              : 'var(--color-text-tertiary)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            flexShrink: 0,
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                          </svg>
                          {new Date(task.dueDate).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                  <button
                    onClick={() => openEdit(task)}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--color-text-tertiary)',
                      transition: 'background 0.15s, color 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--color-primary-light)';
                      e.currentTarget.style.color = 'var(--color-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--color-text-tertiary)';
                    }}
                    title="Editar"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(task.id, task.title)}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--color-text-tertiary)',
                      transition: 'background 0.15s, color 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--color-error-bg)';
                      e.currentTarget.style.color = 'var(--color-error)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--color-text-tertiary)';
                    }}
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

      {/* Modal de confirmação de exclusão de tarefa */}
      {deleteTarget && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '24px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '420px',
              background: 'var(--color-surface)',
              borderRadius: '16px',
              padding: '28px 32px',
              boxShadow: '0 24px 48px rgba(0, 0, 0, 0.2)',
              animation: 'fadeIn 0.2s ease',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 500, color: 'var(--color-text-primary)', margin: '0 0 16px' }}>
              Excluir tarefa
            </h3>

            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', margin: '0 0 20px', lineHeight: 1.5 }}>
              Tem certeza que deseja excluir a tarefa <strong style={{ color: 'var(--color-text-primary)' }}>&ldquo;{deleteTarget.title}&rdquo;</strong>?
              Esta ação não pode ser desfeita.
            </p>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '13px',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
                marginBottom: '24px',
                userSelect: 'none',
              }}
            >
              <input
                type="checkbox"
                checked={dontAskAgain}
                onChange={(e) => setDontAskAgain(e.target.checked)}
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  accentColor: 'var(--color-primary)',
                }}
              />
              Não perguntar novamente
            </label>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={cancelDeleteTask} className="btn-secondary">
                Cancelar
              </button>
              <button
                onClick={confirmDeleteTask}
                className="btn-secondary"
                style={{
                  color: 'var(--color-error)',
                  borderColor: 'var(--color-error)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-error-bg)'; e.currentTarget.style.borderColor = 'var(--color-error-bg)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--color-error)'; }}
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
