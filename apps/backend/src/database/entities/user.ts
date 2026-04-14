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
import Persona from './persona.js';

@Entity()
export default class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('varchar', { unique: true })
  email!: string;

  @Column('varchar', { nullable: true })
  password!: string | null;

  @Column('varchar', { nullable: true })
  sessionId!: string | null;

  @Column('varchar', { nullable: true })
  googleId!: string | null;

  @Column('varchar', { nullable: true })
  refreshToken!: string | null;

  @OneToMany(() => Job, (job) => job.user)
  jobs!: Job[];

  @OneToMany(() => ApiKey, (apiKey) => apiKey.user)
  apiKeys!: ApiKey[];

  @OneToMany(() => Persona, (persona) => persona.user)
  personas!: Persona[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
