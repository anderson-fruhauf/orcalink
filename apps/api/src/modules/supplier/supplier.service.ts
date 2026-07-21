import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Prisma, Supplier } from '../../generated/prisma/client.js';
import { CreateSupplierDto } from './dto/create-supplier.dto.js';
import { UpdateSupplierDto } from './dto/update-supplier.dto.js';
import { QuerySupplierDto } from './dto/query-supplier.dto.js';

@Injectable()
export class SupplierService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSupplierDto): Promise<Supplier> {
    if (dto.categoryIds && dto.categoryIds.length > 0) {
      const categories = await this.prisma.category.findMany({
        where: { id: { in: dto.categoryIds } },
      });
      if (categories.length !== dto.categoryIds.length) {
        throw new NotFoundException(
          'Uma ou mais categorias não foram encontradas',
        );
      }
    }

    return this.prisma.$transaction(async (tx: any) => {
      const supplier = await tx.supplier.create({
        data: {
          name: dto.name,
          document: dto.document || null,
          contactName: dto.contactName || null,
          email: dto.email,
          phone: dto.phone || null,
        },
      });

      if (dto.categoryIds && dto.categoryIds.length > 0) {
        await tx.supplierCategory.createMany({
          data: dto.categoryIds.map((categoryId) => ({
            supplierId: supplier.id,
            categoryId,
          })),
        });
      }

      return tx.supplier.findUnique({
        where: { id: supplier.id },
        include: {
          categories: {
            include: {
              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });
    }) as Promise<Supplier>;
  }

  async findAll(query: QuerySupplierDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.SupplierWhereInput = {};

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { document: { contains: query.search, mode: 'insensitive' } },
        { contactName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.categoryId) {
      where.categories = {
        some: {
          categoryId: query.categoryId,
        },
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          categories: {
            include: {
              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.supplier.count({ where }),
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
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: {
        categories: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!supplier) {
      throw new NotFoundException('Fornecedor não encontrado');
    }

    return supplier;
  }

  async update(id: string, dto: UpdateSupplierDto): Promise<Supplier> {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
    });

    if (!supplier) {
      throw new NotFoundException('Fornecedor não encontrado');
    }

    if (dto.categoryIds) {
      if (dto.categoryIds.length > 0) {
        const categories = await this.prisma.category.findMany({
          where: { id: { in: dto.categoryIds } },
        });
        if (categories.length !== dto.categoryIds.length) {
          throw new NotFoundException(
            'Uma ou mais categorias não foram encontradas',
          );
        }
      }
    }

    return this.prisma.$transaction(async (tx: any) => {
      await tx.supplier.update({
        where: { id },
        data: {
          name: dto.name,
          document: dto.document !== undefined ? dto.document : undefined,
          contactName:
            dto.contactName !== undefined ? dto.contactName : undefined,
          email: dto.email,
          phone: dto.phone !== undefined ? dto.phone : undefined,
        },
      });

      if (dto.categoryIds) {
        await tx.supplierCategory.deleteMany({
          where: { supplierId: id },
        });

        if (dto.categoryIds.length > 0) {
          await tx.supplierCategory.createMany({
            data: dto.categoryIds.map((categoryId) => ({
              supplierId: id,
              categoryId,
            })),
          });
        }
      }

      return tx.supplier.findUnique({
        where: { id: id },
        include: {
          categories: {
            include: {
              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });
    }) as Promise<Supplier>;
  }

  async remove(id: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
    });

    if (!supplier) {
      throw new NotFoundException('Fornecedor não encontrado');
    }

    // Não excluir fornecedor com proposta pendente (status PENDING em cotação OPEN)
    const linkedPendingQuotation =
      await this.prisma.quotationSupplier.findFirst({
        where: {
          supplierId: id,
          responseStatus: 'PENDING',
          quotation: {
            status: 'OPEN',
          },
        },
      });

    if (linkedPendingQuotation) {
      throw new ConflictException(
        'Não é possível excluir um fornecedor com proposta pendente em uma cotação ativa.',
      );
    }

    return this.prisma.$transaction(async (tx: any) => {
      await tx.supplierCategory.deleteMany({
        where: { supplierId: id },
      });

      await tx.magicLink.deleteMany({
        where: { supplierId: id },
      });

      await tx.proposalItem.deleteMany({
        where: {
          proposal: {
            supplierId: id,
          },
        },
      });

      await tx.proposal.deleteMany({
        where: { supplierId: id },
      });

      await tx.quotationSupplier.deleteMany({
        where: { supplierId: id },
      });

      return tx.supplier.delete({
        where: { id },
      });
    }) as Promise<Supplier>;
  }
}
