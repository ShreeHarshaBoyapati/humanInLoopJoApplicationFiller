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
import Resume from './resume.js';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

@Entity()
export default class ResumeVersion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('bytea')
  file!: Buffer;

  @Column('integer')
  fileSize!: number;

  @Column('simple-array', { default: [] })
  keywords!: string[];

  @Column('boolean', { default: false })
  active!: boolean;

  @Column('jsonb', { nullable: true })
  parsedData!: Record<string, unknown> | null;

  @Column('varchar')
  versionName!: string;

  @Column('varchar', { nullable: true })
  comment!: string | null;

  @ManyToOne(() => Resume, (resume) => resume.versions, { onDelete: 'CASCADE' })
  resume!: Resume;

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
