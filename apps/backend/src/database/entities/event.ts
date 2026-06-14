import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
  JoinColumn,
} from 'typeorm';
import type User from './user.js';
import Tag from './tag.js';
import Job from './job.js';

@Entity('events')
@Index('IDX_event_user_date', ['user', 'date'])
@Index('IDX_event_user_tag_date', ['user', 'tag', 'date'])
@Index('IDX_event_user_completed', ['user', 'isCompleted', 'completedAt'])
export default class Event {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('varchar')
  title!: string;

  @Column('text', { default: '' })
  description!: string;

  @Column('varchar')
  date!: string;

  @Column('varchar', { nullable: true })
  time!: string | null;

  @Column({ type: 'uuid', nullable: true })
  tagId!: string | null;

  @ManyToOne(() => Tag, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tagId' })
  tag!: Tag | null;

  @Column({ type: 'uuid', nullable: true })
  jobId!: string | null;

  @ManyToOne(() => Job, (job) => job.events, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'jobId' })
  job!: Job | null;

  @Column('boolean', { default: false })
  isCompleted!: boolean;

  @Column('timestamp', { nullable: true })
  completedAt!: Date | null;

  @ManyToOne('User', 'events', { onDelete: 'CASCADE' })
  user!: User;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
