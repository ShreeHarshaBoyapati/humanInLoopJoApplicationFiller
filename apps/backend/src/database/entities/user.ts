import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import Job from './job.js';
import ApiKey from './api-key.js';

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

  @OneToMany(() => Job, (job) => job.user)
  jobs!: Job[];

  @OneToMany(() => ApiKey, (apiKey) => apiKey.user)
  apiKeys!: ApiKey[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
