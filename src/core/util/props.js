/* @flow */

import { warn } from './debug'
import { observe, toggleObserving, shouldObserve } from '../observer/index'
import {
  hasOwn,
  isObject,
  toRawType,
  hyphenate,
  capitalize,
  isPlainObject
} from 'shared/util'

type PropOptions = {
  type: Function | Array<Function> | null,
  default: any,
  required: ?boolean,
  validator: ?Function
};
/**
 * 校验属性
 * @param {string} key 对应属性
 * @param {object} propOptions 属性配置
 * @param {object} propsData 传入组件的属性数据
 * @param {objecy} vm vue实例
 */
export function validateProp (
  key: string,
  propOptions: Object,
  propsData: Object,
  vm?: Component
): any {
  // 获取配置的属性数据
  const prop = propOptions[key]
  // 判断key是否存在于propsData内
  const absent = !hasOwn(propsData, key)
  // 获取传入的值
  let value = propsData[key]
  // boolean casting
  // 获取对应类型的位置
  const booleanIndex = getTypeIndex(Boolean, prop.type)
  //  如果找到boolean类型
  if (booleanIndex > -1) {
    // 如果key不在传入内，并且页也没有设置default属性
    if (absent && !hasOwn(prop, 'default')) {
      value = false // value默认为false
    } else if (value === '' || value === hyphenate(key)) { // 如果为空字符串，或者是一样的名字
      // only cast empty string / same name to boolean if
      // boolean has higher priority
      const stringIndex = getTypeIndex(String, prop.type) // 判断是否有string类型
      if (stringIndex < 0 || booleanIndex < stringIndex) { // 如果没找到string类型
        value = true // value为true
      }
    }
  }
  // check default value
  if (value === undefined) { // 如果value为未定义
    // 如果不存在则获取prop默认值
    value = getPropDefaultValue(vm, prop, key) // 获取prop默认值
    // since the default value is a fresh copy,
    // make sure to observe it.
    // 暂存观察状态
    const prevShouldObserve = shouldObserve
    // 开启观察
    toggleObserving(true)
    // 观察value变化
    observe(value)
    // 切换回之前的状态
    toggleObserving(prevShouldObserve)
  }
  if (
    process.env.NODE_ENV !== 'production' &&
    // skip validation for weex recycle-list child component props
    !(__WEEX__ && isObject(value) && ('@binding' in value))
  ) {
    // 非生产环境则断言校验prop类型
    assertProp(prop, key, value, vm, absent)
  }
  // 返回值
  return value
}

/**
 * Get the default value of a prop.
 * 获取props默认值
 * @param {object} vm 组件实例
 * @param {object} prop 设置的prop对象
 * @param {string} key 属性
 */
function getPropDefaultValue (vm: ?Component, prop: PropOptions, key: string): any {
  // no default, return undefined
  // 如果未设置default属性，则返回undefined
  if (!hasOwn(prop, 'default')) {
    return undefined
  }
  // 获取default
  const def = prop.default
  // warn against non-factory defaults for Object & Array
  // 如果default为object则警告
  if (process.env.NODE_ENV !== 'production' && isObject(def)) {
    warn(
      'Invalid default value for prop "' + key + '": ' +
      'Props with type Object/Array must use a factory function ' +
      'to return the default value.',
      vm
    )
  }
  // the raw prop value was also undefined from previous render,
  // return previous default value to avoid unnecessary watcher trigger
  if (vm && vm.$options.propsData &&
    vm.$options.propsData[key] === undefined &&
    vm._props[key] !== undefined
  ) {
    return vm._props[key]
  }
  // call factory function for non-Function types
  // a value is Function if its prototype is function even across different execution context
  // 如果default为方法，并且type类型不为方法，则调用返回，否则直接返回
  return typeof def === 'function' && getType(prop.type) !== 'Function'
    ? def.call(vm)
    : def
}

/**
 * Assert whether a prop is valid.
 * 断言校验prop类型
 * @param {Object} prop 属性配置
 * @param {string} name 属性键key
 * @param {any} value 属性对应值
 * @param {object} vm vue实例
 * @param {boolean} absent 属性key是否没传递
 */
