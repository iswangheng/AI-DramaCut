# Excel 导入功能 - 快速参考

## 🚀 快速开始

### 1. 后端 API

```bash
# 导入标记数据
POST /api/hangzhou-leiming/markings/import
FormData:
  - file: Excel 文件
  - projectId: 项目 ID
```

### 2. 示例文件下载

```bash
# 下载示例 Excel
GET /api/hangzhou-leiming/markings/example

# 或使用脚本生成
npx tsx scripts/generate-excel-template.ts
```

### 3. 前端组件

```tsx
import { ExcelImporter } from "@/components/excel-importer";

<ExcelImporter
  projectId={123}
  onImportComplete={() => console.log("完成！")}
/>
```

---

## 📋 Excel 格式

### 必需列

| 列名 | 格式 | 示例 |
|------|------|------|
| 集数 | 第N集 | 第1集 |
| 时间点 | MM:SS 或 HH:MM:SS | 00:35 |
| 标记类型 | 高光点 或 钩子点 | 高光点 |

### 可选列

| 列名 | 格式 | 示例 |
|------|------|------|
| 描述 | 文本 | 高能冲突 |

---

## 🧪 测试

```bash
# 运行单元测试
npm test

# 运行集成测试脚本
./scripts/test-excel-import.sh

# 手动测试
# 1. 启动服务器
npm run dev

# 2. 访问训练中心
# http://localhost:3000/hangzhou-leiming/1/training

# 3. 点击"下载示例 Excel 文件"
# 4. 编辑 Excel 文件
# 5. 点击"导入标记数据"并选择文件
# 6. 查看导入结果
```

---

## 📁 文件位置

```
/app/api/hangzhou-leiming/markings/
  ├── import/route.ts          # 导入 API
  └── example/route.ts         # 示例下载

/components/
  └── excel-importer.tsx       # 导入组件

/scripts/
  ├── generate-excel-template.ts  # 生成示例
  └── test-excel-import.sh        # 测试脚本

/tests/
  └── excel-import.test.ts     # 单元测试

/public/examples/
  ├── hangzhou-leiming-template.xlsx
  └── hangzhou-leiming-template.csv

/docs/
  └── EXCEL-IMPORT-GUIDE.md    # 完整文档
```

---

## ✅ 验收标准

- ✅ 支持 .xlsx, .xls, .csv 格式
- ✅ 时间点格式验证
- ✅ 标记类型验证
- ✅ 视频存在性检查
- ✅ 批量导入
- ✅ 错误提示
- ✅ 进度显示
- ✅ 示例文件下载
- ✅ 单元测试通过
- ✅ TypeScript 类型完整

---

**快速支持**: 查看完整文档 `docs/EXCEL-IMPORT-GUIDE.md`
