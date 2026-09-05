**Coding Agent 八荣八耻**

以暗猜接口为耻，以认真查阅为荣
以模糊执行为耻，以寻求确认为荣
以盲想业务为耻，以人类确认为荣
以创造接口为耻，以复用现有为荣
以跳过验证为耻，以主动测试为荣
以破坏架构为耻，以遵循规范为荣
以假装理解为耻，以诚实无知为菜
以盲目修改为耻，以谨慎重构为荣

---

Gavity 是一个基于罗伯特议事规则的会议协作工具，维护会议秩序和公平。

技术注意事项：
- 尊重现有架构，不大规模重写，不重复造轮子
- 使用 Bun, Nuxt v4, Drizzle ORM
- UI 沿袭 Nuxt UI 设计原则和风格
- 自动导入已禁用，这是为了给 Agent 足够的上下文，项目禁用了自动导入，必须手动导入如 `import { MeetingStatusMap } from '#shared/utils/mettings'`
- 虽然一些 skills 建议写大 composables，但别信，应用 utils 而不是 composables
- 用工具而不是终端读写文件
- 用 `bun dev` 运行开发服务器，访问 `https://gavity.localhost` 查看效果
- 执行 ESLint 永远带上 `--fix`，无法自动修复的应手动修复
- `createError({ statusCode: 404, statusMessage: 'foo' })` 已被废弃，改用 `createError({ status: 404, message: 'foo' })`
- 后端禁止使用 `return new Response(..., { status })` 抛出错误，改用 `throw createError(...)`
- 后端所有路径参数、查询参数、JSON 请求体都必须通过 `getValidated...(ev, Foo.parse)` 或 `readValidatedBody` 方法先验证后读取，schema 定义在顶层
- 禁止创建 `migrations` 的子目录或修改 `migrations/*/snapshot.json`，应使用 `bun run db:generate --name <name>`
- 不必每修改一个文件就 typecheck + eslint，在最后统一执行即可
- Redis 库的用法与你知识库中的不同，一旦出现类型错误，必定是用法错误，禁止使用 `as`
