/**
 * Copyright (c) 2018, Neap Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/

const { fetch } = require('../utils')
const { transpileSchema, bigQueryResultToJson } = require('./format')

// BigQuery Jobs APIs doc: https://cloud.google.com/bigquery/docs/reference/rest/v2/jobs/insert

const BIGQUERY_JOBS_URL = projectId => `https://www.googleapis.com/bigquery/v2/projects/${encodeURIComponent(projectId)}/jobs`
const BIGQUERY_JOB_URL = (projectId, locationId, jobId) => `${BIGQUERY_JOBS_URL(projectId)}/${encodeURIComponent(jobId)}?location=${encodeURIComponent(locationId)}`
const BIGQUERY_QUERY_URL = projectId => `https://www.googleapis.com/bigquery/v2/projects/${encodeURIComponent(projectId)}/queries`
const BIGQUERY_DB_URL = (projectId,dbName) => `https://www.googleapis.com/bigquery/v2/projects/${encodeURIComponent(projectId)}/datasets${dbName ? `/${encodeURIComponent(dbName)}` : '' }`
const BIGQUERY_TABLE_URL = (projectId,dbName,tableName) => `${BIGQUERY_DB_URL(projectId,dbName)}/tables${tableName ? `/${encodeURIComponent(tableName)}` : ''}`

const _validateRequiredParams = (params={}) => Object.keys(params).forEach(p => {
	if (!params[p])
		throw new Error(`Parameter '${p}' is required.`)
})

const _dealWithError = (res, projectId) => {
	if (res && res.data.status && res.data.status.errorResult && res.data.status.errorResult.message && res.data.status.errorResult.message.toLowerCase().indexOf('access denied: file') >= 0) {
		const storages = res.data.status.errorResult.message.toLowerCase().replace('access denied: file ', '').replace(': access denied', '')
		throw new Error(`Access denied. You don't have enough permissions to access the storage location ${storages}. Please make sure the Agent using the BigQuery api in project ${projectId} has the following roles: storage.objectAdmin, bigquery.admin`)
	}
	return res
}

const _validQueryTypes = { 'number': 'INTEGER', 'float': 'FLOAT', 'boolean': 'BOOLEAN', 'string': 'STRING', 'timestamp': 'TIMESTAMP' }
const _supportedTypes = Object.keys(_validQueryTypes)
/**
 * [description]
 * @param  {[type]} projectId 				[description]
 * @param  {[type]} 	location  				[description]
 * @param  {[type]} 	query     				[description]
 * @param  {Object} 	params    				[description]
 * @param  {[type]} 	token     				[description]
 * @param  {Number} 	options.pageSize   		Default 1000
 * @param  {Number} 	options.timeout   		Default 10000 ms
 * @param  {Boolean} 	options.useLegacySql   	Default false
 * @return {[type]}           					[description]
 */
const execute = (projectId, location, query, params={}, token, options={}) => Promise.resolve(null).then(() => {
	_validateRequiredParams({ projectId, query ,token })
	const queryParameters = Object.keys(params).reduce((acc,key) => {
		const val = params[key]
		let v = `${val}`
		let t = val instanceof Date ? 'timestamp' : typeof(val)
		if (t == 'string') {
			const dd = new Date(val)
			const d = dd.toString().toLowerCase()
			if (d != 'invalid date') {
				t = 'timestamp'
				v = dd.toISOString()
			}
		} else if (t == 'timestamp')
			v = val.toISOString()
		else if (t == 'number') {
			if ((Math.round(val) - val) != 0) {
				t = 'float'
			}
		}

		const valType = _validQueryTypes[t]
		if (!valType)
			throw new Error(`Invalid param '${key}'. Type ${t} is not supported. Supported types are: ${_supportedTypes}`)
		else {
			acc.push({ name: key, parameterType: { type: valType }, parameterValue: { value: v } })
		}
		return acc
	}, [])
	const payload = {
		query,
		maxResults: options.pageSize || 1000,
		timeoutMs: options.timeout || 10000,
		useLegacySql: options.useLegacySql == undefined ? false : options.useLegacySql,
		parameterMode: 'NAMED',
		queryParameters: queryParameters,
		location
	}

	return fetch.post(BIGQUERY_QUERY_URL(projectId), {
		'Content-Type': 'application/json',
		Authorization: `Bearer ${token}`
	}, JSON.stringify(payload)).then(({ status, data }) => ({ status, data: bigQueryResultToJson(data) }))
})

/**
 * [description]
 * @param  {[type]} 	projectId 				[description]
 * @param  {[type]} 	db        				[description]
 * @param  {[type]} 	table     				[description]
 * @param  {Array}  	values    				[description]
 * @param  {[type]} 	token     				[description]
 * @param  {Boolean} 	options.templateSuffix  [description]
 * @param  {Boolean} 	options.skipInvalidRows [description]
 * 
 * @return {[type]}           [description]
 */
