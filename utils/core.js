/**
 * Copyright (c) 2018, Neap Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/

const shortid = require('shortid')

const newId = (options={}) => {
	const id = shortid.generate().replace(/-/g, 'r').replace(/_/g, '9')
	return options.short ? id.slice(0,-4) : id

}

const getDateUtc = (date) => {
	const now_utc =  Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds())
	return new Date(now_utc)
}

const addZero = nbr => ('0' + nbr).slice(-2)

const getTimestamp = (options={ short:true }) => {
	const d = getDateUtc(new Date())
	const main = `${d.getUTCFullYear()}${addZero(d.getUTCMonth()+1)}${addZero(d.getUTCDate())}`
	if (options.short)
		return main
	else 
		return `${main}-${addZero(d.getUTCHours())}${addZero(d.getUTCMinutes())}${addZero(d.getUTCSeconds())}`
}

const _objectSortBy = (obj, fn = x => x, dir='asc') => Object.keys(obj || {})
	.map(key => ({ key, value: obj[key] }))
	.sort((a,b) => {
		const vA = fn(a.value)
		const vB = fn(b.value)
		if (dir == 'asc') {
			if (vA < vB)
				return -1
			else if (vA > vB)
				return 1
			else
				return 0
		} else {
			if (vA > vB)
				return -1
			else if (vA < vB)
				return 1
			else
				return 0
		}
	}).reduce((acc,v) => {
		acc[v.key] = v.value
		return acc
	}, {})

const _arraySortBy = (arr, fn = x => x, dir='asc') => (arr || []).sort((a,b) => {
	const vA = fn(a)
	const vB = fn(b)
	if (dir == 'asc') {
		if (vA < vB)
			return -1
		else if (vA > vB)
			return 1
		else
			return 0
	} else {
		if (vA > vB)
			return -1
		else if (vA < vB)
			return 1
		else
			return 0
	}
})

const sortBy = (obj, fn = x => x, dir='asc') => Array.isArray(obj) ? _arraySortBy(obj, fn, dir) : _objectSortBy(obj, fn, dir)
const newSeed = (size=0) => Array.apply(null, Array(size))
const mergeObj = (...objs) => objs.reduce((acc, obj) => { //Object.assign(...objs.map(obj => JSON.parse(JSON.stringify(obj))))
	obj = obj || {}
	if (typeof(obj) != 'object' || Array.isArray(obj))
		throw new Error('Invalid argument exception. Merging objects only support object arguments. No arrays, primitive types, or non-truthy entities are allowed.')

	Object.keys(obj).forEach(property => {
		const val = obj[property]
		const originVal = acc[property]
		const readyToMerge = !originVal || !val || typeof(val) != 'object' || Array.isArray(val) || typeof(originVal) != 'object' || Array.isArray(originVal)
		acc[property] = readyToMerge ? val : mergeObj(originVal, val)	
	})

	return acc
}, {})

const isEmptyObj = obj => {
	if (!obj)
		return true 
	try {
		const o = JSON.stringify(obj)
		return o == '{}'
	} catch(e) {
		return (() => false)(e)
	}
}

const isObj = obj => {
	if (!obj || typeof(obj) != 'object' || Array.isArray(obj) || (obj instanceof Date))
		return false 

	try {
		const o = JSON.stringify(obj) || ''
		return o.match(/^\{(.*?)\}$/)
	} catch(e) {
		return (() => false)(e)
	}
}

const getDiff = (orig={}, current={}) => {
	return Object.keys(current).reduce((acc, key) => {
		const val = current[key]
		const origVal = orig[key]
		if (val == undefined || origVal == val) 
			return acc
		
		const origValIsObj = isObj(origVal)

		if (!origValIsObj && origVal != val) {
			acc[key] = val
			return acc
		} 

		const valIsObj = isObj(val)

		if (origValIsObj && valIsObj) {
			const objDiff = getDiff(origVal, val)
			if (!isEmptyObj(objDiff))
				acc[key] = objDiff
			return acc
		}

		if (origVal != val) {
			acc[key] = val
			return acc
		} 
		return acc
	}, {})
}

/**
 * [description]
 * @param  {Object} o_1     			That can be anything, incl. primitive type
 * @param  {Object} o_2     			That can be anything, incl. primitive type
 * @param  {Object} options.throwError 	Default false. If set to true, a failed test throws an exception with the details.
 * @return {Boolean}         			Whether or not the test passes
 */
