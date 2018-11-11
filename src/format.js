/**
 * Copyright (c) 2018, Neap Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/

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

module.exports = {
	cleanData
}