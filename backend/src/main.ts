import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { UsersService } from './users/users.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  app.enableCors({
    origin: ['http://localhost:4173', 'http://localhost:5173'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  const usersService = app.get(UsersService);
  await usersService.createEmployeeAdminIfNotExists();

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port);
  Logger.log(`Backend listening on http://localhost:${port}`, 'Bootstrap');
}
bootstrap();