const objAreSame = (o_1, o_2, options={}) => {
	const failed = msg => {
		if (options.throwError)
			throw new Error(msg)
		else
			return false
	}
	if (o_1 === o_2)
		return true
	
	if (o_1 === null || o_1 === undefined)
		return failed('The first object is non-truthy while the second is truthy')

	if (o_2 === null || o_2 === undefined)
		return failed('The second object is non-truthy while the first is truthy')
	
	const o_1_type = o_1 instanceof Date ? 'date' : Array.isArray(o_1) ? 'array' : typeof(o_1)
	const o_2_type = o_2 instanceof Date ? 'date' : Array.isArray(o_2) ? 'array' : typeof(o_2)

	if (o_1_type != o_2_type)
		return failed(`Object types do not match (${o_1_type} != ${o_2_type})`)

	if (o_1_type == 'date')
		return o_1.toString() == o_2.toString() ? true : failed(`Dates don't match (${o_1} != ${o_2})`)

	if (o_1_type == 'object') {
		const o_1_keys = Object.keys(o_1)
		const o_2_keys = Object.keys(o_2)
		if (o_1_keys.length > o_2_keys.length) {
			const additionalKey = o_1_keys.find(key => !o_2_keys.some(k => k == key))
			return failed(`Property '${additionalKey}' in the first object does not exit in the second`)
		}

		if (o_1_keys.length < o_2_keys.length) {
			const additionalKey = o_2_keys.find(key => !o_1_keys.some(k => k == key))
			return failed(`Property '${additionalKey}' in the second object does not exit in the first`)
		}

		const additionalKey = o_2_keys.find(key => !o_1_keys.some(k => k == key))
		if (additionalKey)
			return failed(`Property '${additionalKey}' in the second object does not exit in the first`)

		return o_1_keys.reduce((isSame, key) => {
			if (!isSame)
				return isSame
			const o_1_val = o_1[key]
			const o_2_val = o_2[key]
			try {
				return objAreSame(o_1_val, o_2_val, { throwError: true })
			} catch(err) {
				return failed(`Differences in property '${key}': ${err.message}`)
			}
		}, true)
	}
	
	if (o_1_type == 'array') {
		if (o_1.length != o_2.length) {
			return failed('Arrays don\'t have the same amount of items')
		}

		return o_1.reduce((isSame, obj_1) => {
			if (!isSame)
				return isSame
			return o_2.some(obj_2 => objAreSame(obj_1, obj_2)) ? true : failed(`No objects in the second array can match object ${JSON.stringify(obj_1, null, ' ')}`)
		}, true)
	}

	return failed(`Those 2 objects are not equal: ${o_1}, ${o_2}`) 
}

const mergeCollection = (...collections) => {
	if (collections.length == 0)
		return []

	const lengths = collections.filter(col => col && col.length).map(col => col.length)
	if (lengths.length == 0)
		return collections
	
	const maxLength = Math.max(...collections.filter(col => col && col.length).map(col => col.length))

	return collections.map(col => {
		const l = (col || []).length
		if (l == 0) {
			return newSeed(maxLength)
		}
		if (l == maxLength)
			return col 

		const diff = maxLength - l
		return [...col, ...newSeed(diff)]
	})
}

/**
 * Breaks down an array in a collection of array of size 'batchSize'.
 * 
 * @param  {Array}  col       Initial collection (e.g. [1,2,3,4,5])
 * @param  {Number} batchSize Size of each batch (e.g. 2)
 * @return {Array}           collection of array of size 'batchSize' (e.g. [[1,2], [3,4], [5]]).
 */
const batch = (col, batchSize=1) => {
	const l = (col || []).length-1
	return l < 0 ? [] : col.reduce((acc,item,idx) => {
		acc.current.value.push(item)
		acc.current.size++
		if (acc.current.size == batchSize || idx == l) {
			acc.result.push(acc.current.value)
			acc.current = { value:[], size:0 }
		}
		return acc
	},{ result:[], current: { value:[], size:0 } }).result
}

const getRandomNumber = (start, end) => {
	const size = end == undefined ? start : (end - start)
	const offset = end == undefined ? 0 : start
	return offset + Math.floor(Math.random() * size)
}

module.exports = {
	identity: {
		'new': newId
	},
	date: {
		timestamp: getTimestamp
	},
	collection: {
		batch,
		sortBy,
		seed: newSeed,
		merge: mergeCollection
	},
	obj: {
		merge: mergeObj,
		isEmpty: isEmptyObj,
		isObj,
		diff: getDiff,
		same: objAreSame
	},
	math: {
		randomNumber: getRandomNumber
	}
}