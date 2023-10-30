import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GearService } from './gear/gear.service';
import { ConfigModule } from '@nestjs/config';
import { GearController } from './gear/gear.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from './entity/message.entity';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: '84.201.140.60',
      port: 5432,
      username: 'postgres',
      password: 'simplepassword',
      database: 'gear',
      entities: [Message],
      synchronize: true,
      autoLoadEntities: true,
    }),
    TypeOrmModule.forFeature([Message]),
  ],
  controllers: [AppController, GearController],
  providers: [AppService, GearService],
})
export class AppModule {}
