import { createParamDecorator, ExecutionContext, BadRequestException } from '@nestjs/common';

export const SchoolId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const schoolId = request['schoolId'];
    if (!schoolId) {
      throw new BadRequestException('School tenant context is missing. Provide a valid subdomain or x-tenant-id header.');
    }
    return schoolId;
  },
);

export const Tenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const school = request['school'];
    if (!school) {
      throw new BadRequestException('School tenant context is missing. Provide a valid subdomain or x-tenant-id header.');
    }
    return school;
  },
);

export const OptionalSchoolId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request['schoolId'];
  },
);
