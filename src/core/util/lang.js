/* @flow */

/**
 * unicode letters used for parsing html tags, component names and property paths.
 * using https://www.w3.org/TR/html53/semantics-scripting.html#potentialcustomelementname
 * skipping \u10000-\uEFFFF due to it freezing up PhantomJS
 * 用于解析html标签，组件名称和属性路径的unicode字母。
 */
export const unicodeRegExp = /a-zA-Z\u00B7\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u037D\u037F-\u1FFF\u200C-\u200D\u203F-\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD/

/**
 * Check if a string starts with $ or _
 * 检查字符串开头是否为$或者_
 * @param {string} str 字符串
 * @returns {boolean} 开头是否为$或者_
 */
export function isReserved (str: string): boolean {
  const c = (str + '').charCodeAt(0)
  return c === 0x24 || c === 0x5F
}

/**
 * Define a property.
 * 为对象定义一个属性
 * @param {object} obj 对象
 * @param {string} key 属性
 * @param {any} val 值
 * @param {boolean} enumerable 是否可枚举
 */
export function def (obj: Object, key: string, val: any, enumerable?: boolean) {
  // 定义属性
  Object.defineProperty(obj, key, {
    value: val,
    enumerable: !!enumerable,
    writable: true,
    configurable: true
  })
}

/**
 * Parse simple path.
 * 解析简单路径的正则
 */
const bailRE = new RegExp(`[^${unicodeRegExp.source}.$_\\d]`)
/**
 * 解析简单路径
 * @param {string}} path 路径
 */
export function parsePath (path: string): any {
  // 如果匹配通过则return
  if (bailRE.test(path)) {
    return
  }
  // 分割
  const segments = path.split('.')
  // 返回方法
  return function (obj) {
    for (let i = 0; i < segments.length; i++) {
      if (!obj) return
      obj = obj[segments[i]]
    }
    return obj
  }
}
