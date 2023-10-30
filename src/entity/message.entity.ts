import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class Message {
  @PrimaryColumn()
  id: string;

  @Column()
  source: string;

  @Column()
  destination: string;

  @Column()
  payload: string;

  @Column()
  type: number;
}
