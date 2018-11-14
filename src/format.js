/**
 * Copyright (c) 2018, Neap Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/

const NULL_TIMESTAMP = '1970-01-01T00:00:00.000Z'
const NULL_FLOAT = 5e-16
const NULL_INT = -1
const NULL_STRING = 'NULL'

/**
 * Remove all properties of an object that represent numbers. This is required before addind data to BigQuery
 * as BigQuery does not support number fields.
 * 
 * @param  {Object} obj e.g., { "123": { hello: "world" } }
 * @return {Object}     e.g., { "#123": { hello: "world" } }
 */
const cleanData = (obj) => {
	if (!obj || obj instanceof Date || typeof(obj) != 'object')
		return obj 

	if (Array.isArray(obj))
		return obj.map(cleanData)

	const keys = Object.keys(obj)
	if (keys.length == 0)
		return obj 

	return keys.reduce((acc,key) => {
		const v = obj[key]
		const newVal = cleanData(v)
		const newKey = /^[0-9]*\.{0,1}[0-9]+$/.test(key) ? `#${key}` : key
		acc[newKey] = newVal
		return acc
	}, {})
}

const _stringify = (v,options={}) => options.mode == 'exact' ? `string:${v}` : `${v}`

const _convertValToTimestamp = (fieldType, fieldIsDate, fieldValue, options={}) => {
	const { mode } = options
	const exactMode = mode == 'exact'
	if (fieldType == 'string' || fieldType == 'number') {
		const d = new Date(fieldValue)
		if (d.toString().toLowerCase() == 'invalid date')
			return exactMode ? NULL_TIMESTAMP : null
		else
			return d.toISOString()
	} else if (fieldIsDate) 
		return fieldValue.toISOString()
	else
		return exactMode ? NULL_TIMESTAMP : null
}

const _convertFieldToFloat = (fieldType, fieldIsArray, fieldIsDate, fieldIsObject, fieldValue, options={}) => {
	const { mode } = options
	const exactMode = mode == 'exact'

	if (fieldIsDate)
		return exactMode ? fieldValue.getTime() + NULL_FLOAT : fieldValue.getTime()
	else if (fieldIsArray || fieldIsObject)
		return exactMode ? NULL_FLOAT : null
	else if (fieldType == 'string') {
		const isNumber = /^[0-9]*\.{0,1}[0-9]+$/.test(fieldValue)
		if (isNumber) {
			const n = fieldValue * 1
			if (n - Math.round(n))
				return n
			else
				return exactMode ? n + NULL_FLOAT : null
		}
	} else if (fieldType == 'number') {
		if ((fieldValue - Math.round(fieldValue)) || !exactMode)
			return fieldValue
		else
			return fieldValue + NULL_FLOAT
	} else if (fieldType == 'boolean') {
		if (exactMode) 
			return fieldValue ? 1+NULL_FLOAT : NULL_FLOAT
		else 
			return fieldValue ? 1 : 0
	}else
		return exactMode ? NULL_FLOAT : null
}

