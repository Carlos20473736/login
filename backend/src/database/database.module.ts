import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        host: configService.get<string>('DATABASE_URL') ? undefined : configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<string>('DATABASE_URL') ? undefined : configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DATABASE_URL') ? undefined : configService.get<string>('DB_USERNAME', 'minitracker'),
        password: configService.get<string>('DATABASE_URL') ? undefined : configService.get<string>('DB_PASSWORD', 'minitracker123'),
        database: configService.get<string>('DATABASE_URL') ? undefined : configService.get<string>('DB_DATABASE', 'minitracker'),
        entities: [__dirname + '/../modules/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        synchronize: false,
        migrationsRun: true,
        ssl: configService.get<string>('DATABASE_URL') ? { rejectUnauthorized: false } : false,
      }),
    }),
  ],
})
export class DatabaseModule {}
