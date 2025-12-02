import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../lib/prisma';

const MAX_SELECTION = 3;

export interface UserJobPreferencePosition {
  id: string;
  code: string;
  name: string;
  categoryId: string | null;
  categoryName: string | null;
  sortOrder: number;
}

export interface UserJobPreferenceResult {
  positions: UserJobPreferencePosition[];
}

type PreferenceModel = {
  id: string;
  sortOrder: number;
  position: {
    id: string;
    code: string;
    name: string;
    category?: {
      id: string;
      name: string;
    } | null;
  } | null;
};

const mapPreference = (preference: PreferenceModel): UserJobPreferencePosition | null => {
  if (!preference.position) {
    return null;
  }
  const category = preference.position.category ?? null;
  return {
    id: preference.position.id,
    code: preference.position.code,
    name: preference.position.name,
    categoryId: category?.id ?? null,
    categoryName: category?.name ?? null,
    sortOrder: preference.sortOrder,
  };
};

const buildResult = (preferences: PreferenceModel[]): UserJobPreferenceResult => {
  const mapped = preferences
    .map((pref) => mapPreference(pref))
    .filter((pref): pref is UserJobPreferencePosition => pref !== null);

  return {
    positions: mapped,
  };
};

type LegacyPreferenceRow = {
  position_id: string;
  position_code: string | null;
  position_name: string | null;
  category_id: string | null;
  category_name: string | null;
  sort_order: number | null;
};

const fetchPreferencesLegacy = async (userId: string): Promise<UserJobPreferenceResult> => {
  try {
    const rows = (await prisma.$queryRaw<LegacyPreferenceRow[]>`
      SELECT
        ujp.position_id,
        jdp.code AS position_code,
        jdp.name AS position_name,
        ujp.sort_order,
        jdc.id AS category_id,
        jdc.name AS category_name
      FROM user_job_preferences AS ujp
      LEFT JOIN job_dictionary_positions AS jdp ON jdp.id = ujp.position_id
      LEFT JOIN job_dictionary_categories AS jdc ON jdc.id = jdp.category_id
      WHERE ujp.user_id = ${userId}
      ORDER BY ujp.sort_order ASC
    `) as LegacyPreferenceRow[];

    const positions: UserJobPreferencePosition[] = rows
      .filter((row: LegacyPreferenceRow) => Boolean(row.position_id) && Boolean(row.position_name))
      .map((row: LegacyPreferenceRow): UserJobPreferencePosition => ({
        id: row.position_id,
        code: row.position_code ?? '',
        name: row.position_name ?? '',
        categoryId: row.category_id ?? null,
        categoryName: row.category_name ?? null,
        sortOrder: row.sort_order ?? 0,
      }));

    return { positions };
  } catch (legacyError) {
    console.error(
      '[jobPreferenceService] Legacy preference fetch failed while falling back to raw SQL:',
      legacyError,
    );
    return { positions: [] };
  }
};