const _allowedSchemaTypes = { 'string': true, 'integer': true, 'boolean': true, 'object': true, 'timestamp': true, 'float': true }
const fitToSchema = (obj={}, schema={}, options={}) => {
	const { mode } = options
	const exactMode = mode == 'exact'
	const nullString = exactMode ? NULL_STRING : ''
	const keys = Object.keys(schema)
	if (keys.length == 0)
		return {}
	
	const newObj = keys.reduce((acc,key) => {
		const v = obj[key]
		if (!exactMode && v === undefined)
			return acc
		const schemaType = schema[key]
		let sType
		const schemaTypeIsArray = Array.isArray(schemaType)
		const schemaTypeIsObject = typeof(schemaType) == 'object'
		if (schemaTypeIsArray) {
			if (!schemaType[0])
				throw new Error(`Invalid type. Field '${key}' is an array of empty type (ref. #01).`)

			const t = typeof(schemaType[0]) == 'object' ? 'object' : schemaType[0]
			sType = `${t}`.toLowerCase()
			if (!_allowedSchemaTypes[sType])
				throw new Error(`Field '${key}' uses an unsupported type ${sType}. Only allowed types are: ${Object.keys(_allowedSchemaTypes)} (ref. #02)`)

			sType = `array-${sType}`
		} else {
			sType = schemaTypeIsObject ? 'object' : `${schemaType}`.toLowerCase()
			if (!_allowedSchemaTypes[sType])
				throw new Error(`Field '${key}' uses an unsupported type ${sType}. Only allowed types are: ${Object.keys(_allowedSchemaTypes)} (ref. #03)`)
		}

		const fieldType = typeof(v)
		const fieldIsArray = Array.isArray(v)
		const fieldIsDate = v instanceof Date
		const fieldIsObject = fieldType == 'object'

		if (!v) {
			if (!exactMode) {
				if (v === 0) {
					if (sType == 'string')
						acc[key] = '0'
					else if (sType == 'boolean')
						acc[key] = false
					else if (sType == 'integer' || sType == 'float')
						acc[key] = 0
					else 
						acc[key] = null
				} else if (v === '') {
					if (sType == 'string')
						acc[key] = ''
					else if (sType == 'boolean')
						acc[key] = false
					else 
						acc[key] = null
				} else if (v === false) {
					if (sType == 'boolean')
						acc[key] = false
					else 
						acc[key] = null
				} else
					acc[key] = null

				return acc
			}
			if (sType == 'string') 
				acc[key] = _stringify(nullString,options)
			else if (sType == 'integer') 
				acc[key] = v === 0 ? 0 : NULL_INT
			else if (sType == 'float') 
				acc[key] = NULL_FLOAT
			else if (sType == 'boolean') 
				acc[key] = false
			else if (sType == 'timestamp') 
				acc[key] = NULL_TIMESTAMP
			else if (schemaTypeIsArray) {
				const schemaArrayType = schemaType[0]
				if (sType == 'array-string')
					acc[key] = [_stringify(nullString,options)]
				else if (sType == 'array-integer')
					acc[key] = [NULL_INT]
				else if (sType == 'array-boolean')
					acc[key] = [false]
				else if (sType == 'array-timestamp')
					acc[key] = [NULL_TIMESTAMP]
				else if (sType == 'array-float')
					acc[key] = [NULL_FLOAT]
				else if (sType == 'array-object')
					acc[key] = [fitToSchema({}, schemaArrayType, { mode, isNull: true })]
				else
					throw new Error(`Field '${key}' uses an unsupported type ${sType} (ref. #04).`)
			} else if (sType == 'object') 
				acc[key] = fitToSchema({}, schemaType, { mode, isNull: true })
			else
				throw new Error(`Field '${key}' uses an unsupported type ${sType} (ref. #05).`)
		}
		else if (v){
			if (sType == 'string') {
				const newVal = 
					fieldIsDate ? _stringify(v.toISOString(),options) : 
						fieldIsObject ? 'Object' : _stringify(v,options)
				acc[key] = newVal
			} else if (sType == 'integer') {
				const newVal = 
					fieldType == 'string' && /^[0-9]*\.{0,1}[0-9]+$/.test(v) ? Math.round(v*1) : 
						fieldType == 'boolean' ? (v ? 1 : 0) :
							fieldIsDate ? v.getTime() : 
								fieldType == 'number' ? Math.round(v) : 
									exactMode ?	NULL_INT : null

				acc[key] = newVal
			} else if (sType == 'float') {
				acc[key] = _convertFieldToFloat(fieldType, fieldIsArray, fieldIsDate, fieldIsObject, v, options)
			}else if (sType == 'boolean') {
				const newVal = 
					fieldType == 'string' ? (v ? true : false) : 
						fieldType == 'number' ? (v ? true : false) : 
							fieldIsArray || fieldIsObject || fieldIsDate ? true : false

				acc[key] = newVal
			} else if (sType == 'timestamp') {
				acc[key] = _convertValToTimestamp(fieldType, fieldIsDate, v, options)
			} else if (schemaTypeIsArray) {
				const schemaArrayType = schemaType[0]
				const newVal = 
					fieldType == 'string' && sType == 'array-string' ? [_stringify(v,options)] : 
						fieldType == 'string' && sType == 'array-integer' ? (/^[0-9]*\.{0,1}[0-9]+$/.test(v) ? [Math.round(v*1)] : [NULL_INT]) :  
							fieldType == 'string' && sType == 'array-float' ? [_convertFieldToFloat(fieldType, fieldIsArray, fieldIsDate, fieldIsObject, v, options)] :  
								fieldType == 'string' && sType == 'array-boolean' ? [true] : 
									fieldType == 'string' && sType == 'array-object' ? [fitToSchema({}, schemaArrayType, { mode, isNull: true })] : 
										fieldType == 'string' && sType == 'array-timestamp' ? [_convertValToTimestamp(fieldType, fieldIsDate, v, options)] : 
											fieldType == 'number' && sType == 'array-string' ? [_stringify(v,options)] : 
												fieldType == 'number' && sType == 'array-integer' ? [Math.round(v)] :  
													fieldType == 'number' && sType == 'array-float' ? [_convertFieldToFloat(fieldType, fieldIsArray, fieldIsDate, fieldIsObject, v, options)] :  
														fieldType == 'number' && sType == 'array-boolean' ? (v ? [true] : [false]) : 
															fieldType == 'number' && sType == 'array-object' ? [fitToSchema({}, schemaArrayType, { mode, isNull: true })] : 
																fieldType == 'number' && sType == 'array-timestamp' ? [_convertValToTimestamp(fieldType, fieldIsDate, v, options)] : 
																	fieldType == 'boolean' && sType == 'array-string' ? (v ? [_stringify('true',options)] : [_stringify('false',options)]) : 
																		fieldType == 'boolean' && sType == 'array-integer' ? (v ? [1] : [0]) :  
																			fieldType == 'boolean' && sType == 'array-float' ? [_convertFieldToFloat(fieldType, fieldIsArray, fieldIsDate, fieldIsObject, v, options)] :  
																				fieldType == 'boolean' && sType == 'array-boolean' ? (v ? [true] : [false]) : 
																					fieldType == 'boolean' && sType == 'array-object' ? [fitToSchema({}, schemaArrayType, { mode, isNull: true })] : 
																						fieldType == 'boolean' && sType == 'array-timestamp' ? [_convertValToTimestamp(fieldType, fieldIsDate, v, options)] : 
																							fieldIsDate && sType == 'array-string' ? [_stringify(v.toISOString(),options)] : 
																								fieldIsDate && sType == 'array-integer' ? [v.getTime()] :  
																									fieldIsDate && sType == 'array-float' ? [_convertFieldToFloat(fieldType, fieldIsArray, fieldIsDate, fieldIsObject, v, options)] :  
																										fieldIsDate && sType == 'array-boolean' ? [true] : 
																											fieldIsDate && sType == 'array-object' ? [fitToSchema({}, schemaArrayType, { mode, isNull: true })] : 
																												fieldIsDate && sType == 'array-timestamp' ? [_convertValToTimestamp(fieldType, fieldIsDate, v, options)] : 
																													fieldIsArray ? _getNewArrayVal(v,sType,schemaArrayType,key,options) : 
																														fieldType == 'object' && sType == 'array-string' ? [_stringify(nullString,options)] : 
																															fieldType == 'object' && sType == 'array-integer' ? [NULL_INT] :  
																																fieldType == 'object' && sType == 'array-float' ? [_convertFieldToFloat(fieldType, fieldIsArray, fieldIsDate, fieldIsObject, v, options)] :  
																																	fieldType == 'object' && sType == 'array-boolean' ? [false] : 
																																		fieldType == 'object' && sType == 'array-object' ? [fitToSchema(v, schemaArrayType, { mode, isNull: false })] : 
																																			fieldType == 'object' && sType == 'array-timestamp' ? [_convertValToTimestamp(fieldType, fieldIsDate, v, options)] : null 

				if (!newVal)
					throw new Error(`Field '${key}' uses an unsupported type ${sType} (ref. #06).`)

				acc[key] = newVal
			} else if (sType == 'object') {
				const newVal = !fieldIsArray && fieldIsObject ? v : {}
				const opts = Object.keys(newVal).some(x => x) ? { mode, isNull: false } : { mode, isNull: true }
				acc[key] = fitToSchema(newVal, schemaType, opts)
			}
			else
				throw new Error(`Field '${key}' uses an unsupported type ${sType} (ref. #07).`)
		}

		return acc
	}, options.isNull === undefined || !exactMode ? {} : { _isNull: options.isNull ? true : false })
	
	if (Object.keys(newObj).some(x => x))
		return newObj
	else
		return null
}