function assertProp (
  prop: PropOptions,
  name: string,
  value: any,
  vm: ?Component,
  absent: boolean
) {
  // 如果prop为必填,并且没传递则报错警告
  if (prop.required && absent) {
    warn(
      'Missing required prop: "' + name + '"',
      vm
    )
    return
  }
  // 如果值为null并且非必填
  if (value == null && !prop.required) {
    return
  }
  // 获取prop的类型
  let type = prop.type
  // 类型存在时则为false
  let valid = !type || type === true
  const expectedTypes = []
  // 如果类型设置存在
  if (type) {
    // 如果类型非数组类型
    if (!Array.isArray(type)) {
      // 重写类型为数组
      type = [type]
    }
    // 遍历类型数组
    for (let i = 0; i < type.length && !valid; i++) {
      //
      const assertedType = assertType(value, type[i])
      expectedTypes.push(assertedType.expectedType || '')
      valid = assertedType.valid
    }
  }

  if (!valid) {
    warn(
      getInvalidTypeMessage(name, value, expectedTypes),
      vm
    )
    return
  }
  const validator = prop.validator
  if (validator) {
    if (!validator(value)) {
      warn(
        'Invalid prop: custom validator check failed for prop "' + name + '".',
        vm
      )
    }
  }
}
// 基本的类型
const simpleCheckRE = /^(String|Number|Boolean|Function|Symbol)$/
/**
 * 断言类型
 * @param {any} value 值
 * @param {Function} type 类型构造函数
 */
function assertType (value: any, type: Function): {
  valid: boolean;
  expectedType: string;
} {
  let valid
  // 获取类型名
  const expectedType = getType(type)
  // 校验类型是否匹配基本的类型
  if (simpleCheckRE.test(expectedType)) {
    // 获取value的类型
    const t = typeof value
    // 校验判断类型是否相同
    valid = t === expectedType.toLowerCase()
    // for primitive wrapper objects
    // 如果不相同，并且是为object类型,为原始包装对象校验 new Number(123)
    if (!valid && t === 'object') {
      // 重写校验，判断对象类型是否为type的构造器
      valid = value instanceof type
    }
    // 如果类型为Object
  } else if (expectedType === 'Object') {
    // 校验是否为对象
    valid = isPlainObject(value)
    // 如果类型为数组
  } else if (expectedType === 'Array') {
    // 校验是否为数组
    valid = Array.isArray(value)
  } else {
    // 其他情况校验是否instanceof
    valid = value instanceof type
  }
  // 返回校验结果与类型
  return {
    valid,
    expectedType
  }
}

/**
 * Use function string name to check built-in types,
 * because a simple equality check will fail when running
 * across different vms / iframes.
 * 对构造函数使用toString，获取
 */
/**
 * 获取构造器的类型
 * @param {Function} fn 构造器
 */
function getType (fn) {
  // 匹配构造器toString后截取function后的构造器名称
  const match = fn && fn.toString().match(/^\s*function (\w+)/)
  // 匹配成功获取
  return match ? match[1] : ''
}
/**
 * 类型是否相同
 * @param {*} a
 * @param {*} b
 */
function isSameType (a, b) {
  return getType(a) === getType(b)
}
/**
 * 获取类型位置
 * @param {any} type 类型 如Boolean Number, String
 * @param {any} expectedTypes 用户设置的类型
 */
function getTypeIndex (type, expectedTypes): number {
  // 判断type是否非数组
  if (!Array.isArray(expectedTypes)) {
    // 检查两者类型是否相同，相同返回0，不相同返回1
    return isSameType(expectedTypes, type) ? 0 : -1
  }
  // 如果是数组则遍历类型
  for (let i = 0, len = expectedTypes.length; i < len; i++) {
    // 判断类型是否相同，相同则返回对应索引位置
    if (isSameType(expectedTypes[i], type)) {
      return i
    }
  }
  return -1
}

function getInvalidTypeMessage (name, value, expectedTypes) {
  let message = `Invalid prop: type check failed for prop "${name}".` +
    ` Expected ${expectedTypes.map(capitalize).join(', ')}`
  const expectedType = expectedTypes[0]
  const receivedType = toRawType(value)
  const expectedValue = styleValue(value, expectedType)
  const receivedValue = styleValue(value, receivedType)
  // check if we need to specify expected value
  if (expectedTypes.length === 1 &&
      isExplicable(expectedType) &&
      !isBoolean(expectedType, receivedType)) {
    message += ` with value ${expectedValue}`
  }
  message += `, got ${receivedType} `
  // check if we need to specify received value
  if (isExplicable(receivedType)) {
    message += `with value ${receivedValue}.`
  }
  return message
}

function styleValue (value, type) {
  if (type === 'String') {
    return `"${value}"`
  } else if (type === 'Number') {
    return `${Number(value)}`
  } else {
    return `${value}`
  }
}

function isExplicable (value) {
  const explicitTypes = ['string', 'number', 'boolean']
  return explicitTypes.some(elem => value.toLowerCase() === elem)
}

function isBoolean (...args) {
  return args.some(elem => elem.toLowerCase() === 'boolean')
}
