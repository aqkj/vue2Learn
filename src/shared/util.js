/* @flow */
/**
 * 空对象
 */
export const emptyObject = Object.freeze({})

// These helpers produce better VM code in JS engines due to their
// explicitness and function inlining.
/**
 * 判断是否为null或者undefined
 * @param {any} v 任意值
 */
export function isUndef (v: any): boolean %checks {
  return v === undefined || v === null
}
/**
 * 判断是否定义
 * @param {any} v 任意值
 */
export function isDef (v: any): boolean %checks {
  return v !== undefined && v !== null
}
/**
 * 判断是否是true
 * @param {boolean}} v 条件
 */
export function isTrue (v: any): boolean %checks {
  return v === true
}
/**
 * 判断是否为false
 * @param {boolean} v 条件
 */
export function isFalse (v: any): boolean %checks {
  return v === false
}

/**
 * 判断是否为原始类型
 * string,number,symbol,boolean
 * Check if value is primitive.
 */
export function isPrimitive (value: any): boolean %checks {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    // $flow-disable-line
    typeof value === 'symbol' ||
    typeof value === 'boolean'
  )
}

/**
 * 判断是否为对象
 * typeof为object并且不为null
 * Quick object check - this is primarily used to tell
 * Objects from primitive values when we know the value
 * is a JSON-compliant type.
 * @param {any} obj 任意值
 */
export function isObject (obj: mixed): boolean %checks {
  return obj !== null && typeof obj === 'object'
}

/**
 * Get the raw type string of a value, e.g., [object Object].
 * toString方法
 */
const _toString = Object.prototype.toString
/**
 * 返回toString的类型[Object 类型]
 * @param {any} value
 */
export function toRawType (value: any): string {
  return _toString.call(value).slice(8, -1)
}

/**
 * Strict object type check. Only returns true
 * for plain JavaScript objects.
 * 判断是否为原始对象非构造器对象
 */
export function isPlainObject (obj: any): boolean {
  return _toString.call(obj) === '[object Object]'
}
/**
 * 判断是否为正则
 * @param {any} v 任意值
 */
export function isRegExp (v: any): boolean {
  return _toString.call(v) === '[object RegExp]'
}

/**
 * Check if val is a valid array index.
 * 检查是否是一个合法的数组槽位
 * @param {any} val 任意值
 */
export function isValidArrayIndex (val: any): boolean {
  const n = parseFloat(String(val))
  return n >= 0 && Math.floor(n) === n && isFinite(val)
}
/**
 * 判断是否为promise
 * @param {any} val 任意值
 */
export function isPromise (val: any): boolean {
  return (
    isDef(val) &&
    typeof val.then === 'function' &&
    typeof val.catch === 'function'
  )
}

/**
 * Convert a value to a string that is actually rendered.
 * 将值转换为字符串
 */
export function toString (val: any): string {
  return val == null
    ? ''
    : Array.isArray(val) || (isPlainObject(val) && val.toString === _toString)
      ? JSON.stringify(val, null, 2)
      : String(val)
}

/**
 * Convert an input value to a number for persistence.
 * If the conversion fails, return original string.
 * 转换为数字
 */
export function toNumber (val: string): number | string {
  const n = parseFloat(val)
  return isNaN(n) ? val : n
}

/**
 * Make a map and return a function for checking if a key
 * is in that map.
 * 创建一个map,检查key是否在map里
 * @param {string} str key字符串,通过","分割
 * @param {boolean} expectsLowerCase 是否需要转换小写
 */
export function makeMap (
  str: string,
  expectsLowerCase?: boolean
): (key: string) => true | void {
  // 创建空对象
  const map = Object.create(null)
  // 通过","分割成数组list
  const list: Array<string> = str.split(',')
  // 遍历list
  for (let i = 0; i < list.length; i++) {
    // 设置map的属性为每一个key,值为true
    map[list[i]] = true
  }
  // 返回通过key判断是否存在的方法
  return expectsLowerCase
    ? val => map[val.toLowerCase()]
    : val => map[val]
}

