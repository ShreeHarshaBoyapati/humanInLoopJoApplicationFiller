import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Unique,
} from 'typeorm';
import User from './user.js';
import type { ProviderName } from '../../services/ai/ai-factory.js';

@Entity()
@Unique(['user', 'provider']) // A user can only have one active key per provider
export default class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'enum',
    enum: ['gemini', 'anthropic'],
  })
  provider!: ProviderName;

  @Column('text')
  key!: string;

  @Column('varchar')
  model!: string;

  @ManyToOne(() => User, (user) => user.apiKeys, { onDelete: 'CASCADE' })
  user!: User;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
