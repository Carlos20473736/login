'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/ui/Header';
import { Toast } from '@/components/ui/Toast';
import { useProjects } from '@/features/projects';

export default function DashboardPage() {
  const router = useRouter();
  const { projects, isLoading, create, remove } = useProjects();
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Delete confirmation modal state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [dontAskAgain, setDontAskAgain] = useState(false);
  const [skipConfirmation, setSkipConfirmation] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('skipDeleteConfirmation');
    if (stored === 'true') setSkipConfirmation(true);
  }, []);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    create.mutate(
      { name: newName, description: newDescription || undefined },
      {
        onSuccess: () => {
          setNewName('');
          setNewDescription('');
          setShowForm(false);
          setToast({ message: 'Projeto criado com sucesso!', type: 'success' });
        },
        onError: (error: unknown) => {
          const err = error as { response?: { data?: { message?: string } } };
          const msg = err?.response?.data?.message || 'Erro ao criar projeto';
          setToast({ message: msg, type: 'error' });
        },
      },
    );
  };

  const requestDelete = (id: string, name: string) => {
    if (skipConfirmation) {
      executeDelete(id);
    } else {
      setDeleteTarget({ id, name });
    }
  };

  const executeDelete = (id: string) => {
    remove.mutate(id, {
      onSuccess: () => {
        setToast({ message: 'Projeto excluído com sucesso!', type: 'success' });
      },
      onError: (error: unknown) => {
        const err = error as { response?: { data?: { message?: string } } };
        const msg = err?.response?.data?.message || 'Erro ao excluir projeto';
        setToast({ message: msg, type: 'error' });
      },
    });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    if (dontAskAgain) {
      localStorage.setItem('skipDeleteConfirmation', 'true');
      setSkipConfirmation(true);
    }
    executeDelete(deleteTarget.id);
    setDeleteTarget(null);
    setDontAskAgain(false);
  };

  const cancelDelete = () => {
    setDeleteTarget(null);
    setDontAskAgain(false);
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      <Header />

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* Modal de confirmação de exclusão */}
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
            {/* Title */}
            <h3 style={{ fontSize: '16px', fontWeight: 500, color: 'var(--color-text-primary)', margin: '0 0 16px' }}>
              Excluir projeto
            </h3>

            {/* Message */}
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', margin: '0 0 20px', lineHeight: 1.5 }}>
              Tem certeza que deseja excluir o projeto <strong style={{ color: 'var(--color-text-primary)' }}>&ldquo;{deleteTarget.name}&rdquo;</strong>? 
              Esta ação não pode ser desfeita e todas as tarefas associadas serão removidas.
            </p>

            {/* Checkbox */}
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

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={cancelDelete}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
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

      {/* Modal de criação de projeto - centralizado */}
      {showForm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '24px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowForm(false);
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '520px',
              background: 'var(--color-surface)',
              borderRadius: '16px',
              padding: '32px',
              boxShadow: '0 24px 48px rgba(0, 0, 0, 0.2)',
              animation: 'fadeIn 0.2s ease',
            }}
          >
            <h2 style={{ fontSize: '18px', fontWeight: 500, color: 'var(--color-text-primary)', margin: '0 0 24px' }}>
              Criar novo projeto
            </h2>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                  Nome do projeto
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="input-field"
                  placeholder="Ex: Redesign do App"
                  autoFocus
                />
              </div>
              <div style={{ marginBottom: '28px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                  Descrição (opcional)
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="input-field"
                  style={{ height: '80px', padding: '12px 16px', resize: 'vertical' }}
                  placeholder="Breve descrição do projeto"
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                  Cancelar
                </button>
                <button type="submit" disabled={create.isPending} className="btn-primary">
                  {create.isPending ? 'Criando...' : 'Criar projeto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <main style={{ maxWidth: '960px', margin: '0 auto', padding: '48px 32px' }}>
        {/* Page header card */}
        {/* Info header */}
        <div
          style={{
            background: 'var(--color-surface)',
            borderRadius: '16px',
            border: '1px solid var(--color-border)',
            padding: '28px 36px',
            marginBottom: '20px',
          }}
        >
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0, letterSpacing: '-0.5px' }}>
            Meus Projetos
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', margin: '6px 0 0' }}>
            {projects.length} {projects.length === 1 ? 'projeto' : 'projetos'}
          </p>
        </div>

        {/* Action button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary"
            style={{ height: '40px', padding: '0 20px' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Novo projeto
          </button>
        </div>

        {/* Content */}
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
        ) : projects.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '40px 24px',
              background: 'var(--color-surface)',
              borderRadius: '12px',
              border: '1px solid var(--color-border)',
            }}
          >
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
                onClick={() => router.push(`/projects/${project.id}`)}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3
                      style={{
                        fontSize: '14px',
                        fontWeight: 500,
                        color: 'var(--color-text-primary)',
                        margin: '0 0 4px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {project.name}
                    </h3>
                    {project.description && (
                      <p
                        style={{
                          fontSize: '13px',
                          color: 'var(--color-text-secondary)',
                          margin: '0 0 12px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {project.description}
                      </p>
                    )}
                    <p style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', margin: 0 }}>
                      {new Date(project.createdAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      requestDelete(project.id, project.name);
                    }}
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
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--color-error-bg)';
                      e.currentTarget.style.color = 'var(--color-error)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--color-text-tertiary)';
                    }}
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

      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
