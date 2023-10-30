import { Controller, Get, Post } from '@nestjs/common';
import { GearService } from './gear.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Message } from '../entity/message.entity';
import { Repository } from 'typeorm';
import { MessageTypeEnum } from '../enum/message-type-enum';

@Controller('gear')
export class GearController {
  constructor(
    private readonly gearService: GearService,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
  ) {}
  @Get()
  async getMessages() {
    const ping = await this.messageRepository.count({
      where: {
        type: MessageTypeEnum.ping,
      },
    });

    const pong = await this.messageRepository.count({
      where: {
        type: MessageTypeEnum.pong,
      },
    });

    const error = await this.messageRepository.count({
      where: {
        type: MessageTypeEnum.error,
      },
    });

    return {
      success: true,
      ping,
      pong,
      error,
    };
  }
  @Post('/ping')
  async createPing() {
    await this.gearService.sendPing();
    return {
      success: true,
    };
  }
}
