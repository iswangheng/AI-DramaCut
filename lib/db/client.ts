// ============================================
// DramaGen AI 数据库客户端
// 使用 Drizzle ORM + better-sqlite3
// ============================================

import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import { dbConfig } from '../config';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// ============================================
// 数据库连接类
// ============================================

class DatabaseClient {
  private db: ReturnType<typeof drizzle> | null = null;
  private sqlite: Database.Database | null = null;

  /**
   * 初始化数据库连接
   */
  connect() {
    if (this.db) {
      return this.db;
    }

    try {
      // 确保数据库目录存在
      const dbDir = join(process.cwd(), 'data');
      if (!existsSync(dbDir)) {
        mkdirSync(dbDir, { recursive: true });
      }

      // 连接 SQLite 数据库
      const dbPath = join(dbDir, 'dramagen.db');
      console.log(`📦 正在连接数据库: ${dbPath}`);

      this.sqlite = new Database(dbPath);

      // 启用 WAL 模式（提升并发性能）
      this.sqlite.pragma('journal_mode = WAL');

      // 创建 Drizzle 客户端
      this.db = drizzle(this.sqlite, { schema });

      console.log('✅ 数据库连接成功');

      return this.db;
    } catch (error) {
      console.error('❌ 数据库连接失败:', error);
      throw error;
    }
  }

  /**
   * 获取数据库实例
   */
  getDb() {
    if (!this.db) {
      return this.connect();
    }
    return this.db;
  }

  /**
   * 获取原始 SQLite 实例（用于执行原生 SQL）
   */
  getSqlite() {
    if (!this.sqlite) {
      this.connect();
    }
    return this.sqlite;
  }

  /**
   * 关闭数据库连接
   */
  close() {
    if (this.sqlite) {
      this.sqlite.close();
      this.db = null;
      this.sqlite = null;
      console.log('🔌 数据库连接已关闭');
    }
  }

