// In apps/api/src/config/validation.schema.ts
import * as Joi from 'joi';

export const validationSchema = Joi.object({
  DATABASE_URL: Joi.string().required(),
  KAFKA_BROKER_URL: Joi.string().required(),
  REDIS_URL: Joi.string().required(),
});
