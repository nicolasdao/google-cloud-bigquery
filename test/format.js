/**
 * Copyright (c) 2018, Neap Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/

const { assert } = require('chai')
const { cleanData, fitToSchema, transpileSchema, bigQueryResultToJson } = require('../src/format')

const NULL_FLOAT = 5e-16

describe('format', () => {
	describe('#cleanData', () => {
		it('Should rename all number properties.', () => {
			const d = new Date()
			const obj_01 = {
				'123': {
					hello: 'world'
				},
				a: 'b',
				b: [
					{
						name: 'Nic',
						age: 37,
						'342': 'Trying to break things'
					}, 
					3, 
					d,
					[{
						'234': [{
							'432': { class: 3, age: 34 }
						}]
					}]
				]
			}

			const newObj_01 = cleanData(obj_01)
			assert.equal(Object.keys(newObj_01).length, 3, '01')
			assert.isOk(newObj_01['#123'], '02')
			assert.isOk(newObj_01.a, '03')
			assert.isOk(newObj_01.b, '04')
			assert.equal(newObj_01['#123'].hello, 'world', '05')
			assert.equal(newObj_01.a, 'b', '06')
			assert.equal(newObj_01.b.length, 4, '07')
			assert.equal(newObj_01.b[0].name, 'Nic', '08')
			assert.equal(newObj_01.b[0].age, 37, '09')
			assert.equal(newObj_01.b[0]['#342'], 'Trying to break things', '10')
			assert.equal(newObj_01.b[1], 3, '11')
			assert.equal(newObj_01.b[2], d, '12')
			assert.equal(newObj_01.b[3].length, 1, '13')
			assert.equal(newObj_01.b[3][0]['#234'].length, 1, '14')
			assert.equal(newObj_01.b[3][0]['#234'][0]['#432'].class, 3, '15')
			assert.equal(newObj_01.b[3][0]['#234'][0]['#432'].age, 34, '16')
		})
	})

	describe('#fitToSchema', () => {
		it('Should cast an object so it fits a schema.', () => {
			const schema = {
				id: 'integer',
				firstName: 'string',
				age: 'integer',
				address: {
					line1: 'string',
					line2: 'string',
					postcode: 'string'
				},
				friends: [{
					name: 'string',
					age: 'integer',
					dob: 'timestamp',
					married: 'boolean'
				}],
				tags: ['string'],
				note: 'string',
				size: 'float',
				score: 'float'
			}
			const obj_01 = {
				id: '123',
				firstName: 'Nicolas',
				lastName: 'Dao',
				age: 37.4,
				address: {
					line1: 'Waterloo, NSW 2017',
					postcode: 2017
				},
				score: 1
			}
			const newObj_01 = fitToSchema(obj_01, schema)
			assert.equal(newObj_01.id, 123, '01')
			assert.equal(newObj_01.firstName, 'Nicolas', '02')
			assert.isNotOk(newObj_01.lastName, '03')
			assert.equal(newObj_01.age, 37, '04')
			assert.equal(newObj_01.address.line1, 'Waterloo, NSW 2017', '05')
			assert.isNotOk(newObj_01.address.line2, '06')
			assert.equal(newObj_01.address.postcode, '2017', '07')
			assert.isNotOk(newObj_01.address._isNull, '08')
			assert.isNotOk(newObj_01.friends, '09')
			assert.isNotOk(newObj_01.tags, '15')
			assert.isNotOk(newObj_01.note, '16_B')
			assert.isNotOk(newObj_01.size, '16_C')
			assert.equal(newObj_01.score, 1, '16_D')

			const obj_02 = {
				id: '123',
				firstName: 'Nicolas',
				lastName: 'Dao',
				age: 37,
				friends: [{
					name: 'Brendan',
					age: 30.9,
					dob: new Date(1988,6,24),
					married: 'true'
				}, {
					name: 'Boris'
				}],
				tags:['banana', 123],
				size: '1.2',
				score: 1.1
			}
			const newObj_02 = fitToSchema(obj_02, schema)
			assert.equal(newObj_02.id, 123, '17')
			assert.equal(newObj_02.firstName, 'Nicolas', '18')
			assert.isNotOk(newObj_02.lastName, '19')
			assert.equal(newObj_02.age, 37, '20')
			assert.isNotOk(newObj_02.address, '21')
			assert.equal(newObj_02.friends.length, 2, '25')
			assert.isOk(newObj_02.friends[0]._isNull === undefined, '26')
			assert.equal(newObj_02.friends[0].name, 'Brendan', '27')
			assert.equal(newObj_02.friends[0].age, 31, '28')
			assert.equal(newObj_02.friends[0].dob, '1988-07-23T14:00:00.000Z', '29')
			assert.equal(newObj_02.friends[0].married, true, '30')
			assert.isOk(newObj_02.friends[1]._isNull === undefined, '31')
			assert.equal(newObj_02.friends[1].name, 'Boris', '32')
			assert.isNotOk(newObj_02.friends[1].age, '33')
			assert.isNotOk(newObj_02.friends[1].dob, '34')
			assert.isNotOk(newObj_02.friends[1].married, '35')
			assert.equal(newObj_02.tags.length, 2, '36')
			assert.equal(newObj_02.tags[0], 'banana', '37')
			assert.equal(newObj_02.tags[1], '123', '38')
			assert.isNotOk(newObj_02.note, '38_B')
			assert.equal(newObj_02.size, 1.2, '38_C')
			assert.equal(newObj_02.score, 1.1, '38_D')

			const obj_03 = {
				id: '123',
				firstName: '',
				lastName: 'Dao',
				age: 0,
				friends: {
					name: 'Brendan',
					age: 30,
					dob: new Date(1988,6,24).getTime(),
					married: 'true'
				},
				tags:['banana', 123, ''],
				note: new Date(1988,6,24),
				size: 1.1,
				score: { hello: 'world' }
			}
			const newObj_03 = fitToSchema(obj_03, schema)
			assert.equal(newObj_03.id, 123, '39')
			assert.equal(newObj_03.firstName, '', '40')
			assert.isNotOk(newObj_03.lastName, '41')
			assert.equal(newObj_03.age, 0, '42')
			assert.isNotOk(newObj_03.address, '43')
			assert.equal(newObj_03.friends.length, 1, '47')
			assert.isOk(newObj_03.friends[0]._isNull === undefined, '48')
			assert.equal(newObj_03.friends[0].name, 'Brendan', '49')
			assert.equal(newObj_03.friends[0].age, 30, '50')
			assert.equal(newObj_03.friends[0].dob, '1988-07-23T14:00:00.000Z', '51')
			assert.equal(newObj_03.friends[0].married, true, '52')
			assert.equal(newObj_03.tags.length, 3, '53')
			assert.equal(newObj_03.tags[0], 'banana', '54')
			assert.equal(newObj_03.tags[1], '123', '55')
			assert.equal(newObj_03.tags[2], '', '56')
			assert.equal(newObj_03.note, '1988-07-23T14:00:00.000Z', '57')
			assert.equal(newObj_03.size, 1.1, '58')
			assert.isNotOk(newObj_03.score, '59')
		})

		it('Should transform an object so it exactly fits a specific schema (\'exact\' mode).', () => {
			const schema = {
				id: 'integer',
				firstName: 'string',
				age: 'integer',
				address: {
					line1: 'string',
					line2: 'string',
					postcode: 'string'
				},
				friends: [{
					name: 'string',
					age: 'integer',
					dob: 'timestamp',
					married: 'boolean'
				}],
				tags: ['string'],
				note: 'string',
				size: 'float',
				score: 'float'
			}
			const obj_01 = {
				id: '123',
				firstName: 'Nicolas',
				lastName: 'Dao',
				age: 37,
				address: {
					line1: 'Waterloo, NSW 2017',
					postcode: 2017
				},
				score: 1
			}
			const newObj_01 = fitToSchema(obj_01, schema, { mode: 'exact' })
			assert.equal(newObj_01.id, 123, '01')
			assert.equal(newObj_01.firstName, 'string:Nicolas', '02')
			assert.isNotOk(newObj_01.lastName, '03')
			assert.equal(newObj_01.age, 37, '04')
			assert.equal(newObj_01.address.line1, 'string:Waterloo, NSW 2017', '05')
			assert.equal(newObj_01.address.line2, 'string:NULL', '06')
			assert.equal(newObj_01.address.postcode, 'string:2017', '07')
			assert.equal(newObj_01.address._isNull, false, '08')
			assert.equal(newObj_01.friends.length, 1, '09')
			assert.equal(newObj_01.friends[0]._isNull, true, '10')
			assert.equal(newObj_01.friends[0].name, 'string:NULL', '11')
			assert.equal(newObj_01.friends[0].age, -1, '12')
			assert.equal(newObj_01.friends[0].dob, '1970-01-01T00:00:00.000Z', '13')
			assert.equal(newObj_01.friends[0].married, false, '14')
			assert.equal(newObj_01.tags.length, 1, '15')
			assert.equal(newObj_01.tags[0], 'string:NULL', '16')
			assert.equal(newObj_01.note, 'string:NULL', '16_B')
			assert.equal(newObj_01.size, NULL_FLOAT, '16_C')
			assert.equal(newObj_01.score, 1+NULL_FLOAT, '16_D')

			const obj_02 = {
				id: '123.3',
				firstName: 'Nicolas',
				lastName: 'Dao',
				age: 37,
				friends: [{
					name: 'Brendan',
					age: 30,
					dob: new Date(1988,6,24),
					married: 'true'
				}, {
					name: 'Boris'
				}],
				tags:['banana', 123],
				size: '1.2',
				score: 1.1
			}
			const newObj_02 = fitToSchema(obj_02, schema, { mode: 'exact' })
			assert.equal(newObj_02.id, 123, '17')
			assert.equal(newObj_02.firstName, 'string:Nicolas', '18')
			assert.isNotOk(newObj_02.lastName, '19')
			assert.equal(newObj_02.age, 37, '20')
			assert.equal(newObj_02.address.line1, 'string:NULL', '21')
			assert.equal(newObj_02.address.line2, 'string:NULL', '22')
			assert.equal(newObj_02.address.postcode, 'string:NULL', '23')
			assert.equal(newObj_02.address._isNull, true, '24')
			assert.equal(newObj_02.friends.length, 2, '25')
			assert.equal(newObj_02.friends[0]._isNull, false, '26')
			assert.equal(newObj_02.friends[0].name, 'string:Brendan', '27')
			assert.equal(newObj_02.friends[0].age, 30, '28')
			assert.equal(newObj_02.friends[0].dob, '1988-07-23T14:00:00.000Z', '29')
			assert.equal(newObj_02.friends[0].married, true, '30')
			assert.equal(newObj_02.friends[1]._isNull, false, '31')
			assert.equal(newObj_02.friends[1].name, 'string:Boris', '32')
			assert.equal(newObj_02.friends[1].age, -1, '33')
			assert.equal(newObj_02.friends[1].dob, '1970-01-01T00:00:00.000Z', '34')
			assert.equal(newObj_02.friends[1].married, false, '35')
			assert.equal(newObj_02.tags.length, 2, '36')
			assert.equal(newObj_02.tags[0], 'string:banana', '37')
			assert.equal(newObj_02.tags[1], 'string:123', '38')
			assert.equal(newObj_02.note, 'string:NULL', '38_B')
			assert.equal(newObj_02.size, 1.2, '38_C')
			assert.equal(newObj_02.score, 1.1, '38_D')

			const obj_03 = {
				id: '123',
				firstName: '',
				lastName: 'Dao',
				age: 0,
				friends: {
					name: 'Brendan',
					age: 30,
					dob: new Date(1988,6,24),
					married: 'true'
				},
				tags:['banana', 123, ''],
				note: new Date(1988,6,24),
				size: 1.1,
				score: { hello: 'world' }
			}
			const newObj_03 = fitToSchema(obj_03, schema, { mode: 'exact' })
			assert.equal(newObj_03.id, 123, '39')
			assert.equal(newObj_03.firstName, 'string:NULL', '40')
			assert.isNotOk(newObj_03.lastName, '41')
			assert.equal(newObj_03.age, 0, '42')
			assert.equal(newObj_03.address.line1, 'string:NULL', '43')
			assert.equal(newObj_03.address.line2, 'string:NULL', '44')
			assert.equal(newObj_03.address.postcode, 'string:NULL', '45')
			assert.equal(newObj_03.address._isNull, true, '46')
			assert.equal(newObj_03.friends.length, 1, '47')
			assert.equal(newObj_03.friends[0]._isNull, false, '48')
			assert.equal(newObj_03.friends[0].name, 'string:Brendan', '49')
			assert.equal(newObj_03.friends[0].age, 30, '50')
			assert.equal(newObj_03.friends[0].dob, '1988-07-23T14:00:00.000Z', '51')
			assert.equal(newObj_03.friends[0].married, true, '52')
			assert.equal(newObj_03.tags.length, 3, '53')
			assert.equal(newObj_03.tags[0], 'string:banana', '54')
			assert.equal(newObj_03.tags[1], 'string:123', '55')
			assert.equal(newObj_03.tags[2], 'string:NULL', '56')
			assert.equal(newObj_03.note, 'string:1988-07-23T14:00:00.000Z', '57')
			assert.equal(newObj_03.size, 1.1, '58')
			assert.equal(newObj_03.score, NULL_FLOAT, '59')
		})
	})

	describe('#transpileSchema', () => {
		it('Should transform a schema to a Google BigQuery table schema', () => {
			const schema = {
				id: 'integer',
				firstName: 'string',
				age: 'integer',
				address: {
					line1: 'string',
					line2: 'string',
					postcode: 'string',
					country: {
						code: 'string',
						name: 'string'
					}
				},
				friends: [{
					name: 'string',
					age: 'integer',
					dob: 'timestamp',
					married: 'boolean',
					tags:['string']
				}],
				tags: ['string'],
				note: 'string',
				size: 'float'
			}

			const { fields=[] } = transpileSchema(schema)
			assert.equal(fields.length, 8, '01')

			let type, mode, _fields, __fields, ___fields
			let f = fields.find(({ name }) => name == 'id') || {}
			type = f.type; mode = f.mode; _fields = f.fields
			assert.equal(type, 'INTEGER', '02')
			assert.equal(mode, 'NULLABLE', '03')
			assert.equal(_fields, null, '04')

			f = fields.find(({ name }) => name == 'firstName') || {}
			type = f.type; mode = f.mode; _fields = f.fields
			assert.equal(type, 'STRING', '05')
			assert.equal(mode, 'NULLABLE', '06')
			assert.equal(_fields, null, '07')

			f = fields.find(({ name }) => name == 'age') || {}
			type = f.type; mode = f.mode; _fields = f.fields
			assert.equal(type, 'INTEGER', '08')
			assert.equal(mode, 'NULLABLE', '09')
			assert.equal(_fields, null, '10')

			f = fields.find(({ name }) => name == 'address') || {}
			type = f.type; mode = f.mode; _fields = f.fields
			assert.equal(type, 'RECORD', '11')
			assert.equal(mode, 'NULLABLE', '12')
			assert.equal(_fields.length, 4, '13')

			f = _fields.find(({ name }) => name == 'line1') || {}
			type = f.type; mode = f.mode; __fields = f.fields
			type = f.type; mode = f.mode; __fields = f.fields
			assert.equal(type, 'STRING', '14')
			assert.equal(mode, 'NULLABLE', '15')
			assert.equal(__fields, null, '16')

			f = _fields.find(({ name }) => name == 'line2') || {}
			type = f.type; mode = f.mode; __fields = f.fields
			assert.equal(type, 'STRING', '17')
			assert.equal(mode, 'NULLABLE', '18')
			assert.equal(__fields, null, '19')

			f = _fields.find(({ name }) => name == 'postcode') || {}
			type = f.type; mode = f.mode; __fields = f.fields
			assert.equal(type, 'STRING', '20')
			assert.equal(mode, 'NULLABLE', '21')
			assert.equal(__fields, null, '22')

			f = _fields.find(({ name }) => name == 'country') || {}
			type = f.type; mode = f.mode; __fields = f.fields
			assert.equal(type, 'RECORD', '20_B')
			assert.equal(mode, 'NULLABLE', '21_B')
			assert.equal(__fields.length, 2, '22_B')

			f = __fields.find(({ name }) => name == 'code') || {}
			type = f.type; mode = f.mode; ___fields = f.fields
			assert.equal(type, 'STRING', '20_C')
			assert.equal(mode, 'NULLABLE', '21_C')
			assert.equal(___fields, null, '22_C')

			f = __fields.find(({ name }) => name == 'name') || {}
			type = f.type; mode = f.mode; ___fields = f.fields
			assert.equal(type, 'STRING', '20_D')
			assert.equal(mode, 'NULLABLE', '21_D')
			assert.equal(___fields, null, '22_D')

			f = fields.find(({ name }) => name == 'friends') || {}
			type = f.type; mode = f.mode; _fields = f.fields
			assert.equal(type, 'RECORD', '23')
			assert.equal(mode, 'REPEATED', '24')
			assert.equal(_fields.length, 5, '25')

			f = _fields.find(({ name }) => name == 'name') || {}
			type = f.type; mode = f.mode; __fields = f.fields
			assert.equal(type, 'STRING', '26')
			assert.equal(mode, 'NULLABLE', '27')
			assert.equal(__fields, null, '28')

			f = _fields.find(({ name }) => name == 'age') || {}
			type = f.type; mode = f.mode; __fields = f.fields
			assert.equal(type, 'INTEGER', '29')
			assert.equal(mode, 'NULLABLE', '30')
			assert.equal(__fields, null, '31')

			f = _fields.find(({ name }) => name == 'dob') || {}
			type = f.type; mode = f.mode; __fields = f.fields
			assert.equal(type, 'TIMESTAMP', '32')
			assert.equal(mode, 'NULLABLE', '33')
			assert.equal(__fields, null, '34')

			f = _fields.find(({ name }) => name == 'married') || {}
			type = f.type; mode = f.mode; __fields = f.fields
			assert.equal(type, 'BOOLEAN', '35')
			assert.equal(mode, 'NULLABLE', '36')
			assert.equal(__fields, null, '37')

			f = _fields.find(({ name }) => name == 'tags') || {}
			type = f.type; mode = f.mode; __fields = f.fields
			assert.equal(type, 'STRING', '35_B')
			assert.equal(mode, 'REPEATED', '36_B')
			assert.equal(__fields, null, '37_B')

			f = fields.find(({ name }) => name == 'tags') || {}
			type = f.type; mode = f.mode; _fields = f.fields
			assert.equal(type, 'STRING', '38')
			assert.equal(mode, 'REPEATED', '39')
			assert.equal(_fields, null, '40')

			f = fields.find(({ name }) => name == 'note') || {}
			type = f.type; mode = f.mode; _fields = f.fields
			assert.equal(type, 'STRING', '41')
			assert.equal(mode, 'NULLABLE', '42')
			assert.equal(_fields, null, '43')

			f = fields.find(({ name }) => name == 'size') || {}
			type = f.type; mode = f.mode; _fields = f.fields
			assert.equal(type, 'FLOAT', '44')
			assert.equal(mode, 'NULLABLE', '45')
			assert.equal(_fields, null, '46')
		})
	})

	describe('#bigQueryResultToJson', () => {
		it('Should convert a BigQuery query result to a standard JSON object', () => {
			const bigQueryResult = {
				'kind': 'bigquery#queryResponse',
				'schema': {
					'fields': [{
						'name': 'id',
						'type': 'INTEGER',
						'mode': 'NULLABLE'
					},
					{
						'name': 'username',
						'type': 'STRING',
						'mode': 'NULLABLE'
					},
					{
						'name': 'friends',
						'type': 'RECORD',
						'mode': 'REPEATED',
						'fields': [{
							'name': 'id',
							'type': 'INTEGER',
							'mode': 'NULLABLE'
						},
						{
							'name': 'username',
							'type': 'STRING',
							'mode': 'NULLABLE'
						},
						{
							'name': 'score',
							'type': 'FLOAT',
							'mode': 'NULLABLE'
						}
						]
					},
					{
						'name': 'married',
						'type': 'BOOLEAN',
						'mode': 'NULLABLE'
					},
					{
						'name': 'tags',
						'type': 'STRING',
						'mode': 'REPEATED'
					},
					{
						'name': 'inserted_date',
						'type': 'TIMESTAMP',
						'mode': 'NULLABLE'
					}
					]
				},
				'jobReference': {
					'projectId': 'castle-gd5am',
					'jobId': 'job_MCgJsyvkb6IyOZSJ6VvmlUX3m9bY',
					'location': 'asia-northeast1'
				},
				'totalRows': '3',
				'rows': [{
					'f': [{
						'v': '2'
					},
					{
						'v': 'Brendan'
					},
					{
						'v': [{
							'v': {
								'f': [{
									'v': '1'
								},
								{
									'v': 'Nicolas'
								},
								{
									'v': '0.87'
								}
								]
							}
						},
						{
							'v': {
								'f': [{
									'v': '3'
								},
								{
									'v': 'Boris'
								},
								{
									'v': '0.9'
								}
								]
							}
						}
						]
					},
					{
						'v': null
					},
					{
						'v': []
					},
					{
						'v': '1.542161132368E9'
					}
					]
				},
				{
					'f': [{
						'v': '3'
					},
					{
						'v': 'Boris'
					},
					{
						'v': [{
							'v': {
								'f': [{
									'v': '1'
								},
								{
									'v': 'Nicolas'
								},
								{
									'v': '0.87'
								}
								]
							}
						},
						{
							'v': {
								'f': [{
									'v': '3'
								},
								{
									'v': 'Boris'
								},
								{
									'v': '0.9'
								}
								]
							}
						}
						]
					},
					{
						'v': null
					},
					{
						'v': []
					},
					{
						'v': '1.542161132368E9'
					}
					]
				}
				],
				'totalBytesProcessed': '0',
				'jobComplete': true,
				'cacheHit': false
			}

			const result = bigQueryResultToJson(bigQueryResult)
			assert.equal(result.length, 2, '01')
			assert.equal(result[0].id, 2, '02')
			assert.equal(result[0].username, 'Brendan', '03')
			assert.equal(result[0].friends.length, 2, '04')
			assert.equal(result[0].friends[0].id, 1, '05')
			assert.equal(result[0].friends[0].username, 'Nicolas', '06')
			assert.equal(result[0].friends[0].score, 0.87, '07')
			assert.equal(result[0].friends[1].id, 3, '08')
			assert.equal(result[0].friends[1].username, 'Boris', '09')
			assert.equal(result[0].friends[1].score, 0.9, '10')
			assert.equal(result[0].married, null, '11')
			assert.equal(result[0].tags.length, 0, '12')
			assert.equal(result[0].inserted_date.toISOString(), '2018-11-14T02:05:32.368Z', '13')
			assert.equal(result[1].id, 3, '02_B')
			assert.equal(result[1].username, 'Boris', '03_B')
			assert.equal(result[1].friends.length, 2, '04_B')
			assert.equal(result[1].friends[0].id, 1, '05_B')
			assert.equal(result[1].friends[0].username, 'Nicolas', '06_B')
			assert.equal(result[1].friends[0].score, 0.87, '07_B')
			assert.equal(result[1].friends[1].id, 3, '08_B')
			assert.equal(result[1].friends[1].username, 'Boris', '09_B')
			assert.equal(result[1].friends[1].score, 0.9, '10_B')
			assert.equal(result[1].married, null, '11_B')
			assert.equal(result[1].tags.length, 0, '12_B')
			assert.equal(result[1].inserted_date.toISOString(), '2018-11-14T02:05:32.368Z', '13_B')
		})
	})
})