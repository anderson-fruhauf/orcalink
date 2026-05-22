import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { TenantContext } from '../../common/context/tenant-context.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { QueryCategoryDto } from './dto/query-category.dto.js';

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCategoryDto) {
    const tenantId = TenantContext.getTenantId();

    return this.prisma.category.create({
      data: {
        name: dto.name,
        tenantId: tenantId || '',
      },
    });
  }

  async findAll(query: QueryCategoryDto) {
    const tenantId = TenantContext.getTenantId();
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.CategoryWhereInput = {
      tenantId,
    };

    if (query.search) {
      where.name = {
        contains: query.search,
        mode: 'insensitive',
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.category.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.category.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async findOne(id: string) {
    const tenantId = TenantContext.getTenantId();

    const category = await this.prisma.category.findFirst({
      where: { id, tenantId },
    });

    if (!category) {
      throw new NotFoundException('Categoria não encontrada');
    }

    return category;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const tenantId = TenantContext.getTenantId();

    const category = await this.prisma.category.findFirst({
      where: { id, tenantId },
    });

    if (!category) {
      throw new NotFoundException('Categoria não encontrada');
    }

    return this.prisma.category.update({
      where: { id, tenantId },
      data: {
        name: dto.name,
      },
    });
  }

  async remove(id: string) {
    const tenantId = TenantContext.getTenantId();

    const category = await this.prisma.category.findFirst({
      where: { id, tenantId },
    });

    if (!category) {
      throw new NotFoundException('Categoria não encontrada');
    }

    const productCount = await this.prisma.product.count({
      where: { categoryId: id, tenantId },
    });

    if (productCount > 0) {
      throw new ConflictException(
        'Não é possível excluir uma categoria com produtos vinculados.',
      );
    }

    const supplierCount = await this.prisma.supplierCategory.count({
      where: { categoryId: id },
    });

    if (supplierCount > 0) {
      throw new ConflictException(
        'Não é possível excluir uma categoria com fornecedores vinculados.',
      );
    }

    return this.prisma.category.delete({
      where: { id, tenantId },
    });
  }
}
