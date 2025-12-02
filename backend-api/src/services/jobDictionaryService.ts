import { Prisma, JobDictionaryCategory, JobDictionaryPosition } from '@prisma/client';
import { prisma } from '../lib/prisma';

export interface DictionaryPositionDTO {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
  tags: string[];
  categoryId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DictionaryCategoryDTO {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  positions?: DictionaryPositionDTO[];
}

const normalizeTags = (tags?: unknown): string[] => {
  if (!tags) {
    return [];
  }
  if (Array.isArray(tags)) {
    return tags
      .map((tag) => {
        if (typeof tag === 'string') {
          return tag.trim();
        }
        if (typeof tag === 'number') {
          return String(tag);
        }
        return '';
      })
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
  }
  if (typeof tags === 'string') {
    try {
      const parsed = JSON.parse(tags);
      return normalizeTags(parsed);
    } catch {
      return [tags.trim()].filter((tag) => tag.length > 0);
    }
  }
  return [];
};

type PositionModel = JobDictionaryPosition & {
  category?: JobDictionaryCategory | null;
};

type CategoryModel = JobDictionaryCategory & {
  positions?: JobDictionaryPosition[];
};

const mapPosition = (position: PositionModel): DictionaryPositionDTO => ({
  id: position.id,
  code: position.code,
  name: position.name,
  description: position.description ?? null,
  sortOrder: position.sortOrder ?? 0,
  isActive: Boolean(position.isActive),
  tags: normalizeTags(position.tags),
  categoryId: position.categoryId,
  createdAt: position.createdAt,
  updatedAt: position.updatedAt,
});

const mapCategory = (category: CategoryModel, includePositions = false): DictionaryCategoryDTO => ({
  id: category.id,
  code: category.code,
  name: category.name,
  description: category.description ?? null,
  sortOrder: category.sortOrder ?? 0,
  isActive: Boolean(category.isActive),
  createdAt: category.createdAt,
  updatedAt: category.updatedAt,
  positions: includePositions && Array.isArray(category.positions)
    ? category.positions.map((position) => mapPosition(position))
    : undefined,
});

const toJsonArray = (tags: string[]): Prisma.InputJsonValue => {
  return tags;
};

interface PaginationOptions {
  page?: number;
  pageSize?: number;
}

interface CategoryListOptions extends PaginationOptions {
  keyword?: string;
  includePositions?: boolean;
  includeInactive?: boolean;
}

interface PositionListOptions extends PaginationOptions {
  keyword?: string;
  categoryId?: string;
  includeInactive?: boolean;
}

export const fetchActiveDictionary = async (includeInactive = false) => {
  const categories = await prisma.jobDictionaryCategory.findMany({
    where: includeInactive ? undefined : { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: {
      positions: {
        where: includeInactive ? undefined : { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      },
    },
  });

  return categories.map((category: CategoryModel) => mapCategory(category, true));
};

export const listCategories = async (options: CategoryListOptions = {}) => {
  const {
    page = 1,
    pageSize = 20,
    keyword,
    includePositions = false,
    includeInactive = true,
  } = options;

  const where: Prisma.JobDictionaryCategoryWhereInput = {};

  if (!includeInactive) {
    where.isActive = true;
  }

  if (keyword && keyword.trim().length > 0) {
    where.OR = [
      { name: { contains: keyword.trim() } },
      { code: { contains: keyword.trim() } },
      { description: { contains: keyword.trim() } },
    ];
  }

  const skip = Math.max(page - 1, 0) * Math.max(pageSize, 1);
  const take = Math.max(pageSize, 1);

  const [categories, total] = await Promise.all([
    prisma.jobDictionaryCategory.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: includePositions
        ? {
            positions: {
              orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
            },
          }
        : undefined,
      skip,
      take,
    }),
    prisma.jobDictionaryCategory.count({ where }),
  ]);

  return {
    list: categories.map((category: CategoryModel) => mapCategory(category, includePositions)),
    total,
    page: Math.max(page, 1),
    pageSize: take,
  };
};

export const listPositions = async (options: PositionListOptions = {}) => {
  const {
    page = 1,
    pageSize = 20,
    keyword,
    categoryId,
    includeInactive = true,
  } = options;

  const where: Prisma.JobDictionaryPositionWhereInput = {};

  if (!includeInactive) {
    where.isActive = true;
  }

  if (keyword && keyword.trim().length > 0) {
    where.OR = [
      { name: { contains: keyword.trim() } },
      { code: { contains: keyword.trim() } },
      { description: { contains: keyword.trim() } },
      { tags: { array_contains: keyword.trim() } as any },
    ];
  }

  if (categoryId) {
    where.categoryId = categoryId;
  }

  const skip = Math.max(page - 1, 0) * Math.max(pageSize, 1);
  const take = Math.max(pageSize, 1);

  const [positions, total] = await Promise.all([
    prisma.jobDictionaryPosition.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        category: true,
      },
      skip,
      take,
    }),
    prisma.jobDictionaryPosition.count({ where }),
  ]);

  return {
    list: positions.map((position: PositionModel) => ({
      ...mapPosition(position),
      category: position.category ? mapCategory(position.category, false) : undefined,
    })),
    total,
    page: Math.max(page, 1),
    pageSize: take,
  };
};