const fetchPreferences = async (userId: string) => {
  try {
    const preferences = await prisma.userJobPreference.findMany({
      where: { userId },
      orderBy: { sortOrder: 'asc' },
      include: {
        position: {
          select: {
            id: true,
            code: true,
            name: true,
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

    return buildResult(preferences as PreferenceModel[]);
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2021') {
        console.warn(
          '[jobPreferenceService] user_job_preferences table is missing, returning empty preferences.',
        );
        return { positions: [] };
      }
      if (error.code === 'P2022') {
        console.warn(
          '[jobPreferenceService] Column mismatch detected, falling back to legacy preference fetch.',
        );
        return fetchPreferencesLegacy(userId);
      }
    }
    throw error;
  }
};

const normalizeIds = (positionIds: string[]): string[] => {
  const seen = new Set<string>();
  const normalized: string[] = [];

  positionIds.forEach((id) => {
    const trimmed = typeof id === 'string' ? id.trim() : '';
    if (trimmed.length === 0) {
      return;
    }
    if (!seen.has(trimmed)) {
      seen.add(trimmed);
      normalized.push(trimmed);
    }
  });

  return normalized;
};

export const getUserJobPreferences = async (userId: string): Promise<UserJobPreferenceResult> => {
  return fetchPreferences(userId);
};

const updateUserJobPreferencesLegacy = async (
  userId: string,
  normalizedIds: string[],
): Promise<UserJobPreferenceResult> => {
  if (normalizedIds.length === 0) {
    await prisma.$executeRaw`
      DELETE FROM user_job_preferences
      WHERE user_id = ${userId}
    `;
    return { positions: [] };
  }

  const positions = await prisma.jobDictionaryPosition.findMany({
    where: {
      id: { in: normalizedIds },
      isActive: true,
    },
    select: {
      id: true,
      code: true,
      name: true,
      category: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (positions.length !== normalizedIds.length) {
    throw new Error('存在无效或已下线的职岗，无法保存');
  }

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.$executeRaw`
      DELETE FROM user_job_preferences
      WHERE user_id = ${userId}
    `;

    for (let index = 0; index < normalizedIds.length; index += 1) {
      const positionId = normalizedIds[index];
      const recordId = uuidv4();
      await tx.$executeRaw`
        INSERT INTO user_job_preferences (id, user_id, position_id, sort_order, created_at, updated_at)
        VALUES (${recordId}, ${userId}, ${positionId}, ${index}, NOW(), NOW())
      `;
    }
  });

  const positionEntries = positions.map(
    (position: (typeof positions)[number]): [string, (typeof positions)[number]] => [
      position.id,
      position,
    ],
  );
  const positionMap = new Map<string, (typeof positions)[number]>(positionEntries);

  const sortedPositions = normalizedIds
    .map((positionId, index) => {
      const position = positionMap.get(positionId);
      if (!position) {
        return null;
      }
      return {
        id: position.id,
        code: position.code,
        name: position.name,
        categoryId: position.category?.id ?? null,
        categoryName: position.category?.name ?? null,
        sortOrder: index,
      };
    })
    .filter((item): item is UserJobPreferencePosition => item !== null);

  return { positions: sortedPositions };
};

export const updateUserJobPreferences = async (
  userId: string,
  positionIds: string[],
): Promise<UserJobPreferenceResult> => {
  const normalizedIds = normalizeIds(positionIds);

  if (normalizedIds.length > MAX_SELECTION) {
    throw new Error(`最多只能选择 ${MAX_SELECTION} 个职岗`);
  }

  try {
    if (normalizedIds.length === 0) {
      await prisma.userJobPreference.deleteMany({
        where: { userId },
      });
      return { positions: [] };
    }

    const validPositions = await prisma.jobDictionaryPosition.findMany({
      where: {
        id: { in: normalizedIds },
        isActive: true,
      },
      select: {
        id: true,
        code: true,
        name: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (validPositions.length !== normalizedIds.length) {
      throw new Error('存在无效或已下线的职岗，无法保存');
    }

    const operations: Prisma.PrismaPromise<unknown>[] = [
      prisma.userJobPreference.deleteMany({ where: { userId } }),
    ];

    const createData = normalizedIds.map((id, index) => ({
      userId,
      positionId: id,
      sortOrder: index,
    }));

    if (createData.length > 0) {
      operations.push(
        prisma.userJobPreference.createMany({
          data: createData,
        }),
      );
    }

    await prisma.$transaction(operations);

    const positionEntries = validPositions.map(
      (position: (typeof validPositions)[number]): [string, (typeof validPositions)[number]] => [
        position.id,
        position,
      ],
    );
    const positionMap = new Map<string, (typeof validPositions)[number]>(positionEntries);

    const sortedPositions = normalizedIds
      .map((positionId, index) => {
        const position = positionMap.get(positionId);
        if (!position) {
          return null;
        }
        return {
          id: position.id,
          code: position.code,
          name: position.name,
          categoryId: position.category?.id ?? null,
          categoryName: position.category?.name ?? null,
          sortOrder: index,
        };
      })
      .filter((item): item is UserJobPreferencePosition => item !== null);

    return { positions: sortedPositions };
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2021') {
        console.error(
          '[jobPreferenceService] Failed to update preferences because table user_job_preferences is missing.',
        );
        throw new Error('意向职岗功能尚未初始化，请联系管理员执行数据库迁移后再试');
      }
      if (error.code === 'P2022') {
        console.warn(
          '[jobPreferenceService] Column mismatch detected while updating preferences, falling back to legacy SQL operations.',
        );
        return updateUserJobPreferencesLegacy(userId, normalizedIds);
      }
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2028') {
      console.warn(
        '[jobPreferenceService] Transaction timeout detected, retrying with legacy SQL operations.',
      );
      return updateUserJobPreferencesLegacy(userId, normalizedIds);
    }
    throw error;
  }
};
