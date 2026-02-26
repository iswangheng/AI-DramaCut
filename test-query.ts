import { db } from './lib/db/client';
import { schema } from './lib/db/schema';
import { eq } from 'drizzle-orm';

async function test() {
  try {
    const videos = await db
      .select()
      .from(schema.videos)
      .where(eq(schema.videos.projectId, 2))
      .orderBy(schema.videos.sortOrder);
    
    console.log('✅ 查询成功，找到', videos.length, '个视频');
    process.exit(0);
  } catch (error) {
    console.error('❌ 查询失败:', error);
    process.exit(1);
  }
}

test();
