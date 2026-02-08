# 数据库迁移记录

## 2026-02-08 Schema 更新

### queue_jobs 表新增字段

**问题**: 旧数据库缺少 P0 错误处理机制所需的字段

**修复**:


**验证**:
```bash
sqlite3 data/dramagen.db "PRAGMA table_info(queue_jobs);"
# 应该显示 progress(12), checkpoint(13), retry_count(14)
```

**迁移文件**: drizzle/0000_careless_silver_samurai.sql

