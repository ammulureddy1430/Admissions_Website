import { Injectable, NestMiddleware, NotFoundException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../prisma.service';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // 1. Try to get tenant from custom header
    let schoolIdentifier = req.headers['x-tenant-id'] as string;

    // 2. If not in header, extract from subdomain
    if (!schoolIdentifier) {
      const host = req.headers.host || '';
      // Assuming host format: subdomain.domain.com or subdomain.localhost:3000
      const parts = host.split('.');
      if (parts.length > 1) {
        const potentialSubdomain = parts[0];
        // Exclude common prefixes or localhost if it's not a subdomain
        if (potentialSubdomain !== 'www' && potentialSubdomain !== 'localhost' && potentialSubdomain !== 'admissionsos') {
          schoolIdentifier = potentialSubdomain;
        }
      }
    }

    if (schoolIdentifier) {
      // Find school by subdomain or ID
      const school = await this.prisma.school.findFirst({
        where: {
          OR: [
            { id: schoolIdentifier },
            { subdomain: schoolIdentifier },
            { customDomain: schoolIdentifier },
          ],
        },
      });

      if (!school) {
        throw new NotFoundException(`School tenant '${schoolIdentifier}' not found.`);
      }

      // Attach tenant to request object
      (req as any)['school'] = school;
      (req as any)['schoolId'] = school.id;
    }

    next();
  }
}
