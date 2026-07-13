import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.enableCors({
    origin: [
      process.env.FRONTEND_USER_ORIGIN ?? 'http://localhost:3000',
      process.env.FRONTEND_ADMIN_ORIGIN ?? 'http://localhost:3002',
    ],
    credentials: true,
  });
  app.setGlobalPrefix('api');
  // URI versioning: all routes live under /api/v1. Controllers opt out with
  // @Version(VERSION_NEUTRAL) (e.g. the health check at /api/health).
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