/**
 * Check if a tag is a built-in tag.
 * 检查是否为内置的标签
 * @param {string} key key
 */
export const isBuiltInTag = makeMap('slot,component', true)

/**
 * Check if an attribute is a reserved attribute.
 * 检查是否为保留属性
 * @param {string} key key
 */
export const isReservedAttribute = makeMap('key,ref,slot,slot-scope,is')

/**
 * Remove an item from an array.
 * 从一个数组中移除
 * @param {Array<any>} arr 数组
 * @param {any}  item 元素
 */
export function remove (arr: Array<any>, item: any): Array<any> | void {
  if (arr.length) {
    const index = arr.indexOf(item)
    if (index > -1) {
      return arr.splice(index, 1)
    }
  }
}

/**
 * Check whether an object has the property.
 * 检查是否是自身的属性
 */
const hasOwnProperty = Object.prototype.hasOwnProperty
export function hasOwn (obj: Object | Array<*>, key: string): boolean {
  return hasOwnProperty.call(obj, key)
}

/**
 * Create a cached version of a pure function.
 * 创建一个缓存方法
 */
export function cached<F: Function> (fn: F): F {
  // 创建缓存空对象
  const cache = Object.create(null)
  // 返回缓存方法
  return (function cachedFn (str: string) {
    //  获取缓存的返回值
    const hit = cache[str]
    // 如果缓存了返回值则返回，否则执行后再缓存其返回值
    return hit || (cache[str] = fn(str))
  }: any)
}

/**
 * Camelize a hyphen-delimited string.
 * 匹配(-字符串)正则
 */
const camelizeRE = /-(\w)/g
/**
 * 将匹配的的转换大些
 */
export const camelize = cached((str: string): string => {
  // 字符串替换
  return str.replace(camelizeRE, (_, c) => c ? c.toUpperCase() : '')
})

/**
 * Capitalize a string.
 * 缓存首字母大些的方法
 */
export const capitalize = cached((str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1)
})

/**
 * Hyphenate a camelCase string.
 * 组件名转换成(-分割)
 */
const hyphenateRE = /\B([A-Z])/g
export const hyphenate = cached((str: string): string => {
  return str.replace(hyphenateRE, '-$1').toLowerCase()
})

/**
 * Simple bind polyfill for environments that do not support it,
 * e.g., PhantomJS 1.x. Technically, we don't need this anymore
 * since native bind is now performant enough in most browsers.
 * But removing it would mean breaking code that was able to run in
 * PhantomJS 1.x, so this must be kept for backward compatibility.
 */

/* istanbul ignore next */
/**
 * 兼容bind写法
 * @param {function} fn 方法
 * @param {object} ctx 上下文
 */
function polyfillBind (fn: Function, ctx: Object): Function {
  // 创建一个方法
  function boundFn (a) {
    // 获取length
    const l = arguments.length
    return l
      ? l > 1
        ? fn.apply(ctx, arguments)
        : fn.call(ctx, a)
      : fn.call(ctx)
  }
  // 获取length
  boundFn._length = fn.length
  // 返回方法
  return boundFn
}
/**
 * 原生bind
 * @param {function} fn 方法
 * @param {object} ctx 上下文
 */
function nativeBind (fn: Function, ctx: Object): Function {
  return fn.bind(ctx)
}
/**
 * 获取bind方法
 * 兼容
 */
export const bind = Function.prototype.bind
  ? nativeBind
  : polyfillBind

/**
 * Convert an Array-like object to a real Array.
 * 类似数组的对象转换成数组
 */
export function toArray (list: any, start?: number): Array<any> {
  start = start || 0
  let i = list.length - start
  const ret: Array<any> = new Array(i)
  while (i--) {
    ret[i] = list[i + start]
  }
  return ret
}

/**
 * Mix properties into target object.
 * 继承
 * @param {object} to to
 * @param {object} from from
 */
