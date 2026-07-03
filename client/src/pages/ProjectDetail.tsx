import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  Plus,
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
  Clock,
  CheckCircle2,
  Circle,
  CalendarDays,
  ClipboardList,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";

type TaskStatus = "pendente" | "em_andamento" | "concluida";

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; icon: typeof Circle; bgColor: string }> = {
  pendente: { label: "Pendente", color: "text-amber-600", icon: Clock, bgColor: "bg-amber-500/10" },
  em_andamento: { label: "Em Andamento", color: "text-blue-600", icon: Circle, bgColor: "bg-blue-500/10" },
  concluida: { label: "Concluída", color: "text-emerald-600", icon: CheckCircle2, bgColor: "bg-emerald-500/10" },
};

function getDueDateInfo(dueDate: number | null) {
  if (!dueDate) return null;
  const now = Date.now();
  const diff = dueDate - now;
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (days < 0) return { label: `Vencida há ${Math.abs(days)}d`, variant: "destructive" as const, urgent: true };
  if (days === 0) return { label: "Vence hoje", variant: "destructive" as const, urgent: true };
  if (days <= 3) return { label: `Vence em ${days}d`, variant: "warning" as const, urgent: true };
  return { label: new Date(dueDate).toLocaleDateString("pt-BR"), variant: "secondary" as const, urgent: false };
}

