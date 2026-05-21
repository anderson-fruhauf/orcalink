import { SetMetadata } from '@nestjs/common';

export const PLAN_LIMIT_KEY = 'plan_limit_resource';
export const CheckPlanLimit = (resource: string) =>
  SetMetadata(PLAN_LIMIT_KEY, resource);
