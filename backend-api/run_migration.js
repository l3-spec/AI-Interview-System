const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  // 从 DATABASE_URL 解析连接信息
  const dbUrl = process.env.DATABASE_URL || 'mysql://root:zhiyun100@db.s.relinktech.cn:3306/ai_interview_db';
  const urlMatch = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  
  if (!urlMatch) {
    throw new Error('无效的 DATABASE_URL 格式');
  }
  
  const [, user, password, host, port, database] = urlMatch;
  
  console.log(`📡 连接数据库: ${host}:${port}/${database}`);
  
  const connection = await mysql.createConnection({
    host,
    port: parseInt(port),
    user,
    password: decodeURIComponent(password),
    database,
    multipleStatements: true
  });

  try {
    console.log('✅ 已连接到数据库');

    const sql = fs.readFileSync(path.join(__dirname, 'add_new_tables.sql'), 'utf8');
    
    console.log('📝 执行 SQL 脚本...');
    await connection.query(sql);
    
    console.log('✅ 迁移完成！新表已创建');
    console.log('');
    console.log('创建的表：');
    console.log('- assessment_categories (测评分类)');
    console.log('- assessments (测评)');
    console.log('- assessment_questions (测评题目)');
    console.log('- user_assessment_records (用户测评记录)');
    console.log('- user_posts (用户帖子)');
    console.log('- expert_posts (大咖分享)');
    console.log('- promoted_jobs (推广职位)');
    console.log('');
    console.log('✅ 测试数据已插入');
    
  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    if (error.message.includes('already exists')) {
      console.log('ℹ️  表已存在，跳过创建');
    }
  } finally {
    await connection.end();
  }
}

runMigration();

