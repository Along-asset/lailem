# 月嫂公司人员管理（ESA Pages + Edge Functions + KV）

本项目用于帮助月嫂公司管理与展示工作人员信息：访客可查看首页员工卡片列表；管理员登录后可进行增删改查，并支持上传头像图片，提交后首页自动按统一卡片样式与排序规则排版展示。

## 阿里云 ESA Pages 声明

本项目由阿里云ESA提供加速、计算和保护

![阿里云ESA Pages](https://img.alicdn.com/imgextra/i1/O1CN016eN9qK1mzWfLq6xKq_!!6000000005026-0-tps-884-138.jpg)

## 实用性

- 对外：统一展示公司工作人员信息，支持搜索与状态筛选（可接单/档期满）
- 对内：管理员在后台以抽屉表单快速维护人员信息（含图片），提交后自动排版

## 创意性

- 极简高端的深色玻璃质感 UI：留白、低饱和强调色、统一卡片比例
- “一屏完成新增”：必要字段最少化，技能用标签化输入，头像自动压缩后入库

## 技术深度

- 静态前端部署在 ESA Pages，自动构建与全球边缘分发
- 动态能力由 ESA Edge Functions 提供：管理员登录、人员 CRUD API
- 数据使用 ESA KV 存储：边缘就近读写，支持全球同步

## 本地开发

```bash
npm install
npm run dev
```

说明：本地 `npm run dev` 仅用于前端开发。`/api/*` 在本地不会可用，需要部署到 ESA 后由边缘函数提供。

## 部署到 ESA Pages（关键点）

1. 仓库根目录已包含 [esa.jsonc](file:///e:/ESA/lailem/esa.jsonc)，用于配置：
   - 静态资源目录：`./dist`
   - SPA 路由策略：`singlePageApplication`（刷新子路由不 404）
   - 边缘函数入口：`./src/edge/index.js`
2. 在 ESA 控制台创建 KV 命名空间，并设置环境变量：
   - `ESA_KV_NAMESPACE`：KV 命名空间名称（默认使用 `lailem_staff`）
   - `ADMIN_PASSWORD`：管理员口令
   - `TOKEN_SECRET`：Token 签名密钥（请设置为高强度随机值）

## API 简表（由 Edge Functions 提供）

- `GET /api/health`
- `POST /api/admin/login` `{ password } -> { token }`
- `GET /api/staff`
- `POST /api/staff`（管理员）
- `PUT /api/staff/:id`（管理员）
- `DELETE /api/staff/:id`（管理员）
