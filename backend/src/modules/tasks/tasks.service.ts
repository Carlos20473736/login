import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task, TaskStatus } from './task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ProjectsService } from '../projects/projects.service';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
    private readonly projectsService: ProjectsService,
  ) {}

  async create(
    projectId: string,
    userId: string,
    dto: CreateTaskDto,
  ): Promise<Task> {
    // Verifica se o projeto pertence ao usuário
    await this.projectsService.findOneByUser(projectId, userId);

    const task = this.tasksRepository.create({
      ...dto,
      projectId,
    });
    return this.tasksRepository.save(task);
  }

  async findAllByProject(
    projectId: string,
    userId: string,
    status?: TaskStatus,
  ): Promise<Task[]> {
    // Verifica se o projeto pertence ao usuário
    await this.projectsService.findOneByUser(projectId, userId);

    const where: Record<string, any> = { projectId };
    if (status) {
      where.status = status;
    }

    return this.tasksRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(
    id: string,
    projectId: string,
    userId: string,
  ): Promise<Task> {
    // Verifica se o projeto pertence ao usuário
    await this.projectsService.findOneByUser(projectId, userId);

    const task = await this.tasksRepository.findOne({
      where: { id, projectId },
    });
    if (!task) {
      throw new NotFoundException('Tarefa não encontrada');
    }
    return task;
  }

  async update(
    id: string,
    projectId: string,
    userId: string,
    dto: UpdateTaskDto,
  ): Promise<Task> {
    const task = await this.findOne(id, projectId, userId);
    Object.assign(task, dto);
    return this.tasksRepository.save(task);
  }

  async remove(
    id: string,
    projectId: string,
    userId: string,
  ): Promise<void> {
    const task = await this.findOne(id, projectId, userId);
    await this.tasksRepository.remove(task);
  }
}
