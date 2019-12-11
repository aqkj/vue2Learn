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
 * @param {object} propsData 属性数据
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
  // 获取值
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
    assertProp(prop, key, value, vm, absent)
  }
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
 */
function assertProp (
  prop: PropOptions,
  name: string,
  value: any,
  vm: ?Component,
  absent: boolean
) {
  if (prop.required && absent) {
    warn(
      'Missing required prop: "' + name + '"',
      vm
    )
    return
  }
  if (value == null && !prop.required) {
    return
  }
  let type = prop.type
  let valid = !type || type === true
  const expectedTypes = []
  if (type) {
    if (!Array.isArray(type)) {
      type = [type]
    }
    for (let i = 0; i < type.length && !valid; i++) {
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

const simpleCheckRE = /^(String|Number|Boolean|Function|Symbol)$/

function assertType (value: any, type: Function): {
  valid: boolean;
  expectedType: string;
} {
  let valid
  const expectedType = getType(type)
  if (simpleCheckRE.test(expectedType)) {
    const t = typeof value
    valid = t === expectedType.toLowerCase()
    // for primitive wrapper objects
    if (!valid && t === 'object') {
      valid = value instanceof type
    }
  } else if (expectedType === 'Object') {
    valid = isPlainObject(value)
  } else if (expectedType === 'Array') {
    valid = Array.isArray(value)
  } else {
    valid = value instanceof type
  }
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
function getType (fn) {
  const match = fn && fn.toString().match(/^\s*function (\w+)/)
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
