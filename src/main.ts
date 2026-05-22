import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Enable CORS for client apps
  app.enableCors();

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`🚀 Leaderboard API running on http://localhost:${port}`);
  logger.log(`🔌 WebSocket available on ws://localhost:${port}/leaderboard`);
}
bootstrap();
