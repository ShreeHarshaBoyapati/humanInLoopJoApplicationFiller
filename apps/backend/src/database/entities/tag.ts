import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
  Unique,
} from 'typeorm';
import type User from './user.js';

/**
 * Tag entity — user-scoped label used to categorise events.
 * `name` is unique per user (composite unique index on name + userId).
 * `color` is deterministically derived from the lowercased name at create/update
 * time, so the same name always renders the same color across devices.
 */
@Entity('tags')
@Unique('UQ_tag_name_user', ['name', 'user'])
export default class Tag {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('varchar')
  @Index()
  name!: string;

  @Column('varchar')
  color!: string;

  @ManyToOne('User', 'tags', { onDelete: 'CASCADE' })
  user!: User;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
