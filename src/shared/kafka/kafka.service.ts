import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer, Consumer, EachMessagePayload } from 'kafkajs';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private kafka: Kafka;
  private producer: Producer;
  private consumers: Consumer[] = [];
  private readonly logger = new Logger(KafkaService.name);

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const brokers = this.configService
      .get<string>('KAFKA_BROKERS', 'localhost:9092')
      .split(',');
    const clientId = this.configService.get<string>(
      'KAFKA_CLIENT_ID',
      'leaderboard-service',
    );

    this.kafka = new Kafka({
      clientId,
      brokers,
      retry: {
        initialRetryTime: 300,
        retries: 10,
      },
    });

    this.producer = this.kafka.producer();
    await this.producer.connect();
    this.logger.log(`Kafka producer connected to ${brokers.join(', ')}`);
  }

  async publish(topic: string, message: Record<string, unknown>): Promise<void> {
    await this.producer.send({
      topic,
      messages: [
        {
          key: (message.userId as string) || undefined,
          value: JSON.stringify(message),
        },
      ],
    });
    this.logger.debug(`Published message to topic: ${topic}`);
  }

  async subscribe(
    topic: string,
    groupId: string,
    handler: (payload: EachMessagePayload) => Promise<void>,
  ): Promise<void> {
    const consumer = this.kafka.consumer({ groupId });
    await consumer.connect();
    await consumer.subscribe({ topic, fromBeginning: false });
    await consumer.run({ eachMessage: handler });

    this.consumers.push(consumer);
    this.logger.log(
      `Kafka consumer subscribed to topic: ${topic} (group: ${groupId})`,
    );
  }

  async onModuleDestroy() {
    if (this.producer) {
      await this.producer.disconnect();
      this.logger.log('Kafka producer disconnected');
    }

    for (const consumer of this.consumers) {
      await consumer.disconnect();
    }
    this.logger.log(`Disconnected ${this.consumers.length} Kafka consumer(s)`);
  }
}
