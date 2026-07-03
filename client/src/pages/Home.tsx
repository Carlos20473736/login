import { useAuth } from "@/_core/hooks/useAuth";
import { Header } from "@/components/Header";
import { Toast } from "@/components/Toast";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";

export default function Home() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [dontAskAgain, setDontAskAgain] = useState(false);
  const [skipConfirmation, setSkipConfirmation] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('skipDeleteConfirmation');
    if (stored === 'true') setSkipConfirmation(true);
  }, []);

  const utils = trpc.useUtils();
  const projectsQuery = trpc.projects.list.useQuery(undefined, { enabled: !!user });

  const createMutation = trpc.projects.create.useMutation({
    onSuccess: () => {
      utils.projects.list.invalidate();
      setNewName('');
      setNewDescription('');
      setShowForm(false);
      setToast({ message: 'Projeto criado com sucesso!', type: 'success' });
    },
    onError: () => {
      setToast({ message: 'Erro ao criar projeto', type: 'error' });
    },
  });

  const deleteMutation = trpc.projects.delete.useMutation({
    onSuccess: () => {
      utils.projects.list.invalidate();
      setToast({ message: 'Projeto excluído com sucesso!', type: 'success' });
    },
    onError: () => {
      setToast({ message: 'Erro ao excluir projeto', type: 'error' });
    },
  });

  // Redirect to login if not authenticated
  if (!loading && !user) {
    window.location.href = getLoginUrl();
    return null;
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
      </div>
    );
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    createMutation.mutate({ name: newName.trim(), description: newDescription.trim() || null });
  };

  const requestDelete = (id: number, name: string) => {
    if (skipConfirmation) {
      deleteMutation.mutate({ id });
    } else {
      setDeleteTarget({ id, name });
    }
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    if (dontAskAgain) {
      localStorage.setItem('skipDeleteConfirmation', 'true');
      setSkipConfirmation(true);
    }
    deleteMutation.mutate({ id: deleteTarget.id });
    setDeleteTarget(null);
    setDontAskAgain(false);
  };

  const cancelDelete = () => {
    setDeleteTarget(null);
    setDontAskAgain(false);
  };

  const projects = projectsQuery.data || [];

  return (
    <div style={{ minHeight: '100vh' }}>
      <Header />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1100, padding: '24px',
          }}
        >
          <div
            style={{
              width: '100%', maxWidth: '420px',
              background: 'var(--color-surface)', borderRadius: '16px',
              padding: '28px 32px', boxShadow: '0 24px 48px rgba(0, 0, 0, 0.2)',
              animation: 'fadeIn 0.2s ease',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 500, color: 'var(--color-text-primary)', margin: '0 0 16px' }}>
              Excluir projeto
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', margin: '0 0 20px', lineHeight: 1.5 }}>
              Tem certeza que deseja excluir o projeto <strong style={{ color: 'var(--color-text-primary)' }}>&ldquo;{deleteTarget.name}&rdquo;</strong>?
              Esta ação não pode ser desfeita e todas as tarefas associadas serão removidas.
            </p>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--color-text-secondary)', cursor: 'pointer', marginBottom: '24px', userSelect: 'none' }}>
              <input type="checkbox" checked={dontAskAgain} onChange={(e) => setDontAskAgain(e.target.checked)} style={{ width: '16px', height: '16px', borderRadius: '3px', cursor: 'pointer', accentColor: 'var(--color-primary)' }} />
              Não perguntar novamente
            </label>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={cancelDelete} className="btn-secondary">Cancelar</button>
              <button
                onClick={confirmDelete}
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

      {/* Create project modal */}
      {showForm && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '24px',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}
        >
          <div
            style={{
              width: '100%', maxWidth: '480px',
              background: 'var(--color-surface)', borderRadius: '16px',
              padding: '32px', boxShadow: '0 24px 48px rgba(0, 0, 0, 0.2)',
              animation: 'fadeIn 0.2s ease',
            }}
          >
            <h2 style={{ fontSize: '18px', fontWeight: 500, color: 'var(--color-text-primary)', margin: '0 0 24px' }}>
              Novo projeto
            </h2>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: '6px', letterSpacing: '0.4px' }}>
                  Nome do projeto
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="input-field"
                  placeholder="Ex: Website Redesign"
                  autoFocus
                />
              </div>
              <div style={{ marginBottom: '28px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: '6px', letterSpacing: '0.4px' }}>
                  Descrição (opcional)
                </label>
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="input-field"
                  placeholder="Uma breve descrição do projeto"
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" disabled={!newName.trim() || createMutation.isPending} className="btn-primary">
                  {createMutation.isPending ? (
                    <span style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.6s linear infinite', display: 'inline-block' }} />
                  ) : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main content */}
      <main style={{ maxWidth: '960px', margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 400, color: 'var(--color-text-primary)', margin: 0 }}>
            Meus Projetos
          </h1>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Novo projeto
          </button>
        </div>

        {projectsQuery.isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <div style={{ width: '32px', height: '32px', border: '3px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
          </div>
        ) : projects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 24px', background: 'var(--color-surface)', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 500, color: 'var(--color-text-primary)', margin: '0 0 8px' }}>
              Nenhum projeto ainda
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', margin: 0 }}>
              Crie seu primeiro projeto para começar a organizar suas tarefas.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {projects.map((project) => (
              <div
                key={project.id}
                className="card"
                style={{ padding: '24px 32px', cursor: 'pointer', position: 'relative', borderRadius: '12px' }}
                onClick={() => setLocation(`/projects/${project.id}`)}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-primary)', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {project.name}
                    </h3>
                    {project.description && (
                      <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '0 0 12px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {project.description}
                      </p>
                    )}
                    <p style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', margin: 0 }}>
                      {new Date(project.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); requestDelete(project.id, project.name); }}
                    style={{ width: '32px', height: '32px', borderRadius: '50%', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-tertiary)', transition: 'background 0.15s, color 0.15s', flexShrink: 0 }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-error-bg)'; e.currentTarget.style.color = 'var(--color-error)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-tertiary)'; }}
                    title="Excluir projeto"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
