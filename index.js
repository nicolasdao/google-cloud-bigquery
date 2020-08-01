/**
 * Copyright (c) 2018, Neap Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/

const googleAuth = require('google-auto-auth')
const bigQuery = require('./src')
const { fitToSchema, fieldsToSchema } = require('./src/format')
const { obj, promise: { retry } } = require('./utils')

const TWO_MB = 2*1024*1024
const TEN_MB = 10*1024*1024
const DEFAULT_MAX_ROW_INSERT = 500

const _getToken = auth => new Promise((onSuccess, onFailure) => auth.getToken((err, token) => err ? onFailure(err) : onSuccess(token)))

const _retryFn = (fn, options={}) => retry(
	fn, 
	() => true, 
	err => ((err || {}).message || '').indexOf('BigQuery streaming insert quotas exceeded') < 0,
	{ ignoreFailure: true, retryInterval: [500, 2000], timeOut: options.timeout || 10000 })

const _throwHttpErrorIfBadStatus = res => Promise.resolve(null).then(() => {
	if (res && res.status && res.status >= 400) {
		const errorMsg = `Failed with error ${res.status}.${res.data ? ` Details:\n${JSON.stringify(res.data, null, ' ')}` : ''}`
		throw new Error(errorMsg)
	}
	return res 
}) 

/**
 * Creates a BigQuery client. 
 * 
 * @param  {String} 	jsonKeyFile    				Path to the service account JSON file.
 * @param  {String} 	credentials.project_id    				
 * @param  {String} 	credentials.client_email    				
 * @param  {String} 	credentials.private_key
 * @param  {String} 	credentials.location_id   				
 * @param  {Function} 	getToken       				Optional. Only used for unit test mocking
 * @return {String}
 */
