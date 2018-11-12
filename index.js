/**
 * Copyright (c) 2018, Neap Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/

const googleAuth = require('google-auto-auth')
const { fetch } = require('./utils')

// BigQuery Jobs APIs doc: https://cloud.google.com/bigquery/docs/reference/rest/v2/jobs/insert

const getToken = auth => new Promise((onSuccess, onFailure) => auth.getToken((err, token) => err ? onFailure(err) : onSuccess(token)))

const BIGQUERY_JOBS_URL = projectId => `https://www.googleapis.com/bigquery/v2/projects/${projectId}/jobs`
//const BIGQUERY_QUERY_URL = (projectId, locationId, queryId) => `https://www.googleapis.com/bigquery/v2/projects/${projectId}/queries/${queryId}?location=${locationId}`
const BIGQUERY_JOB_URL = (projectId, locationId, jobId) => `https://www.googleapis.com/bigquery/v2/projects/${projectId}/jobs/${jobId}?location=${locationId}`

const _validateRequiredParams = (params={}) => Object.keys(params).forEach(p => {
	if (!params[p])
		throw new Error(`Parameter '${p}' is required.`)
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

const createTable = (projectId, db, table, sources=[], token) => Promise.resolve(null).then(() => {
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

const _dealWithError = (res, projectId) => {
	if (res && res.data.status && res.data.status.errorResult && res.data.status.errorResult.message && res.data.status.errorResult.message.toLowerCase().indexOf('access denied: file') >= 0) {
		const storages = res.data.status.errorResult.message.toLowerCase().replace('access denied: file ', '').replace(': access denied', '')
		throw new Error(`Access denied. You don't have enough permissions to access the storage location ${storages}. Please make sure the Agent using the BigQuery api in project ${projectId} has the following roles: storage.objectAdmin, bigquery.admin`)
	}
	return res
}

const getJob = (projectId, locationId, jobId, token) => fetch.get(
	BIGQUERY_JOB_URL(projectId, locationId, jobId), {
		'Content-Type': 'application/json',
		Authorization: `Bearer ${token}`
	})

const createClient = ({ jsonKeyFile }) => {
	_validateRequiredParams({ jsonKeyFile })

	const auth = googleAuth({ 
		keyFilename: jsonKeyFile,
		scopes: ['https://www.googleapis.com/auth/cloud-platform']
	})

	return {
		table: {
			loadData: {
				fromStorage: ({ projectId, db, table, sources=[] }) => getToken(auth).then(token => loadData(projectId, db, table, sources, token))
			},
			create: {
				fromStorage: ({ projectId, db, table, sources=[] }) => getToken(auth).then(token => createTable(projectId, db, table, sources, token))
			}
		},
		job: {
			'get': ({ projectId, location, jobId }) => getToken(auth).then(token => getJob(projectId, location, jobId, token))
		}
	}
}

module.exports = {
	format: require('./src/format'),
	client: {
		new: createClient
	}
}