export function extend (to: Object, _from: ?Object): Object {
  // 将属性给to
  for (const key in _from) {
    to[key] = _from[key]
  }
  // 返回to
  return to
}

/**
 * Merge an Array of Objects into a single Object.
 * 将数组内的对象合并成一个对象
 * @param {Array<any>} arr 数组
 */
export function toObject (arr: Array<any>): Object {
  const res = {}
  for (let i = 0; i < arr.length; i++) {
    if (arr[i]) {
      extend(res, arr[i])
    }
  }
  return res
}

/* eslint-disable no-unused-vars */

/**
 * Perform no operation.
 * Stubbing args to make Flow happy without leaving useless transpiled code
 * with ...rest (https://flow.org/blog/2017/05/07/Strict-Function-Call-Arity/).
 */
export function noop (a?: any, b?: any, c?: any) {}

/**
 * Always return false.
 */
export const no = (a?: any, b?: any, c?: any) => false

/* eslint-enable no-unused-vars */

/**
 * Return the same value.
 * 返回一样的值
 */
export const identity = (_: any) => _

/**
 * Generate a string containing static keys from compiler modules.
 * 生成获取静态key数组的方法
 */
export function genStaticKeys (modules: Array<ModuleOptions>): string {
  return modules.reduce((keys, m) => {
    return keys.concat(m.staticKeys || [])
  }, []).join(',')
}

/**
 * Check if two values are loosely equal - that is,
 * if they are plain objects, do they have the same shape?
 * 判断两个任意值是否一样
 * @param {any} a 任意值
 * @param {any} b 任意值
 * @returns {boolean} 返回是否一样
 */
export function looseEqual (a: any, b: any): boolean {
  if (a === b) return true
  // 判断是否为object
  const isObjectA = isObject(a)
  const isObjectB = isObject(b)
  // 如果都是object
  if (isObjectA && isObjectB) {
    try {
      // 判断是否是数组对象
      const isArrayA = Array.isArray(a)
      const isArrayB = Array.isArray(b)
      // 如果都是数组对象
      if (isArrayA && isArrayB) {
        // 长度一样的话
        // every遍历递归传入值判断
        return a.length === b.length && a.every((e, i) => {
          // 对比内部值
          return looseEqual(e, b[i])
        })
        // 判断是否是Date对象
      } else if (a instanceof Date && b instanceof Date) {
        // 对比时间戳
        return a.getTime() === b.getTime()
        // 如果是非数组
      } else if (!isArrayA && !isArrayB) {
        // 获取对象的key
        const keysA = Object.keys(a)
        const keysB = Object.keys(b)
        // 判断key的长度是否一样
        // 一样则every遍历值，递归判断值是否一样
        return keysA.length === keysB.length && keysA.every(key => {
          return looseEqual(a[key], b[key])
        })
      } else {
        /* istanbul ignore next */
        // 其他状况则为false
        return false
      }
    } catch (e) {
      /* istanbul ignore next */
      // 其他则为false
      return false
    }
  } else if (!isObjectA && !isObjectB) { // 判断是否非object类型
    return String(a) === String(b) // 转换字符串并且比较
  } else {
    return false // 其他则为false
  }
}

/**
 * Return the first index at which a loosely equal value can be
 * found in the array (if value is a plain object, the array must
 * contain an object of the same shape), or -1 if it is not present.
 * 判断数组内是否存在一样的值
 * @param {Array<any>} arr 数组
 * @param {any} 任意值
 * @returns {number} 返回index位置，未找到则为-1
 */
export function looseIndexOf (arr: Array<mixed>, val: mixed): number {
  for (let i = 0; i < arr.length; i++) {
    if (looseEqual(arr[i], val)) return i
  }
  return -1
}

/**
 * Ensure a function is called only once.
 * 创建调用一次的方法
 */
export function once (fn: Function): Function {
  let called = false
  return function () {
    if (!called) {
      called = true
      fn.apply(this, arguments)
    }
  }
}
