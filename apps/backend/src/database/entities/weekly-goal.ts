import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import User from './user.js';

/**
 * WeeklyGoal entity — stores the user's per-week targets.
 * Progress is computed on read from Job.statusUpdatedAt timestamps.
 */
@Entity()
export default class WeeklyGoal {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('int', { default: 5 })
  applicationsTarget!: number;

  @Column('int', { default: 2 })
  interviewsTarget!: number;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn()
  user!: User;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
