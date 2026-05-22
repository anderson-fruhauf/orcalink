import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Prisma, Product } from '../../generated/prisma/client.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { QueryProductDto } from './dto/query-product.dto.js';

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductDto) {
    // Valida se a categoria existe e pertence ao tenant do usuário
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });

    if (!category) {
      throw new NotFoundException('Categoria não encontrada');
    }

    return this.prisma.product.create({
      data: {
        name: dto.name,
        description: dto.description,
        unit: dto.unit,
        internalCode: dto.internalCode,
        categoryId: dto.categoryId,
      },
    });
  }

  async findAll(query: QueryProductDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {};

    if (query.search) {
      where.name = {
        contains: query.search,
        mode: 'insensitive',
      };
    }

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.product.count({ where }),
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
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }

    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    // Verifica se o produto existe
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }

    // Se informou uma nova categoria, valida se ela existe no mesmo tenant
    if (dto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
      });

      if (!category) {
        throw new NotFoundException('Categoria não encontrada');
      }
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        unit: dto.unit,
        internalCode: dto.internalCode,
        categoryId: dto.categoryId,
      },
    });
  }

  async remove(id: string) {
    // Verifica se o produto existe
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }

    // Não excluir produto vinculado a cotação ativa (status OPEN)
    const linkedOpenQuotation = await this.prisma.quotationItem.findFirst({
      where: {
        productId: id,
        quotation: {
          status: 'OPEN',
        },
      },
    });

    if (linkedOpenQuotation) {
      throw new ConflictException(
        'Não é possível excluir um produto vinculado a uma cotação ativa (status OPEN).',
      );
    }

    return this.prisma.$transaction(async (tx: any) => {
      await tx.quotationItem.deleteMany({
        where: { productId: id },
      });

      await tx.proposalItem.deleteMany({
        where: { productId: id },
      });

      return tx.product.delete({
        where: { id },
      });
    }) as Promise<Product>;
  }
}
