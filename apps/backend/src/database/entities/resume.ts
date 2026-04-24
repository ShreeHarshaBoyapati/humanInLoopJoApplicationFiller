import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import Persona from './persona.js';
import ResumeVersion from './resume-version.js';

@Entity()
export default class Resume {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('varchar')
  fileName!: string;

  @Column('boolean', { default: false })
  active!: boolean;

  @ManyToOne(() => Persona, (persona) => persona.resumes, { onDelete: 'CASCADE' })
  persona!: Persona;

  @OneToMany(() => ResumeVersion, (version) => version.resume, { lazy: true })
  versions!: Promise<ResumeVersion[]>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
