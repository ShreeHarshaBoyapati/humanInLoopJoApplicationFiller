import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import Job from './job.js';
import ResumeVersion from './resume-version.js';

// Type for the breakdown JSONB column
export interface AnalysisBreakdown {
  missingFields: string[];
  highlyMatchedKeys: string[];
  suggestions: string[];
  overallVerdict: string;
}

@Entity('results')
export default class Result {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  jobId!: string;

  @ManyToOne(() => Job, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'jobId' })
  job!: Job;

  @Column('uuid')
  resumeVersionId!: string;

  @ManyToOne(() => ResumeVersion)
  @JoinColumn({ name: 'resumeVersionId' })
  resumeVersion!: ResumeVersion;

  @Column('integer')
  score!: number;

  @Column('jsonb')
  breakdown!: AnalysisBreakdown;

  @CreateDateColumn()
  createdAt!: Date;
}
