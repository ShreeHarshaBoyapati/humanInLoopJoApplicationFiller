import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import Job from './job.js';
import ApiKey from './api-key.js';
import Persona from './persona.js';
import Tag from './tag.js';
import Event from './event.js';
import WeeklyGoal from './weekly-goal.js';

@Entity()
export default class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('varchar', { unique: true })
  email!: string;

  @Column('varchar', { nullable: true })
  sessionId!: string | null;

  @Column('varchar', { nullable: true })
  googleId!: string | null;

  @Column('varchar', { nullable: true })
  refreshToken!: string | null;

  @Column('boolean', { default: false })
  onboardingComplete!: boolean;

  @OneToMany(() => Job, (job) => job.user)
  jobs!: Job[];

  @OneToMany(() => ApiKey, (apiKey) => apiKey.user)
  apiKeys!: ApiKey[];

  @OneToMany(() => Persona, (persona) => persona.user)
  personas!: Persona[];

  @OneToMany(() => Tag, (tag) => tag.user)
  tags!: Tag[];

  @OneToMany(() => Event, (event) => event.user)
  events!: Event[];

  @OneToOne(() => WeeklyGoal, (weeklyGoal) => weeklyGoal.user)
  weeklyGoal!: WeeklyGoal | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