const _getNewArrayVal = (arrayVal=[], sType, schemaType, key, options={}) => {
	const { mode } = options
	const nullString = mode == 'exact' ? NULL_STRING : ''
	const a = arrayVal.some(x => x) ? arrayVal : [_stringify(nullString,options)]
	return a.map(x => {
		const v = 
			!x && typeof(x) == 'string' ? nullString : 
				!x && typeof(x) == 'number' ? 0 : 
					!x ? nullString : x

		const fieldType = typeof(v)
		const fieldIsDate = v instanceof Date

		const newVal = 
			fieldType == 'string' && sType == 'array-string' ? _stringify(v,options) : 
				fieldType == 'string' && sType == 'array-integer' ? (/^[0-9]*\.{0,1}[0-9]+$/.test(v) ? (Math.round(v*1)) : NULL_INT) :  
					fieldType == 'string' && sType == 'array-float' ? _convertFieldToFloat(fieldType, false, fieldIsDate, false, v, options) :  
						fieldType == 'string' && sType == 'array-boolean' ? true : 
							fieldType == 'string' && sType == 'array-object' ? fitToSchema({}, schemaType, { mode, isNull: true }) : 
								fieldType == 'string' && sType == 'array-timestamp' ? _convertValToTimestamp(fieldType, fieldIsDate, v, options) : 
									fieldType == 'number' && sType == 'array-string' ? _stringify(v,options) : 
										fieldType == 'number' && sType == 'array-integer' ? Math.round(v) :  
											fieldType == 'number' && sType == 'array-float' ? _convertFieldToFloat(fieldType, false, fieldIsDate, false, v, options) :  
												fieldType == 'number' && sType == 'array-boolean' ? (v ? true : false) : 
													fieldType == 'number' && sType == 'array-object' ? fitToSchema({}, schemaType, { mode, isNull: true }) : 
														fieldType == 'number' && sType == 'array-timestamp' ? _convertValToTimestamp(fieldType, fieldIsDate, v, options) : 
															fieldType == 'boolean' && sType == 'array-string' ? (v ? _stringify('true',options) : _stringify('false',options)) : 
																fieldType == 'boolean' && sType == 'array-integer' ? (v ? 1 : 0) :  
																	fieldType == 'boolean' && sType == 'array-float' ? _convertFieldToFloat(fieldType, false, fieldIsDate, false, v, options) :  
																		fieldType == 'boolean' && sType == 'array-boolean' ? (v ? true : false) : 
																			fieldType == 'boolean' && sType == 'array-object' ? fitToSchema({}, schemaType, { mode, isNull: true }) : 
																				fieldType == 'boolean' && sType == 'array-timestamp' ? _convertValToTimestamp(fieldType, fieldIsDate, v, options) : 
																					fieldIsDate && sType == 'array-string' ? _stringify(v.toISOString(),options) : 
																						fieldIsDate && sType == 'array-integer' ? v.getTime() :  
																							fieldIsDate && sType == 'array-float' ? _convertFieldToFloat(fieldType, false, fieldIsDate, false, v, options) :  
																								fieldIsDate && sType == 'array-boolean' ? true : 
																									fieldIsDate && sType == 'array-object' ? fitToSchema({}, schemaType, { mode, isNull: true }) : 
																										fieldIsDate && sType == 'array-timestamp' ? _convertValToTimestamp(fieldType, fieldIsDate, v, options) : 
																											fieldType == 'object' && sType == 'array-string' ? _stringify(nullString,options) : 
																												fieldType == 'object' && sType == 'array-integer' ? NULL_INT :  
																													fieldType == 'object' && sType == 'array-float' ? _convertFieldToFloat(fieldType, false, fieldIsDate, false, v, options) : 
																														fieldType == 'object' && sType == 'array-boolean' ? false : 
																															fieldType == 'object' && sType == 'array-object' ? fitToSchema(v, schemaType, { mode, isNull: false }) : 
																																fieldType == 'object' && sType == 'array-timestamp' ? _convertValToTimestamp(fieldType, fieldIsDate, v, options) : null 

		if (mode == 'exact' && !newVal) 
			throw new Error(`Field '${key}' uses an unsupported type ${sType} (ref. #08).`)

		return newVal
	})
}