  /**
   * 重置数据库（开发环境专用）
   * ⚠️ 危险操作：会删除所有数据
   */
  async reset() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('生产环境禁止重置数据库');
    }

    const sqlite = this.getSqlite();

    // 删除所有表
    const tables = [
      'recap_segments',
      'recap_tasks',
      'highlights',
      'storylines',
      'shots',
      'queue_jobs',
      'videos',
      'projects',
    ];

    if (!sqlite) {
      throw new Error('SQLite 连接未初始化');
    }

    sqlite.transaction(() => {
      tables.forEach((table) => {
        sqlite!.exec(`DROP TABLE IF EXISTS ${table}`);
      });
    })();

    console.log('🗑️  数据库已重置');

    // 重新创建表
    await this.init();
  }

  /**
   * 初始化数据库表结构
   */
  async init() {
    const sqlite = this.getSqlite();

    if (!sqlite) {
      throw new Error('SQLite 连接未初始化');
    }

    // 创建 projects 表
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'ready',
        progress INTEGER NOT NULL DEFAULT 0,
        current_step TEXT,
        error_message TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    // 创建 videos 表
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS videos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        filename TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        duration_ms INTEGER NOT NULL,
        width INTEGER NOT NULL,
        height INTEGER NOT NULL,
        fps INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'uploading',
        summary TEXT,
        viral_score REAL,
        error_message TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    // 创建 shots 表
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS shots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        video_id INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
        start_ms INTEGER NOT NULL,
        end_ms INTEGER NOT NULL,
        description TEXT NOT NULL,
        emotion TEXT NOT NULL,
        dialogue TEXT,
        characters TEXT,
        viral_score REAL,
        start_frame INTEGER NOT NULL,
        end_frame INTEGER NOT NULL,
        thumbnail_path TEXT,
        semantic_tags TEXT,
        embeddings TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    // 创建 storylines 表
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS storylines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        video_id INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        attraction_score REAL NOT NULL,
        shot_ids TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'other',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    // 创建 highlights 表
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS highlights (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        video_id INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
        start_ms INTEGER NOT NULL,
        end_ms INTEGER,
        duration_ms INTEGER,
        reason TEXT NOT NULL,
        viral_score REAL NOT NULL,
        category TEXT NOT NULL DEFAULT 'other',
        is_confirmed INTEGER NOT NULL DEFAULT 0,
        custom_start_ms INTEGER,
        custom_end_ms INTEGER,
        exported_path TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    // 创建 recap_tasks 表
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS recap_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        storyline_id INTEGER NOT NULL REFERENCES storylines(id) ON DELETE CASCADE,
        style TEXT NOT NULL,
        title TEXT NOT NULL,
        estimated_duration_ms INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        output_path TEXT,
        audio_path TEXT,
        error_message TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    // 创建 recap_segments 表
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS recap_segments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL REFERENCES recap_tasks(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        "order" INTEGER NOT NULL,
        start_ms INTEGER NOT NULL,
        end_ms INTEGER NOT NULL,
        duration_ms INTEGER NOT NULL,
        audio_offset_ms INTEGER NOT NULL,
        word_timestamps TEXT NOT NULL,
        video_cues TEXT,
        matched_shot_id INTEGER,
        is_manually_set INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    // 创建 queue_jobs 表
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS queue_jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id TEXT NOT NULL UNIQUE,
        queue_name TEXT NOT NULL,
        job_type TEXT NOT NULL,
        payload TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'waiting',
        result TEXT,
        error TEXT,
        processed_at INTEGER,
        completed_at INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    // 创建索引
    sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status)`);
    sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_videos_project_id ON videos(project_id)`);
    sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status)`);
    sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_shots_video_id ON shots(video_id)`);
    sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_highlights_video_id ON highlights(video_id)`);
    sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_highlights_is_confirmed ON highlights(is_confirmed)`);
    sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_storylines_video_id ON storylines(video_id)`);
    sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_recap_tasks_storyline_id ON recap_tasks(storyline_id)`);
    sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_recap_segments_task_id ON recap_segments(task_id)`);
    sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_queue_jobs_job_id ON queue_jobs(job_id)`);
    sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_queue_jobs_status ON queue_jobs(status)`);

    console.log('✅ 数据库表结构初始化完成');
  }

  /**
   * 健康检查
   */
  healthCheck(): boolean {
    try {
      const sqlite = this.getSqlite();
      if (!sqlite) {
        return false;
      }
      const result = sqlite.prepare('SELECT 1').get();
      return result !== undefined;
    } catch (error) {
      console.error('❌ 数据库健康检查失败:', error);
      return false;
    }
  }

  /**
   * 获取数据库统计信息
   */
  async getStats() {
    const db = this.getDb();

    const [projectCount, videoCount, shotCount, storylineCount, highlightCount, recapTaskCount] = await Promise.all([
      db.select({ count: schema.projects }).from(schema.projects),
      db.select({ count: schema.videos }).from(schema.videos),
      db.select({ count: schema.shots }).from(schema.shots),
      db.select({ count: schema.storylines }).from(schema.storylines),
      db.select({ count: schema.highlights }).from(schema.highlights),
      db.select({ count: schema.recapTasks }).from(schema.recapTasks),
    ]);

    return {
      projects: projectCount.length,
      videos: videoCount.length,
      shots: shotCount.length,
      storylines: storylineCount.length,
      highlights: highlightCount.length,
      recapTasks: recapTaskCount.length,
    };
  }
}

// ============================================
// 导出单例实例
// ============================================

const dbClient = new DatabaseClient();

// 导出数据库客户端实例
export { dbClient };

// 导出 Drizzle 客户端（懒加载）
// 使用 getter 确保只在访问时才连接数据库
let _db: ReturnType<typeof dbClient.getDb> | null = null;

export const db = new Proxy({} as any, {
  get(target, prop) {
    if (!_db) {
      _db = dbClient.getDb();
    }
    // 使用类型断言解决 TypeScript 索引访问问题
    return (_db as any)[prop];
  },
  set(target, prop, value) {
    if (_db) {
      (_db as any)[prop] = value;
    }
    return true;
  },
});

// 导出 Schema
export * from './schema';

// 导出数据库实例的快捷访问方式
export default db;
