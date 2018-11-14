/**
 * Copyright (c) 2018, Neap Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/

const { assert } = require('chai')
const { client } = require('../index')

describe('index', () => {
	describe('#db.table(\'some-table\').insert.values', () => {
		it('Should rename all number properties.', () => {
			const getToken = () => Promise.resolve('123')
			const insert = () => Promise.resolve(null)
			const bigQuery = client.new({ jsonKeyFile: 'somepath', getToken, projectDetails: { project_id: 'test', location_id: 'test' } })
			const db = bigQuery.db.get('test-db')
			return db.table('some-table').insert.values({
				data: [{
					id: '123.23',
					firstname: 'Nicolas',
					age: new Date(2018,10,14),
					country: ['hello'],
					inserted_date: true
				}, {
					id: { hello: 'world' },
					name: { hello: 'world' },
					age: 23.98,
					country: {
						code: 12,
						name: 'USA'
					},
					friends: [{
						id: 23,
						score: 34.5
					}, {
						name: 'Rocky',
						score: 34.5
					}],
					inserted_date: new Date(2018,10,14)
				}],
				forcedSchema: {
					id: 'integer',
					name: 'string',
					age: 'integer',
					married: 'boolean',
					country: {
						code: 'string',
						name: 'string'
					},
					friends: [{
						id: 'integer',
						score: 'float'
					}],
					inserted_date: 'timestamp'
				},
				insert
			}).then(({ payload }) => {
				assert.strictEqual(payload[0].id, 123, '01')
				assert.strictEqual(payload[0].firstname, undefined, '02')
				assert.strictEqual(payload[0].age, 1542114000000, '03')
				assert.strictEqual(payload[0].country, null, '04')
				assert.strictEqual(payload[0].inserted_date, null, '05')
				assert.strictEqual(payload[1].id, null, '06')
				assert.strictEqual(payload[1].name, 'Object', '07')
				assert.strictEqual(payload[1].age, 24, '08')
				assert.strictEqual(payload[1].country.code, '12', '09')
				assert.strictEqual(payload[1].country.name, 'USA', '10')
				assert.strictEqual(payload[1].friends[0].id, 23, '11')
				assert.strictEqual(payload[1].friends[0].score, 34.5, '12')
				assert.strictEqual(payload[1].friends[1].name, undefined, '13')
				assert.strictEqual(payload[1].friends[1].score, 34.5, '14')
				assert.strictEqual(payload[1].inserted_date, '2018-11-13T13:00:00.000Z', '15')
			})
		})
	})
})