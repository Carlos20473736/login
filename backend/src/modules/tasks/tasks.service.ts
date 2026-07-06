import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { Task, TaskStatus } from './task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ProjectsService } from '../projects/projects.service';

export interface PaginatedResult<T> {
  items: T[];
  meta: {
    totalItems: number;
    itemsPerPage: number;
    currentPage: number;
    totalPages: number;
  };
}

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
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedResult<Task>> {
    // Verifica se o projeto pertence ao usuário
    await this.projectsService.findOneByUser(projectId, userId);

    const where: FindOptionsWhere<Task> = { projectId };
    if (status) {
      where.status = status;
    }

    const [items, totalItems] = await this.tasksRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const totalPages = Math.ceil(totalItems / limit);

    return {
      items,
      meta: {
        totalItems,
        itemsPerPage: limit,
        currentPage: page,
        totalPages,
      },
    };
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
