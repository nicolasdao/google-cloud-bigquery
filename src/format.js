/**
 * Copyright (c) 2018, Neap Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/

const NULL_TIMESTAMP = '1970-01-01T00:00:00.000Z'

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
		const newKey = /^[0-9]+$/.test(key) ? `#${key}` : key
		acc[newKey] = newVal
		return acc
	}, {})
}

const _stringify = v => `string:${v}`

const _convertValToTimestamp = (fieldType, fieldIsDate, fieldValue) => {
	if (fieldType == 'string' || fieldType == 'number') {
		const d = new Date(fieldValue)
		if (d.toString().toLowerCase() == 'invalid date')
			return NULL_TIMESTAMP
		else
			return d.toISOString()
	} else if (fieldIsDate) 
		return fieldValue.toISOString()
	else
		return NULL_TIMESTAMP
}

const _allowedSchemaTypes = { 'string': true, 'number': true, 'boolean': true, 'object': true, 'timestamp': true }
const fitToSchema = (obj={}, schema={}, options={}) => {
	const keys = Object.keys(schema)
	if (keys.length == 0)
		return {}
	
	return keys.reduce((acc,key) => {
		const v = obj[key]
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

		if ((v || v === 0 || v === '' || v === false) && fieldType == sType && !fieldIsArray && !fieldIsDate && !fieldIsObject)
			acc[key] = v === '' ? _stringify('NULL') : sType == 'string' ? _stringify(v) : v
		else if (!v) {
			if (sType == 'string') 
				acc[key] = _stringify('NULL')
			else if (sType == 'number') 
				acc[key] = -1
			else if (sType == 'boolean') 
				acc[key] = false
			else if (sType == 'timestamp') 
				acc[key] = NULL_TIMESTAMP
			else if (schemaTypeIsArray) {
				const schemaArrayType = schemaType[0]
				if (sType == 'array-string')
					acc[key] = [_stringify('NULL')]
				else if (sType == 'array-number')
					acc[key] = [-1]
				else if (sType == 'array-boolean')
					acc[key] = [false]
				else if (sType == 'array-object')
					acc[key] = [fitToSchema({}, schemaArrayType, { isNull: true })]
				else
					throw new Error(`Field '${key}' uses an unsupported type ${sType} (ref. #04).`)
			} else if (sType == 'object') 
				acc[key] = fitToSchema({}, schemaType, { isNull: true })
			else
				throw new Error(`Field '${key}' uses an unsupported type ${sType} (ref. #05).`)
		}
		else {
			if (sType == 'string') {
				const newVal = 
					fieldIsDate ? _stringify(v.toISOString()) : 
						fieldIsObject ? 'Object' : _stringify(v)
				acc[key] = newVal
			} else if (sType == 'number') {
				const newVal = 
					fieldType == 'string' && /^[0-9]+$/.test(v) ? v*1 : 
						fieldType == 'boolean' ? (v ? 1 : 0) :
							fieldIsDate ? v.getTime() : -1

				acc[key] = newVal
			} else if (sType == 'boolean') {
				const newVal = 
					fieldType == 'string' ? (v ? true : false) : 
						fieldType == 'number' ? (v ? true : false) : 
							fieldIsArray || fieldIsObject || fieldIsDate ? true : false

				acc[key] = newVal
			} else if (sType == 'timestamp') {
				acc[key] = _convertValToTimestamp(fieldType, fieldIsDate, v)
			} else if (schemaTypeIsArray) {
				const schemaArrayType = schemaType[0]
				const newVal = 
					fieldType == 'string' && sType == 'array-string' ? [_stringify(v)] : 
						fieldType == 'string' && sType == 'array-number' ? (/^[0-9]+$/.test(v) ? [v*1] : [-1]) :  
							fieldType == 'string' && sType == 'array-boolean' ? [true] : 
								fieldType == 'string' && sType == 'array-object' ? [fitToSchema({}, schemaArrayType, { isNull: true })] : 
									fieldType == 'string' && sType == 'array-timestamp' ? [_convertValToTimestamp(fieldType, fieldIsDate, v)] : 
										fieldType == 'number' && sType == 'array-string' ? [_stringify(v)] : 
											fieldType == 'number' && sType == 'array-number' ? [v] :  
												fieldType == 'number' && sType == 'array-boolean' ? (v ? [true] : [false]) : 
													fieldType == 'number' && sType == 'array-object' ? [fitToSchema({}, schemaArrayType, { isNull: true })] : 
														fieldType == 'number' && sType == 'array-timestamp' ? [_convertValToTimestamp(fieldType, fieldIsDate, v)] : 
															fieldType == 'boolean' && sType == 'array-string' ? (v ? [_stringify('true')] : [_stringify('false')]) : 
																fieldType == 'boolean' && sType == 'array-number' ? (v ? [1] : [0]) :  
																	fieldType == 'boolean' && sType == 'array-boolean' ? (v ? [true] : [false]) : 
																		fieldType == 'boolean' && sType == 'array-object' ? [fitToSchema({}, schemaArrayType, { isNull: true })] : 
																			fieldType == 'boolean' && sType == 'array-timestamp' ? [_convertValToTimestamp(fieldType, fieldIsDate, v)] : 
																				fieldIsDate && sType == 'array-string' ? [_stringify(v.toISOString())] : 
																					fieldIsDate && sType == 'array-number' ? [v.getTime()] :  
																						fieldIsDate && sType == 'array-boolean' ? [true] : 
																							fieldIsDate && sType == 'array-object' ? [fitToSchema({}, schemaArrayType, { isNull: true })] : 
																								fieldIsDate && sType == 'array-timestamp' ? [_convertValToTimestamp(fieldType, fieldIsDate, v)] : 
																									fieldIsArray ? _getNewArrayVal(v,sType,schemaArrayType,key) : 
																										fieldType == 'object' && sType == 'array-string' ? [_stringify('NULL')] : 
																											fieldType == 'object' && sType == 'array-number' ? [-1] :  
																												fieldType == 'object' && sType == 'array-boolean' ? [false] : 
																													fieldType == 'object' && sType == 'array-object' ? [fitToSchema(v, schemaArrayType, { isNull: false })] : 
																														fieldType == 'object' && sType == 'array-timestamp' ? [_convertValToTimestamp(fieldType, fieldIsDate, v)] : null 

				if (!newVal)
					throw new Error(`Field '${key}' uses an unsupported type ${sType} (ref. #06).`)

				acc[key] = newVal
			} else if (sType == 'object') {
				const newVal = !fieldIsArray && fieldIsObject ? v : {}
				const opts = Object.keys(newVal).some(x => x) ? { isNull: false } : { isNull: true }
				acc[key] = fitToSchema(newVal, schemaType, opts)
			}
			else
				throw new Error(`Field '${key}' uses an unsupported type ${sType} (ref. #07).`)
		}

		return acc
	}, options.isNull === undefined ? {} : { _isNull: options.isNull ? true : false })
}

const _getNewArrayVal = (arrayVal=[], sType, schemaType, key) => {
	const a = arrayVal.some(x => x) ? arrayVal : [_stringify('NULL')]
	return a.map(x => {
		const v = 
			!x && typeof(x) == 'string' ? _stringify('NULL') : 
				!x && typeof(x) == 'number' ? 0 : 
					!x ? _stringify('NULL') : x

		const fieldType = typeof(v)
		const fieldIsDate = v instanceof Date

		const newVal = 
			fieldType == 'string' && sType == 'array-string' ? _stringify(v) : 
				fieldType == 'string' && sType == 'array-number' ? (/^[0-9]+$/.test(v) ? (v*1) : -1) :  
					fieldType == 'string' && sType == 'array-boolean' ? true : 
						fieldType == 'string' && sType == 'array-object' ? fitToSchema({}, schemaType, { isNull: true }) : 
							fieldType == 'string' && sType == 'array-timestamp' ? _convertValToTimestamp(fieldType, fieldIsDate, v) : 
								fieldType == 'number' && sType == 'array-string' ? _stringify(v) : 
									fieldType == 'number' && sType == 'array-number' ? v :  
										fieldType == 'number' && sType == 'array-boolean' ? (v ? true : false) : 
											fieldType == 'number' && sType == 'array-object' ? fitToSchema({}, schemaType, { isNull: true }) : 
												fieldType == 'number' && sType == 'array-timestamp' ? _convertValToTimestamp(fieldType, fieldIsDate, v) : 
													fieldType == 'boolean' && sType == 'array-string' ? (v ? _stringify('true') : _stringify('false')) : 
														fieldType == 'boolean' && sType == 'array-number' ? (v ? 1 : 0) :  
															fieldType == 'boolean' && sType == 'array-boolean' ? (v ? true : false) : 
																fieldType == 'boolean' && sType == 'array-object' ? fitToSchema({}, schemaType, { isNull: true }) : 
																	fieldType == 'boolean' && sType == 'array-timestamp' ? _convertValToTimestamp(fieldType, fieldIsDate, v) : 
																		fieldIsDate && sType == 'array-string' ? _stringify(v.toISOString()) : 
																			fieldIsDate && sType == 'array-number' ? v.getTime() :  
																				fieldIsDate && sType == 'array-boolean' ? true : 
																					fieldIsDate && sType == 'array-object' ? fitToSchema({}, schemaType, { isNull: true }) : 
																						fieldIsDate && sType == 'array-timestamp' ? _convertValToTimestamp(fieldType, fieldIsDate, v) : 
																							fieldType == 'object' && sType == 'array-string' ? _stringify('NULL') : 
																								fieldType == 'object' && sType == 'array-number' ? -1 :  
																									fieldType == 'object' && sType == 'array-boolean' ? false : 
																										fieldType == 'object' && sType == 'array-object' ? fitToSchema(v, schemaType, { isNull: false }) : 
																											fieldType == 'object' && sType == 'array-timestamp' ? _convertValToTimestamp(fieldType, fieldIsDate, v) : null 

		if (!newVal)
			throw new Error(`Field '${key}' uses an unsupported type ${sType} (ref. #08).`)

		return newVal
	})
}

module.exports = {
	cleanData,
	fitToSchema
}