const _primitiveTypes = { 'number': 'INTEGER', 'integer': 'INTEGER', 'float': 'FLOAT', 'timestamp': 'TIMESTAMP', 'boolean': 'BOOLEAN', 'string': 'STRING' }
const transpileSchema = (schema={}) => {
	const keys = Object.keys(schema)
	if (!keys.some(x => x))
		return { fields:[] }

	return keys.reduce((acc,name) => {
		const v = schema[name]
		const mode = Array.isArray(v) ? 'REPEATED' : 'NULLABLE'
		let type = _primitiveTypes[`${v}`.toLowerCase()]
		let fields
		if (!type) {
			if (mode == 'NULLABLE' && typeof(v) != 'object')
				throw new Error(`Invalid schema type. Field '${name}' is using the unsupported type '${v}'`)

			if (mode == 'NULLABLE') {
				type = 'RECORD'
				fields = transpileSchema(v).fields
			} else {
				const arg = v[0]
				type = _primitiveTypes[`${v}`.toLowerCase()]
				if (!type) {
					if (typeof(arg) != 'object')
						throw new Error(`Invalid schema type. Field '${name}' is using the unsupported type '[${v}]'`)
					type = 'RECORD'
					fields = transpileSchema(arg).fields
				}
			}
		}
		let field = { name, type, mode }
		if (fields)
			field.fields = fields
		acc.fields.push(field)
		return acc
	}, { fields:[] })
}

