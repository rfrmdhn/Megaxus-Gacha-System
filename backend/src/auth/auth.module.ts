import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';

const jwtModule = JwtModule.registerAsync({
  imports: [ConfigModule],
  useFactory: (config: ConfigService) => ({
    secret: config.getOrThrow<string>('JWT_SECRET'),
    // Seconds, not a duration string — sidesteps @nestjs/jwt's branded StringValue type.
    // parseInt is required because ConfigService reads raw env strings verbatim.
    signOptions: { expiresIn: parseInt(config.get<string>('JWT_EXPIRES_IN_SECONDS', '86400'), 10) },
  }),
  inject: [ConfigService],
});

@Module({
  imports: [PassportModule, jwtModule],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [jwtModule],
})
export class AuthModule {}
