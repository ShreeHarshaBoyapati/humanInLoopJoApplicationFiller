import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import Persona from './persona.js';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

@Entity()
export default class Resume {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('bytea')
  file!: Buffer;

  @Column('varchar')
  fileName!: string;

  @Column('integer')
  fileSize!: number;

  @Column('simple-array', { default: [] })
  keywords!: string[];

  @ManyToOne(() => Persona, (persona) => persona.resumes, { onDelete: 'CASCADE' })
  persona!: Persona;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @BeforeInsert()
  @BeforeUpdate()
  validateFileSize() {
    if (this.file && this.file.length > MAX_FILE_SIZE_BYTES) {
      throw new Error(`File size exceeds the maximum limit of 10MB`);
    }
  }
}
