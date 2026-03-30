/**
 * Fiber Network RPC Client — SDK Layer
 * 
 * 此文件作为向后兼容入口，所有实现已迁移到 fiber/ 目录下的模块中。
 * 
 * 模块结构：
 * - fiber/config.ts    - 节点配置
 * - fiber/rpc.ts       - RPC 调用封装
 * - fiber/index.ts     - 统一导出入口
 */

// 从 fiber 模块重新导出所有内容
export * from './fiber/index';
