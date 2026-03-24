import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import User from './user.js';
import Resume from './resume.js';

@Entity()
export default class Persona {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('varchar')
  title!: string;

  @Column('simple-array', { default: [] })
  keywords!: string[];

  @ManyToOne(() => User, (user) => user.personas, { onDelete: 'CASCADE' })
  user!: User;

  @OneToMany(() => Resume, (resume) => resume.persona)
  resumes!: Resume[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
