import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('verification_codes')
@Index(['email'])
export default class VerificationCode {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('varchar')
  email!: string;

  @Column('varchar')
  code!: string;

  @Column('timestamp')
  expiresAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;
}
