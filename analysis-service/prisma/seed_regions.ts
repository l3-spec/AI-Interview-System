import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const regions = [
    { code: '110000', name: '北京市', level: 1, parentId: null },
    { code: '110100', name: '北京市', level: 2, parentId: '110000' },
    { code: '110101', name: '东城区', level: 3, parentId: '110100' },
    { code: '110102', name: '西城区', level: 3, parentId: '110100' },
    { code: '110105', name: '朝阳区', level: 3, parentId: '110100' },
    { code: '110108', name: '海淀区', level: 3, parentId: '110100' },
    
    { code: '310000', name: '上海市', level: 1, parentId: null },
    { code: '310100', name: '上海市', level: 2, parentId: '310000' },
    { code: '310101', name: '黄浦区', level: 3, parentId: '310100' },
    { code: '310104', name: '徐汇区', level: 3, parentId: '310100' },
    { code: '310105', name: '长宁区', level: 3, parentId: '310100' },
    { code: '310115', name: '浦东新区', level: 3, parentId: '310100' },

    { code: '440000', name: '广东省', level: 1, parentId: null },
    { code: '440100', name: '广州市', level: 2, parentId: '440000' },
    { code: '440106', name: '天河区', level: 3, parentId: '440100' },
    { code: '440105', name: '海珠区', level: 3, parentId: '440100' },
    { code: '440300', name: '深圳市', level: 2, parentId: '440000' },
    { code: '440304', name: '福田区', level: 3, parentId: '440300' },
    { code: '440305', name: '南山区', level: 3, parentId: '440300' },
  ];

  console.log('开始同步地区字典数据...');

  for (const region of regions) {
    // 这里的 parentId 是 code，我们需要找到对应的数据库 ID
    let actualParentId = null;
    if (region.parentId) {
      const parent = await prisma.regionDictionary.findUnique({
        where: { code: region.parentId }
      });
      if (parent) {
        actualParentId = parent.id;
      }
    }

    await prisma.regionDictionary.upsert({
      where: { code: region.code },
      update: {
        name: region.name,
        level: region.level,
        parentId: actualParentId,
      },
      create: {
        code: region.code,
        name: region.name,
        level: region.level,
        parentId: actualParentId,
      },
    });
  }

  console.log('地区字典数据同步完成！');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
