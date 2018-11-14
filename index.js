/**
 * Copyright (c) 2018, Neap Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/

const googleAuth = require('google-auto-auth')
const bigQuery = require('./src')
const { fitToSchema } = require('./src/format')

const _getToken = auth => new Promise((onSuccess, onFailure) => auth.getToken((err, token) => err ? onFailure(err) : onSuccess(token)))
const _validateRequiredParams = (params={}) => Object.keys(params).forEach(p => {
	if (!params[p])
		throw new Error(`Parameter '${p}' is required.`)
})

/**
 * [description]
 * @param  {[type]} options.jsonKeyFile    [description]
 * @param  {[type]} options.getToken       Optional. Only used for unit test mocking
 * @param  {[type]} options.projectDetails Optional. Only used for unit test mocking
 * @return {[type]}                        [description]
 */
const createClient = ({ jsonKeyFile, getToken, projectDetails }) => {
	_validateRequiredParams({ jsonKeyFile })
	const { project_id:projectId, location_id } = projectDetails || require(jsonKeyFile)
	if (!projectId)
		throw new Error(`The service account JSON key file ${jsonKeyFile} does not contain a 'project_id' field.`)
	if (!location_id)
		throw new Error(`The service account JSON key file ${jsonKeyFile} does not contain a 'location_id' field.`)

	let __getToken
	if (getToken)
		__getToken = getToken
	else {
		const auth = googleAuth({ 
			keyFilename: jsonKeyFile,
			scopes: ['https://www.googleapis.com/auth/cloud-platform']
		})
		__getToken = () => _getToken(auth)
	}

	return {
		db: {
			'get': db => {
				if (!db)
					throw new Error('Missing required argument \'db\'')
				return { 
					table: (table) => ({
						'get': () => __getToken().then(token => bigQuery.table.get(projectId, db, table, token)),
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
							values: ({ data, templateSuffix, skipInvalidRows=false, forcedSchema, insert }) => __getToken().then(token => {
								const d = Array.isArray(data) ? data : [data]
								const dd = forcedSchema ? d.map(x => fitToSchema(x,forcedSchema)) : d
								const _insert = insert || bigQuery.table.insert
								return _insert(projectId, db, table, dd, token, { templateSuffix, skipInvalidRows }).then(res => {
									res = res || {}
									res.payload = dd
									return res
								})
							})
						},
						create: {
							new: ({ schema={} }) => __getToken().then(token => bigQuery.table.create(projectId, db, table, schema, token)),
							fromStorage: ({ sources=[] }) => __getToken().then(token => bigQuery.table.createFromStorage(projectId, db, table, sources, token))
						}
					}),
					query: {
						execute: ({ sql, params, pageSize=1000, timeout=10000, useLegacySql=false }) => __getToken()
							.then(token => bigQuery.query.execute(projectId, location_id, sql, params, token, { pageSize, timeout, useLegacySql }))
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



