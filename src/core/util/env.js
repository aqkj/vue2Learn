/* @flow */

// can we use __proto__?
export const hasProto = '__proto__' in {}

// Browser environment sniffing
/** 判断是否在浏览器环境，判断window对象是否存在 */
export const inBrowser = typeof window !== 'undefined'
/** 判断是否在weex环境 */
export const inWeex = typeof WXEnvironment !== 'undefined' && !!WXEnvironment.platform
/** 获取weex环境 */
export const weexPlatform = inWeex && WXEnvironment.platform.toLowerCase()
/** 获取userAgent用户浏览器操作系统等 */
export const UA = inBrowser && window.navigator.userAgent.toLowerCase()
/** 判断是否在ie浏览器 */
export const isIE = UA && /msie|trident/.test(UA)
/** 判断是否在ie9浏览器 */
export const isIE9 = UA && UA.indexOf('msie 9.0') > 0
/** 判断是否在edge浏览器 */
export const isEdge = UA && UA.indexOf('edge/') > 0
/** 判断是否是安卓环境 */
export const isAndroid = (UA && UA.indexOf('android') > 0) || (weexPlatform === 'android')
/** 判断是否是ios环境 */
export const isIOS = (UA && /iphone|ipad|ipod|ios/.test(UA)) || (weexPlatform === 'ios')
/** 判断是否是chrome环境 */
export const isChrome = UA && /chrome\/\d+/.test(UA) && !isEdge
/** 判断是否是是爬虫 */
export const isPhantomJS = UA && /phantomjs/.test(UA)
/** 判断是否是火狐 */
export const isFF = UA && UA.match(/firefox\/(\d+)/)

// Firefox has a "watch" function on Object.prototype...
/** 火狐object原型自带watch方法 */
export const nativeWatch = ({}).watch

export let supportsPassive = false
// 判断是否在浏览器环境
if (inBrowser) {
  try {
    // 声明空对象
    const opts = {}
    // 定义属性get
    Object.defineProperty(opts, 'passive', ({
      get () {
        /* istanbul ignore next */
        supportsPassive = true
      }
    }: Object)) // https://github.com/facebook/flow/issues/285
    // 添加事件监听
    window.addEventListener('test-passive', null, opts)
  } catch (e) {}
}

// this needs to be lazy-evaled because vue may be required before
// vue-server-renderer can set VUE_ENV
/** 判断是否是服务器 */
let _isServer
/**
 * 判断是否是服务器渲染
 */
export const isServerRendering = () => {
  // 判断是否为服务器
  if (_isServer === undefined) {
    /* istanbul ignore if */
    // 判断是否非浏览器并且非weex并且非node环境
    if (!inBrowser && !inWeex && typeof global !== 'undefined') {
      // detect presence of vue-server-renderer and avoid
      // Webpack shimming the process
      // 获取process进程对象，判断vue环境是否为服务器环境
      _isServer = global['process'] && global['process'].env.VUE_ENV === 'server'
    } else {
      _isServer = false
    }
  }
  return _isServer
}

// detect devtools
/**
 * 如果是浏览器环境则获取devtoolsglobalhook
 */
export const devtools = inBrowser && window.__VUE_DEVTOOLS_GLOBAL_HOOK__

/* istanbul ignore next */
/** 判断是否是原生方法 */
export function isNative (Ctor: any): boolean {
  // 判断是否为方法，原生方法toString会有nativecode字样
  return typeof Ctor === 'function' && /native code/.test(Ctor.toString())
}
/** 判断是否有Symbol */
export const hasSymbol =
  typeof Symbol !== 'undefined' && isNative(Symbol) &&
  typeof Reflect !== 'undefined' && isNative(Reflect.ownKeys)
// 存储set对象
let _Set
/* istanbul ignore if */ // $flow-disable-line
// 判断set对象是否存在，并且是否为原生方法
if (typeof Set !== 'undefined' && isNative(Set)) {
  // use native Set when available.
  // 使用原生set
  _Set = Set
} else {
  // a non-standard Set polyfill that only works with primitive keys.
  // 否则polyfill兼容
  _Set = class Set implements SimpleSet {
    // set属性
    set: Object;
    constructor () {
      // 创建空对象
      this.set = Object.create(null)
    }
    has (key: string | number) {
      // 设置值
      return this.set[key] === true
    }
    add (key: string | number) {
      // 设置值
      this.set[key] = true
    }
    clear () {
      // 清除
      this.set = Object.create(null)
    }
  }
}
/** set实现接口 */
export interface SimpleSet {
  has(key: string | number): boolean;
  add(key: string | number): mixed;
  clear(): void;
}
/** 导出set */
export { _Set }
