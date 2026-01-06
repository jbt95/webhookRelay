export default {
  schema: './packages/db/src/schema.ts',
  out: './apps/api/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: 'file:./.wrangler/tmp/local-d1.sqlite',
  },
  verbose: true,
  strict: true,
};
