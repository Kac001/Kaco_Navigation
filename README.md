# Kaco Navigation

基于 Next.js 的网址导航站点，带后台管理、SQLite 存储和基础 PWA 支持。

## 本地启动

首次启动如果数据库里还没有管理员账号，必须先提供初始化密码：

```bash
export ADMIN_INITIAL_PASSWORD='please-change-me-now'
export ADMIN_INITIAL_USERNAME='admin'
```

然后启动项目：

```bash
npm install
npm run dev
```

## Docker Compose

```bash
ADMIN_INITIAL_PASSWORD='please-change-me-now' docker compose up --build
```

如果数据库里已经存在管理员账号，后续启动不再依赖这个环境变量。

## 已启用的安全策略

- 不再自动创建固定默认密码的管理员账号
- 登录接口带有基础限流
- 修改密码后会吊销已有管理员会话
- 管理接口要求同源请求
- 后台保存的导航链接仅允许 `http` 和 `https`
