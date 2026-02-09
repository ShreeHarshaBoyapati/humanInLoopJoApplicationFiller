import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import type Job from './job.js';

@Entity()
export default class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('varchar', { unique: true })
  email!: string;

  @Column('varchar')
  password!: string;

  @Column('varchar', { nullable: true })
  sessionId!: string | null;

  @Column('simple-array', { default: [] })
  persona!: string[];

  @OneToMany('Job', 'user')
  jobs!: Job[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
