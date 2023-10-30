import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  CreateType,
  decodeAddress,
  GasInfo,
  GearApi,
  GearKeyring,
  HexString,
  ProgramMetadata,
  VaraTestnetApi,
} from '@gear-js/api';
import { promises as fs } from 'fs';
import { ConfigService } from '@nestjs/config';
import { KeyringPair } from '@polkadot/keyring/types';
import { VaraMessageSendOptions } from '@gear-js/api/types/interfaces/message/extrinsic';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Message } from '../entity/message.entity';
import { MessageTypeEnum } from '../enum/message-type-enum';

@Injectable()
export class GearService implements OnModuleInit {
  constructor(
    private configService: ConfigService,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
  ) {}

  private readonly logger = new Logger('GearService');
  private gearApi: GearApi;
  private keyring: KeyringPair;
  private programId = this.configService.get<HexString>('PROGRAM_ID');
  private meta = ProgramMetadata.from(
    this.configService.get<HexString>('METADATA'),
  );

  private async calcGas(
    sourceId: HexString,
    destinationId: HexString,
    payload: string,
  ): Promise<GasInfo> {
    const gas = await this.gearApi.program.calculateGas.handle(
      sourceId,
      destinationId,
      payload,
      0,
      false,
      this.meta,
    );

    return gas;
  }
  async sendPing(): Promise<void> {
    try {
      const destination = this.programId;
      const payload = 'Ping';

      const gas = await this.calcGas(
        decodeAddress(this.keyring.address),
        destination,
        payload,
      );

      const message: VaraMessageSendOptions = {
        destination,
        payload: payload,
        gasLimit: gas.min_limit,
        value: 0,
      };
      this.logger.log(`generated message ${JSON.stringify(message)}`);

      const extrinsic = await this.gearApi.message.send(message, this.meta);

      await extrinsic.signAndSend(this.keyring, (event) => {
        this.logger.log(event.toHuman());
      });
      this.logger.log(`signed message success`);
    } catch (e) {
      this.logger.error(`${e.name}: ${e.message}`);
    }
  }
  private onUserMessageReceived = async (result: any) => {
    try {
      const message: any = result.data[0];
      if (message.source.toHuman() == this.programId) {
        const payload: any = CreateType.create(
          this.meta.getTypeName(this.meta.types.handle.output),
          message.payload,
        ).toHuman(true);

        this.logger.log(`UserMessageSent: ${message}`);
        this.logger.log(payload);
        this.logger.log(payload.Ok);
        this.logger.log(payload.Err);

        await this.messageRepository.insert({
          id: message.id.toHuman(),
          source: message.source.toHuman(),
          destination: message.destination.toHuman(),
          payload: JSON.stringify(payload),
          type: payload.Ok ? MessageTypeEnum.pong : MessageTypeEnum.error,
        });
      }
    } catch (e) {
      this.logger.error(`${e.name}: ${e.message}`);
    }
  };
  async onModuleInit() {
    try {
      this.gearApi = await VaraTestnetApi.create({
        providerAddress: this.configService.get<string>(
          'GEAR_PROVIDER_ADDRESS',
        ),
      });

      const [chain, nodeName, nodeVersion] = await Promise.all([
        this.gearApi.chain(),
        this.gearApi.nodeName(),
        this.gearApi.nodeVersion(),
      ]);

      this.logger.log(
        `onModuleInit: connected to chain ${chain} using ${nodeName} v${nodeVersion}`,
      );

      this.meta.createType(this.meta.types.handle.input, { value: 'string' });
      this.meta.createType(this.meta.types.handle.output, {
        Ok: 'Str',
        Err: 'number',
      });

      await this.gearApi.gearEvents.subscribeToGearEvent(
        'UserMessageSent',
        this.onUserMessageReceived,
      );

      const mnemonic = await fs.readFile(
        this.configService.get<string>('MNEMONIC_PATH'),
      );
      this.keyring = await GearKeyring.fromMnemonic(mnemonic.toString());

      // const jsonKeyring = await fs.readFile(
      //   this.configService.get<string>('WALLET_JSON_PATH'),
      // );
      // this.keyring = GearKeyring.fromJson(jsonKeyring.toString(), 'passphrase');

      this.logger.log(this.keyring.address);
    } catch (e) {
      this.logger.error(`${e.name}: ${e.message}`);
    }
  }
}
