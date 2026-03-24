import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import User from './user.js';
import type { ProviderName } from '../../services/ai/registry.js';

@Entity()
export default class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'enum',
    enum: ['gemini', 'openai', 'anthropic', 'groq', 'mistral', 'ollama', 'custom'],
  })
  provider!: ProviderName;

  @Column({ type: 'jsonb', default: {} })
  credentials!: Record<string, string>;

  @Column('varchar')
  model!: string;

  @Column({ type: 'boolean', default: false })
  active!: boolean;

  @ManyToOne(() => User, (user) => user.apiKeys, { onDelete: 'CASCADE' })
  user!: User;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