const bigQueryResultToJson = (data={}) => {
	if (data && data.schema && data.schema.fields && data.rows) {
		const schema = data.schema.fields.map(({ name, type, fields }) => {
			if (type == 'INTEGER' || type == 'DECIMAL' || type == 'FLOAT')
				return { name, convert: x => x * 1 }
			else if (type == 'BOOLEAN')
				return { name, convert: x => x == null ? null : x && x.toLowerCase() === 'true' ? true : false }
			else if (type == 'TIMESTAMP' || type == 'DATETIME')
				return { name, convert: x => {
					if (!x) 
						return null 
					const t = `${x}`
					if (/^[0-9]*\.{0,1}[0-9]*[eE]{0,1}[0-9]+$/.test(t))
						return /[eE]/.test(t) ? new Date(t*1000) : new Date(t)
					else
						return new Date(t)
				}}
			else if (type == 'RECORD') 
				return { name, convert: x => bigQueryResultToJson({ schema: { fields }, rows: [x]  })[0] }
			else
				return { name, convert: x => x }
		})

		return data.rows.map(({ f }) => schema.reduce((acc, { name, convert }, idx) => {
			const v = f[idx].v
			if (Array.isArray(v))
				acc[name] = v.map(x => convert(x.v))
			else
				acc[name] = convert(v)
			return acc 
		}, {}))
	} else
		return []
}

module.exports = {
	cleanData,
	fitToSchema,
	transpileSchema,
	bigQueryResultToJson
}