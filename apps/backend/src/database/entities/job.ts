import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import type User from './user.js';

@Entity()
export default class Job {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('varchar')
  title!: string;

  @Column('simple-array', { default: [] })
  tags!: string[];

  @Column('varchar', { default: 'default' })
  persona!: string;

  @Column('varchar', { default: 'draft' })
  status!: string;

  @Column('int', { default: 0 })
  acceptanceLevel!: number;

  @Column('varchar', { default: '' })
  companyName!: string;

  @Column('simple-json', { default: {} })
  metaData!: Record<string, unknown>;

  @Column('simple-json', { default: {} })
  description!: Record<string, unknown>;

  @Column('simple-json', { default: {} })
  highlights!: Record<string, unknown>;

  @Column('simple-array', { default: [] })
  keySkills!: string[];

  @ManyToOne('User', 'jobs', { onDelete: 'CASCADE' })
  user!: User;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
