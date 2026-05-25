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

  const basePort = parseInt(process.env.PORT || '3000', 10);
  const maxAttempts = 5;
  let port = basePort;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      await app.listen(port);
      logger.log(`🚀 Leaderboard API running on http://localhost:${port}`);
      logger.log(`🔌 WebSocket available on ws://localhost:${port}/leaderboard`);
      return;
    } catch (err: any) {
      if (err?.code === 'EADDRINUSE') {
        logger.warn(`Port ${port} is already in use; trying ${port + 1}`);
        port += 1;
      } else {
        throw err;
      }
    }
  }

  throw new Error(`Unable to start Nest application after ${maxAttempts} port attempts starting at ${basePort}`);
}
bootstrap();