const insertData = (projectId, db, table, values=[], token, options={}) => Promise.resolve(null).then(() => {
	_validateRequiredParams({ projectId, db, table, token })
	if (!values.some(x => x))
		return { status: 200, data: 'No data inserted as no data were passed.' }

	const rows = values.map(v => ({ json: v }))
	let payload = {
		ignoreUnknownValues: true,
		rows
	}

	if (options.templateSuffix)
		payload.templateSuffix = options.templateSuffix

	if (options.skipInvalidRows !== undefined)
		payload.skipInvalidRows = options.skipInvalidRows

	return fetch.post(`${BIGQUERY_TABLE_URL(projectId,db,table)}/insertAll`, {
		'Content-Type': 'application/json',
		Authorization: `Bearer ${token}`
	}, JSON.stringify(payload))
})

const getTable = (projectId, db, table, token, options={}) => Promise.resolve(null).then(() => {
	_validateRequiredParams({ projectId, db, table, token })

	return fetch.get(BIGQUERY_TABLE_URL(projectId,db,table), {
		'Content-Type': 'application/json',
		Authorization: `Bearer ${token}`
	}, options)
})

const getDb = (projectId, db, token, options={}) => Promise.resolve(null).then(() => {
	_validateRequiredParams({ projectId, db, token })

	return fetch.get(BIGQUERY_DB_URL(projectId,db), {
		'Content-Type': 'application/json',
		Authorization: `Bearer ${token}`
	}, options)
})

// doc: https://cloud.google.com/bigquery/docs/reference/rest/v2/jobs#configuration.load
const loadData = (projectId, db, table, sources=[], token) => Promise.resolve(null).then(() => {
	_validateRequiredParams({ projectId, db, table, sources, sourcesLength: sources.length ,token })
	const content = JSON.stringify({
		configuration:{
			load: {
				autodetect: true,
				destinationTable: {
					projectId,
					datasetId: db,
					tableId: table
				},
				schemaUpdateOptions: ['ALLOW_FIELD_ADDITION', 'ALLOW_FIELD_RELAXATION'],
				skipInvalidRows: true,
				ignoreUnknownValues: true,
				maxBadRecords: 10000,
				allowJaggedRows: true,
				writeDisposition: 'WRITE_APPEND', 				
				sourceFormat: 'NEWLINE_DELIMITED_JSON',
				sourceUris: sources.map(s => `gs://${s}`)
			}
		}
	})
	return fetch.post(BIGQUERY_JOBS_URL(projectId), {
		'Content-Type': 'application/json',
		Authorization: `Bearer ${token}`
	}, content)
}).then(res => _dealWithError(res, projectId))

const createTableFromStorage = (projectId, db, table, sources=[], token) => Promise.resolve(null).then(() => {
	_validateRequiredParams({ projectId, db, table, sources, sourcesLength: sources.length ,token })
	const content = JSON.stringify({
		configuration:{
			load: {
				autodetect: true,
				destinationTable: {
					projectId,
					datasetId: db,
					tableId: table
				},
				schemaUpdateOptions: ['ALLOW_FIELD_ADDITION'],
				writeDisposition: 'WRITE_APPEND', // 
				ignoreUnknownValues: false,
				maxBadRecords: 10000,
				sourceFormat: 'NEWLINE_DELIMITED_JSON',
				sourceUris: sources.map(s => `gs://${s}`)
			}
		}
	}, null, ' ')
	return fetch.post(BIGQUERY_JOBS_URL(projectId), {
		'Content-Type': 'application/json',
		Authorization: `Bearer ${token}`
	}, content)
}).then(res => _dealWithError(res, projectId))

const createTable = (projectId, db, table, schema={}, token) => Promise.resolve(null).then(() => {
	_validateRequiredParams({ projectId, db, table, token })
	const payload = {
		tableReference: {
			datasetId: db,
			projectId,
			tableId: table
		},
		schema: transpileSchema(schema)
	}
	return fetch.post(BIGQUERY_TABLE_URL(projectId,db), {
		'Content-Type': 'application/json',
		Authorization: `Bearer ${token}`
	}, JSON.stringify(payload))
})

const getJob = (projectId, locationId, jobId, token) => fetch.get(
	BIGQUERY_JOB_URL(projectId, locationId, jobId), {
		'Content-Type': 'application/json',
		Authorization: `Bearer ${token}`
	})

module.exports = {
	db: {
		'get': getDb
	},
	table: {
		'get': getTable,
		create: createTable,
		createFromStorage: createTableFromStorage,
		loadData: loadData,
		insert: insertData
	},
	job: {
		'get': getJob
	},
	query: {
		execute
	}
}



