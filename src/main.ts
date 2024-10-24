import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS with options
  app.enableCors({
    origin: 'http://localhost:5173', // Frontend origin
    methods: 'GET,POST,PUT,DELETE',  // Allowed methods
    credentials: true                // Allow cookies and credentials
  });

  const config = new DocumentBuilder()
  .setTitle('4F API')
  .setDescription('API documentaion')
  .setVersion('1.0')
  .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
  
}
bootstrap();