export const getCategory = async (id: string, includePositions = false) => {
  const category = await prisma.jobDictionaryCategory.findUnique({
    where: { id },
    include: includePositions
      ? {
          positions: {
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          },
        }
      : undefined,
  });

  if (!category) {
    return null;
  }

  return mapCategory(category, includePositions);
};

export const getPosition = async (id: string) => {
  const position = await prisma.jobDictionaryPosition.findUnique({
    where: { id },
    include: { category: true },
  });

  if (!position) {
    return null;
  }

  return {
    ...mapPosition(position),
    category: mapCategory(position.category, false),
  };
};

export const createCategory = async (payload: {
  code: string;
  name: string;
  description?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}) => {
  const category = await prisma.jobDictionaryCategory.create({
    data: {
      code: payload.code.trim(),
      name: payload.name.trim(),
      description: payload.description ?? null,
      sortOrder: payload.sortOrder ?? 0,
      isActive: payload.isActive ?? true,
    },
  });

  return mapCategory(category);
};

export const updateCategory = async (
  id: string,
  payload: {
    code?: string;
    name?: string;
    description?: string | null;
    sortOrder?: number;
    isActive?: boolean;
  }
) => {
  const data: Prisma.JobDictionaryCategoryUpdateInput = {};

  if (payload.code !== undefined) {
    data.code = payload.code.trim();
  }
  if (payload.name !== undefined) {
    data.name = payload.name.trim();
  }
  if (payload.description !== undefined) {
    data.description = payload.description;
  }
  if (payload.sortOrder !== undefined) {
    data.sortOrder = payload.sortOrder;
  }
  if (payload.isActive !== undefined) {
    data.isActive = payload.isActive;
  }

  const category = await prisma.jobDictionaryCategory.update({
    where: { id },
    data,
  });

  return mapCategory(category);
};

export const deleteCategory = async (id: string) => {
  await prisma.jobDictionaryCategory.delete({
    where: { id },
  });
};

export const createPosition = async (payload: {
  categoryId: string;
  code: string;
  name: string;
  description?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  tags?: string[];
}) => {
  const tags = payload.tags ? normalizeTags(payload.tags) : [];

  const position = await prisma.jobDictionaryPosition.create({
    data: {
      code: payload.code.trim(),
      name: payload.name.trim(),
      description: payload.description ?? null,
      sortOrder: payload.sortOrder ?? 0,
      isActive: payload.isActive ?? true,
      tags: tags.length ? (toJsonArray(tags) as Prisma.InputJsonValue) : [],
      category: {
        connect: {
          id: payload.categoryId,
        },
      },
    },
  });

  return mapPosition(position);
};

export const updatePosition = async (
  id: string,
  payload: {
    categoryId?: string;
    code?: string;
    name?: string;
    description?: string | null;
    sortOrder?: number;
    isActive?: boolean;
    tags?: string[];
  }
) => {
  const data: Prisma.JobDictionaryPositionUpdateInput = {};

  if (payload.categoryId !== undefined) {
    data.category = {
      connect: { id: payload.categoryId },
    };
  }
  if (payload.code !== undefined) {
    data.code = payload.code.trim();
  }
  if (payload.name !== undefined) {
    data.name = payload.name.trim();
  }
  if (payload.description !== undefined) {
    data.description = payload.description;
  }
  if (payload.sortOrder !== undefined) {
    data.sortOrder = payload.sortOrder;
  }
  if (payload.isActive !== undefined) {
    data.isActive = payload.isActive;
  }
  if (payload.tags !== undefined) {
    const tags = normalizeTags(payload.tags);
    data.tags = tags.length ? (toJsonArray(tags) as Prisma.InputJsonValue) : [];
  }

  const position = await prisma.jobDictionaryPosition.update({
    where: { id },
    data,
  });

  return mapPosition(position);
};

export const deletePosition = async (id: string) => {
  await prisma.jobDictionaryPosition.delete({
    where: { id },
  });
};