const createClient = ({ jsonKeyFile, credentials, getToken }) => {
	let { project_id:projectId, location_id, client_email, private_key } = credentials ? credentials : jsonKeyFile ? require(jsonKeyFile) : {}
	
	projectId = projectId || process.env.GOOGLE_CLOUD_BIGQUERY_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT_ID
	location_id = location_id || process.env.GOOGLE_CLOUD_BIGQUERY_LOCATION_ID || process.env.GOOGLE_CLOUD_LOCATION_ID
	client_email = client_email || process.env.GOOGLE_CLOUD_BIGQUERY_CLIENT_EMAIL || process.env.GOOGLE_CLOUD_CLIENT_EMAIL
	private_key = private_key || process.env.GOOGLE_CLOUD_BIGQUERY_PRIVATE_KEY || process.env.GOOGLE_CLOUD_PRIVATE_KEY

	const errorHeader = credentials
		? 'The \'credentials\' argument is missing the required' 
		: jsonKeyFile 
			? `The service account JSON key file ${jsonKeyFile} is missing the required` 
			: 'None of the available methods to pass credentials to the BigQuery client (i.e., \'credentials\' object, \'jsonKeyFile\' path or environment variables) define the required'

	if (!projectId)
		throw new Error(`${errorHeader} 'project_id' field.`)
	if (!location_id)
		throw new Error(`${errorHeader} 'location_id' field.`)
	if (!client_email)
		throw new Error(`${errorHeader} 'client_email' field.`)
	if (!private_key)
		throw new Error(`${errorHeader} 'private_key' field.`)

	let __getToken
	if (getToken)
		__getToken = getToken
	else {
		const auth = googleAuth({ 
			credentials: {
				client_email,
				private_key
			},
			scopes: ['https://www.googleapis.com/auth/cloud-platform']
		})
		__getToken = () => _getToken(auth)
	}

	/**
	 * [description]
	 * @param  {[type]}  projectId 				[description]
	 * @param  {[type]}  db        				[description]
	 * @param  {[type]}  table     				[description]
	 * @param  {[type]}  data      				[description]
	 * @param  {[type]}  token     				[description]
	 * @param  {Boolean} options.safeMode   	[description]
	 * @param  {Number}  options.batchSize   	[description]
	 * @param  {Number}  options.batchCount 	[description]
	 * @return {[type]}           [description]
	 */
	const _retryInsert = (projectId, db, table, data, token, options={}) => {
		if (options.safeMode) {
			data = data || []
			let batchSize = (options || {}).batchSize || TWO_MB
			if (batchSize > TEN_MB)
				batchSize = TEN_MB
			const batchCount = (options || {}).batchCount || DEFAULT_MAX_ROW_INSERT

			const { batchRows, currentBatch } = data.filter(x => x).reduce((acc,d) => {
				const byteSize = JSON.stringify(d).length
				const newByteSize = acc.currentBatchByteSize + byteSize
				const newSize = acc.currentBatchSize + 1

				if (newByteSize >= batchSize || newSize >= batchCount) {
					if (acc.currentBatch.length > 0)
						acc.batchRows.push(acc.currentBatch)
					acc.currentBatchByteSize = byteSize
					acc.currentBatchSize = 1
					acc.currentBatch = [d]
				} else {
					acc.currentBatchByteSize = newByteSize
					acc.currentBatchSize = newSize
					acc.currentBatch.push(d)
				}
				
				return acc
			}, { currentBatchByteSize:0, currentBatchSize:0, currentBatch:[], batchRows:[] })

			if (currentBatch.length > 0)
				batchRows.push(currentBatch)

			return batchRows
				.reduce((job, dataBatch) => 
					job.then(() => _retryInsert(projectId, db, table, dataBatch, token, obj.merge(options, { safeMode: false }))), 
				Promise.resolve(null))
		} else
			return _retryFn(() => bigQuery.table.insert(projectId, db, table, data, token, options), options)
	}

	return {
		db: {
			'get': db => {
				if (!db)
					throw new Error('Missing required argument \'db\'')
				return { 
					name: db,
					table: (table) => ({
						name: table,
						'get': () => __getToken().then(token => bigQuery.table.get(projectId, db, table, token)).then(({ data }) => data),
						'exists': () => __getToken().then(token => bigQuery.table.get(projectId, db, table, token)).then(({ status, data }) =>{
							if (status >= 200 && status < 300)
								return true
							else if (status == 404)
								return false
							else {
								let e  = new Error('Unknown error')
								e.code = status
								e.data = data 
								throw e
							}
						}),
						insert: {
							fromStorage: ({ sources=[] }) => __getToken().then(token => bigQuery.table.loadData(projectId, db, table, sources, token)),
							/**
							 * [description]
							 * @param  {[type]}  data            			[description]
							 * @param  {[type]}  options.templateSuffix  	[description]
							 * @param  {Boolean} options.skipInvalidRows 	[description]
							 * @param  {[type]}  options.forcedSchema    	[description]
							 * @param  {[type]}  options.insert          	[description]
							 * @param  {Boolean} options.safeMode        	[description]
							 * @param  {Number}  options.batchSize   		[description]
							 * @param  {Number}  options.batchCount 		[description]
							 * @param  {[type]}  options.timeout         	[description]
							 * @return {[type]}                          	[description]
							 */
							values: ({ data, templateSuffix, skipInvalidRows=false, forcedSchema, insert, safeMode=false, batchSize, batchCount, timeout }) => __getToken().then(token => {
								const d = Array.isArray(data) ? data : [data]
								const dd = forcedSchema ? d.map(x => fitToSchema(x,forcedSchema)) : d
								const _insert = insert || _retryInsert
								return _insert(projectId, db, table, dd, token, { templateSuffix, skipInvalidRows, safeMode, timeout, batchSize, batchCount }).then(res => {
									res = res || {}
									res.payload = dd
									return res
								})
							}).then(_throwHttpErrorIfBadStatus)
						},
						create: {
							new: ({ schema={} }) => __getToken().then(token => bigQuery.table.create(projectId, db, table, schema, token)).then(({ data }) => data),
							fromStorage: ({ sources=[] }) => __getToken().then(token => bigQuery.table.createFromStorage(projectId, db, table, sources, token)).then(({ data }) => data)
						},
						schema: {
							isDiff: (schema) => __getToken().then(token => bigQuery.table.get(projectId, db, table, token)).then(({ data }) => {
								if (!schema)
									throw new Error('Missing required \'schema\' argument.')
								if (Object.keys(schema).length == 0)
									throw new Error('Wrong argument \'schema\'. This object must at least contain one property.')

								if (!data.schema || !(data.schema.fields || []).some(x => x))
									return true

								const currentSchema = fieldsToSchema(data.schema.fields)
								return !obj.same(schema, currentSchema)
							}),
							update: (schema) => __getToken().then(token => bigQuery.table.update(projectId, db, table, schema, token)).then(({ data }) => data)
						}
					}),
					query: {
						execute: ({ sql, params, pageSize=1000, timeout=10000, useLegacySql=false }) => __getToken()
							.then(token => _retryFn(
								() => bigQuery.query.execute(projectId, location_id, sql, params, token, { pageSize, timeout, useLegacySql }),
								{ timeout }))
							.then(_throwHttpErrorIfBadStatus)
							.then(({ data }) => data)
					},
					exists: () => __getToken().then(token => bigQuery.db.get(projectId, db, token)).then(({ status, data }) =>{
						if (status >= 200 && status < 300)
							return true
						else if (status == 404)
							return false
						else {
							let e  = new Error('Unknown error')
							e.code = status
							e.data = data 
							throw e
						}
					})
				}
			}
		},
		job: {
			'get': ({ jobId }) => __getToken().then(token => bigQuery.job.get(projectId, location_id, jobId, token))
		}
	}
}

module.exports = {
	format: require('./src/format'),
	client: {
		new: createClient
	}
}



