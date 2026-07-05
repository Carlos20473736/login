import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRefreshToken1719900100000 implements MigrationInterface {
  name = 'AddRefreshToken1719900100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "refresh_token" varchar NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN "refresh_token"
    `);
  }
}
