import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type User from './user.js';
import Persona from './persona.js';
import ResumeVersion from './resume-version.js';

@Entity()
export default class Job {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('varchar')
  title!: string;

  @Column('simple-array', { default: [] })
  tags!: string[];

  @Column({ type: 'uuid', nullable: true })
  personaId!: string | null;

  @ManyToOne(() => Persona, { nullable: true })
  @JoinColumn({ name: 'personaId' })
  persona!: Persona | null;

  @Column('varchar', { default: 'draft' })
  status!: string; //need to create enum

  @Column('int', { default: 0 })
  acceptanceLevel!: number;

  @Column('varchar', { default: '' })
  companyName!: string;

  @Column('text', { default: '' })
  notes!: string;

  @Column('text', { default: '' })
  requirements!: string;

  @Column('simple-json', { default: {} })
  metaData!: Record<string, unknown>;

  @Column('text', { default: '' })
  description!: string;

  @Column('simple-json', { default: {} })
  highlights!: Record<string, unknown>;

  @Column('simple-array', { default: [] })
  keySkills!: string[];

  @Column('boolean', { default: false })
  favorite!: boolean;

  @Column('timestamp', { nullable: true })
  dataUpdatedAt!: Date | null;

  @ManyToOne('User', 'jobs', { onDelete: 'CASCADE' })
  user!: User;

  @ManyToOne(() => ResumeVersion, { nullable: true })
  primaryVersion!: ResumeVersion | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
