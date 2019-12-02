/* @flow */

import {
  no,
  noop,
  identity
} from 'shared/util'

import { LIFECYCLE_HOOKS } from 'shared/constants'

export type Config = {
  // user
  optionMergeStrategies: { [key: string]: Function };
  silent: boolean;
  productionTip: boolean;
  performance: boolean;
  devtools: boolean;
  errorHandler: ?(err: Error, vm: Component, info: string) => void;
  warnHandler: ?(msg: string, vm: Component, trace: string) => void;
  ignoredElements: Array<string | RegExp>;
  keyCodes: { [key: string]: number | Array<number> };

  // platform
  isReservedTag: (x?: string) => boolean;
  isReservedAttr: (x?: string) => boolean;
  parsePlatformTagName: (x: string) => string;
  isUnknownElement: (x?: string) => boolean;
  getTagNamespace: (x?: string) => string | void;
  mustUseProp: (tag: string, type: ?string, name: string) => boolean;

  // private
  async: boolean;

  // legacy
  _lifecycleHooks: Array<string>;
};

export default ({
  /**
   * Option merge strategies (used in core/util/options)
   */
  // $flow-disable-line
  optionMergeStrategies: Object.create(null),

  /**
   * Whether to suppress warnings.
   */
  silent: false,

  /**
   * Show production mode tip message on boot?
   * 显示生产模式tip
   */
  productionTip: process.env.NODE_ENV !== 'production',

  /**
   * Whether to enable devtools
   * 是否开启devtools
   */
  devtools: process.env.NODE_ENV !== 'production',

  /**
   * Whether to record perf
   * 是否记录性能
   */
  performance: false,

  /**
   * Error handler for watcher errors
   * 观察错误的错误处理
   */
  errorHandler: null,

  /**
   * Warn handler for watcher warns
   * 观察警告的警告处理
   */
  warnHandler: null,

  /**
   * Ignore certain custom elements
   * 忽略某些自定义元素
   */
  ignoredElements: [],

  /**
   * Custom user key aliases for v-on
   * 自定义用户v-onkey别名
   */
  // $flow-disable-line
  keyCodes: Object.create(null),

  /**
   * Check if a tag is reserved so that it cannot be registered as a
   * component. This is platform-dependent and may be overwritten.
   * 检查是否为保留标签
   */
  isReservedTag: no,

  /**
   * Check if an attribute is reserved so that it cannot be used as a component
   * prop. This is platform-dependent and may be overwritten.
   * 检查是否为保留元素
   */
  isReservedAttr: no,

  /**
   * Check if a tag is an unknown element.
   * Platform-dependent.
   * 检查是否是未知元素
   */
  isUnknownElement: no,

  /**
   * Get the namespace of an element
   * 获取一个元素的命名空间
   */
  getTagNamespace: noop,

  /**
   * Parse the real tag name for the specific platform.
   * 转换具体平台的真实标签名
   */
  parsePlatformTagName: identity,

  /**
   * Check if an attribute must be bound using property, e.g. value
   * Platform-dependent.
   * 检查是否必须使用属性来绑定属性，例如值
   */
  mustUseProp: no,

  /**
   * Perform updates asynchronously. Intended to be used by Vue Test Utils
   * This will significantly reduce performance if set to false.
   * 是否异步执行更新，如果为false则回降低性能
   */
  async: true,

  /**
   * Exposed for legacy reasons
   * 生命周期钩子
   */
  _lifecycleHooks: LIFECYCLE_HOOKS
}: Config)