export default function ProjectDetail() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const projectId = parseInt(params.id || "0", 10);

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTask, setEditTask] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("pendente");
  const [dueDate, setDueDate] = useState("");

  const utils = trpc.useUtils();

  const projectQuery = trpc.projects.getById.useQuery(
    { id: projectId },
    { enabled: !!user && projectId > 0 }
  );

  const tasksQuery = trpc.tasks.list.useQuery(
    { projectId, status: statusFilter === "all" ? undefined : statusFilter as TaskStatus },
    { enabled: !!user && projectId > 0 }
  );

  const createMutation = trpc.tasks.create.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      utils.projects.stats.invalidate();
      setCreateOpen(false);
      resetForm();
      toast.success("Tarefa criada com sucesso");
    },
    onError: () => toast.error("Erro ao criar tarefa"),
  });

  const updateMutation = trpc.tasks.update.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      setEditOpen(false);
      setEditTask(null);
      toast.success("Tarefa atualizada");
    },
    onError: () => toast.error("Erro ao atualizar tarefa"),
  });

  const updateStatusMutation = trpc.tasks.updateStatus.useMutation({
    onMutate: async (variables) => {
      await utils.tasks.list.cancel();
      const previousData = utils.tasks.list.getData({ projectId, status: statusFilter === "all" ? undefined : statusFilter as TaskStatus });
      utils.tasks.list.setData(
        { projectId, status: statusFilter === "all" ? undefined : statusFilter as TaskStatus },
        (old) => old?.map((t) => t.id === variables.id ? { ...t, status: variables.status } : t)
      );
      return { previousData };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        utils.tasks.list.setData(
          { projectId, status: statusFilter === "all" ? undefined : statusFilter as TaskStatus },
          context.previousData
        );
      }
      toast.error("Erro ao atualizar status");
    },
    onSettled: () => {
      utils.tasks.list.invalidate();
      utils.projects.stats.invalidate();
    },
  });

  const deleteMutation = trpc.tasks.delete.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      utils.projects.stats.invalidate();
      toast.success("Tarefa excluída");
    },
    onError: () => toast.error("Erro ao excluir tarefa"),
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStatus("pendente");
    setDueDate("");
  };

  const handleCreate = () => {
    if (!title.trim()) return;
    createMutation.mutate({
      title: title.trim(),
      description: description.trim() || null,
      status,
      dueDate: dueDate ? new Date(dueDate).getTime() : null,
      projectId,
    });
  };

  const handleUpdate = () => {
    if (!editTask || !title.trim()) return;
    updateMutation.mutate({
      id: editTask.id,
      title: title.trim(),
      description: description.trim() || null,
      status,
      dueDate: dueDate ? new Date(dueDate).getTime() : null,
    });
  };

  const openEdit = (task: any) => {
    setEditTask(task);
    setTitle(task.title);
    setDescription(task.description || "");
    setStatus(task.status);
    setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "");
    setEditOpen(true);
  };

  const taskCounts = useMemo(() => {
    const tasks = tasksQuery.data || [];
    return {
      total: tasks.length,
    };
  }, [tasksQuery.data]);

  const project = projectQuery.data;

  if (projectQuery.isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!project) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <h2 className="text-lg font-medium mb-2">Projeto não encontrado</h2>
          <p className="text-sm text-muted-foreground mb-4">Este projeto não existe ou você não tem acesso.</p>
          <Button variant="outline" onClick={() => setLocation("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/")} className="mt-0.5 shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
              {project.description && (
                <p className="text-muted-foreground mt-1">{project.description}</p>
              )}
            </div>
          </div>
          <Button onClick={() => { resetForm(); setCreateOpen(true); }} className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" />
            Nova Tarefa
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { value: "all", label: "Todas" },
            { value: "pendente", label: "Pendentes" },
            { value: "em_andamento", label: "Em Andamento" },
            { value: "concluida", label: "Concluídas" },
          ].map((filter) => (
            <Button
              key={filter.value}
              variant={statusFilter === filter.value ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(filter.value)}
              className="text-xs"
            >
              {filter.label}
            </Button>
          ))}
        </div>

        {/* Tasks List */}
        {tasksQuery.isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : tasksQuery.data?.length === 0 ? (
          <Card className="border-dashed border-2 shadow-none">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4">
                <ClipboardList className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-1">Nenhuma tarefa</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                {statusFilter !== "all"
                  ? "Nenhuma tarefa encontrada com este filtro."
                  : "Adicione sua primeira tarefa a este projeto."}
              </p>
              {statusFilter === "all" && (
                <Button onClick={() => { resetForm(); setCreateOpen(true); }} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Criar Tarefa
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {tasksQuery.data?.map((task) => {
              const statusConfig = STATUS_CONFIG[task.status as TaskStatus];
              const dueDateInfo = getDueDateInfo(task.dueDate);
              const StatusIcon = statusConfig.icon;

              return (
                <Card key={task.id} className="border-0 shadow-sm hover:shadow-md transition-all duration-200 group">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Status Selector */}
                      <Select
                        value={task.status}
                        onValueChange={(value) => updateStatusMutation.mutate({ id: task.id, status: value as TaskStatus })}
                      >
                        <SelectTrigger className="w-auto border-0 shadow-none p-0 h-auto focus:ring-0">
                          <div className={`h-8 w-8 rounded-full ${statusConfig.bgColor} flex items-center justify-center transition-colors`}>
                            <StatusIcon className={`h-4 w-4 ${statusConfig.color}`} />
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pendente">
                            <div className="flex items-center gap-2">
                              <Clock className="h-3.5 w-3.5 text-amber-600" />
                              Pendente
                            </div>
                          </SelectItem>
                          <SelectItem value="em_andamento">
                            <div className="flex items-center gap-2">
                              <Circle className="h-3.5 w-3.5 text-blue-600" />
                              Em Andamento
                            </div>
                          </SelectItem>
                          <SelectItem value="concluida">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              Concluída
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Task Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className={`font-medium text-sm truncate ${task.status === "concluida" ? "line-through text-muted-foreground" : ""}`}>
                            {task.title}
                          </h4>
                        </div>
                        {task.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{task.description}</p>
                        )}
                      </div>

                      {/* Due Date Badge */}
                      {dueDateInfo && (
                        <Badge
                          variant={dueDateInfo.variant === "warning" ? "secondary" : dueDateInfo.variant}
                          className={`text-xs shrink-0 ${
                            dueDateInfo.urgent
                              ? dueDateInfo.variant === "destructive"
                                ? "bg-red-500/10 text-red-600 border-red-200 hover:bg-red-500/10"
                                : "bg-amber-500/10 text-amber-600 border-amber-200 hover:bg-amber-500/10"
                              : ""
                          }`}
                        >
                          <CalendarDays className="h-3 w-3 mr-1" />
                          {dueDateInfo.label}
                        </Badge>
                      )}

                      {/* Status Badge */}
                      <Badge variant="secondary" className={`text-xs shrink-0 ${statusConfig.bgColor} ${statusConfig.color} border-0`}>
                        {statusConfig.label}
                      </Badge>

                      {/* Actions */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="h-8 w-8 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 hover:bg-accent transition-all shrink-0">
                            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(task)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => deleteMutation.mutate({ id: task.id })}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Task Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Tarefa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Título</label>
              <Input
                placeholder="Título da tarefa"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Descrição</label>
              <Textarea
                placeholder="Descrição opcional"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                    <SelectItem value="concluida">Concluída</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Prazo</label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!title.trim() || createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Tarefa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Título</label>
              <Input
                placeholder="Título da tarefa"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleUpdate()}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Descrição</label>
              <Textarea
                placeholder="Descrição opcional"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                    <SelectItem value="concluida">Concluída</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Prazo</label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdate} disabled={!title.trim() || updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
