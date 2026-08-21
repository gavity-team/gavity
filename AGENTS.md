Gavity 是一个基于罗伯特议事规则的会议协作工具，维护会议秩序和公平。

技术注意事项：
- 尊重现有架构，不大规模重写，不重复造轮子
- 使用 Bun, Nuxt v4, Drizzle ORM
- 虽然一些 skills 建议写大 composables，但别信，应用 utils 而不是 composables
- 用工具而不是终端读写文件
- 用 `bun dev` 运行开发服务器，访问 `https://gavity.localhost` 查看效果
- 执行 ESLint 总是带上 `--fix` 能减少很多麻烦
- `createError({ statusCode: 404, statusMessage: 'foo' })` 已被废弃，改用 `createError({ status: 404, message: 'foo' })`
- 后端禁止使用 `return new Response(..., { status })` 抛出错误，改用 `throw createError(...)`
- 后端所有路径参数、查询参数、JSON 请求体都必须通过 `getValidated...(ev, Foo.parse)` 或 `readValidatedBody` 方法先验证后读取，schema 定义在顶层
- 为了给 Agent 足够的上下文，项目禁用了自动导入，必须手动导入如 `import { MeetingStatusMap } from '#shared/utils/mettings'`
