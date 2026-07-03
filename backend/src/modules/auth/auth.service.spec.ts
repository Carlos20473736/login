import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: Partial<Record<keyof UsersService, jest.Mock>>;
  let jwtService: Partial<Record<keyof JwtService, jest.Mock>>;

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn(),
      create: jest.fn(),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('fake-jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('deve registrar um novo usuário com sucesso', async () => {
      const dto = { name: 'João', email: 'joao@test.com', password: '123456' };

      usersService.findByEmail!.mockResolvedValue(null);
      usersService.create!.mockResolvedValue({
        id: 'uuid-1',
        name: dto.name,
        email: dto.email,
        password: 'hashed-password',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await authService.register(dto);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('email', dto.email);
      expect(result).not.toHaveProperty('password');
      expect(usersService.findByEmail).toHaveBeenCalledWith(dto.email);
      expect(usersService.create).toHaveBeenCalled();
    });

    it('deve lançar ConflictException se e-mail já existe', async () => {
      const dto = { name: 'João', email: 'joao@test.com', password: '123456' };

      usersService.findByEmail!.mockResolvedValue({ id: 'existing-id', email: dto.email });

      await expect(authService.register(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('deve retornar access_token com credenciais válidas', async () => {
      const dto = { email: 'joao@test.com', password: '123456' };
      const hashedPassword = await bcrypt.hash(dto.password, 10);

      usersService.findByEmail!.mockResolvedValue({
        id: 'uuid-1',
        email: dto.email,
        password: hashedPassword,
      });

      const result = await authService.login(dto);

      expect(result).toHaveProperty('access_token', 'fake-jwt-token');
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'uuid-1',
        email: dto.email,
      });
    });

    it('deve lançar UnauthorizedException se usuário não existe', async () => {
      const dto = { email: 'naoexiste@test.com', password: '123456' };

      usersService.findByEmail!.mockResolvedValue(null);

      await expect(authService.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('deve lançar UnauthorizedException se senha está incorreta', async () => {
      const dto = { email: 'joao@test.com', password: 'senha-errada' };
      const hashedPassword = await bcrypt.hash('senha-correta', 10);

      usersService.findByEmail!.mockResolvedValue({
        id: 'uuid-1',
        email: dto.email,
        password: hashedPassword,
      });

      await expect(authService.login(dto)).rejects.toThrow(UnauthorizedException);
    });
  });
});
