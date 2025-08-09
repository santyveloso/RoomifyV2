declare module "ioredis" {
  class Redis {
    constructor(options?: Record<string, unknown>);
    [key: string]: unknown;
  }
  export default Redis;
}