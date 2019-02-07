# Google Cloud BigQuery &middot;  [![NPM](https://img.shields.io/npm/v/google-cloud-bigquery.svg?style=flat)](https://www.npmjs.com/package/google-cloud-bigquery) [![Tests](https://travis-ci.org/nicolasdao/google-cloud-bigquery.svg?branch=master)](https://travis-ci.org/nicolasdao/google-cloud-bigquery) [![License](https://img.shields.io/badge/License-BSD%203--Clause-blue.svg)](https://opensource.org/licenses/BSD-3-Clause) [![Neap](https://neap.co/img/made_by_neap.svg)](#this-is-what-we-re-up-to)
__*Google Cloud BigQuery*__ is a node.js package to maintain BigQuery table, either explicitely or using a Google Cloud Storage (including automatically updating the tables' schema).

# Table of Contents

> * [Install](#install) 
> * [How To Use It](#how-to-use-it) 
> * [Extra Precautions To Making Robust Queries](#extra-precautions-to-making-robust-queries)
> * [Useful Code Snippets](#snippets-to-put-it-all-together)
> * [About Neap](#this-is-what-we-re-up-to)
> * [License](#license)


# Install
```
npm i google-cloud-bigquery --save
```

# How To Use It

## Prerequisite

Before using this package, you must first:

1. Have a Google Cloud Account.

2. Have a both a BigQuery DB and a Bucket in the same region (the bucket is only in case you wish to maintain BigQuery schema using data stored a Google Cloud Storage). As of December 2018, BigQuery is only supported in the following locations:
	- asia-northeast1 (Tokyo)
	- asia-east1 (Taiwan)
	- asia-southeast1 (Singapore)
	- australia-southeast1 (Sydney)
	- europe-north1 (Finland)
	- europe-west2 (London)
	- us-east4 (Northern Virginia)
	- eu (Multi regions in the EU)
	- us (Multi regions in the US)

3. Have a Service Account set up with the following 2 roles:
	- `roles/bigquery.admin`
	- `roles/storage.objectAdmin` (only in case you wish to maintain BigQuery schema using data stored a Google Cloud Storage)

4. Get the JSON keys file for that Service Account above

5. Save that JSON key into a `service-account.json` file. Make sure it is located under a path that is accessible to your app (the root folder usually).

## Show Me The Code
### Creating A New Table

```js
const { join } = require('path')
const { client } = require('google-cloud-bigquery')

const bigQuery = client.new({ jsonKeyFile: join(__dirname, './service-account.json') })

// Assumes that 'your-dataset-id' already exists
const db = bigQuery.db.get('your-dataset-id')
const userTbl = db.table('user')

userTbl.exists()
	.then(yes => yes 
		? console.log(`Table '${userTbl.name}' already exists in DB '${db.name}'`)
		: userTbl.create.new({ 
			schema: {
				id: 'integer',
				username: 'string',
				friends: [{
					id: 'integer',
					username: 'string',
					score: 'float'
				}],
				country: {
					code: 'string',
					name: 'string'
				},
				married: 'boolean',
				tags:['string'],
				inserted_date: 'timestamp'
			} 
		}).then(() => console.log(`Table '${userTbl.name}' successfully added to DB '${db.name}'`)))
```

### Inserting Data

```js
userTbl.insert.values({ data:[{
		id: 1,
		username: 'Nicolas',
		inserted_date: new Date()
	}, {
		id: 2,
		username: 'Brendan',
		country: {
			code: 'AU',
			name: 'Australia'
		},
		friends:[{
			id: 1,
			username: 'Nicolas',
			score: 0.87
		}, {
			id: 3,
			username: 'Boris',
			score: 0.9
		}],
		inserted_date: new Date()
	}, {
		id: '3',
		username: 'Boris',
		tags:['admin',1],
		inserted_date: Date.now()/1000
	}]
})
```

#### IMPORTANT NOTE ABOUT QUOTAS AND LIMITS

Notice that the `data` input accept both single objects or array of objects. Though BigQuery can ingest up to 10,000 rows per request and 100,000 rows per seconds, it is recommended to keep the maximum amount of rows per request to 500. You can read more about the quotas and limits at [https://cloud.google.com/bigquery/quotas#streaming_inserts](https://cloud.google.com/bigquery/quotas#streaming_inserts).

To prevent inserting more than 500 rows per request, you can either code it yourself, or rely on our own implementation using the `safeMode` flag as follow:

```js
userTbl.insert.values({ data: lotsOfUsers, safeMode: true })
	.then(() => console.log(`All users inserted`))
```

This `safeMode` flag will check that there is less than 500 items in the _lotsOfUsers_ array. If there are more than 500 items, the array is broken down in batches of 500 items which are then inserted sequentially. That means that if you're inserting 5000 users, there will be 10 sequential request of 500 users.


### Getting Data

```js
db.query.execute({ 
	sql:`select * from ${db.name}.${userTbl.name} where id = @id`, 
	params: { id: 2 } 
})
.then(data => console.log(JSON.stringify(data, null, ' ')))

// Query Output
// ============
//
// [
//  {
//   "id": 2,
//   "username": "Brendan",
//   "friends": [
//    {
//     "id": 1,
//     "username": "Nicolas",
//     "score": 0.87
//    },
//    {
//     "id": 3,
//     "username": "Boris",
//     "score": 0.9
//    }
//   ],
//   "country": {
//    "code": "AU",
//    "name": "Australia"
//   },
//   "married": null,
//   "tags": [],
//   "inserted_date": "2018-11-14T03:17:16.830Z"
//  }
// ]

```

### Updating The Table's Schema

With BigQuery, only 2 types of updates are possible:
1. Adding new fields
2. Relaxing the constraint on a field from `REQUIRED` to `NULLABLE`

The second type of update is not usefull here as this project always creates nullable fields. The following example shows how to perform a schema update if the local schema is different from the current BigQuery schema:

```js

// Let's add a new 'deleted_date' field to our local schema
const newSchema = {
	id: 'integer',
	username: 'string',
	friends: [{
		id: 'integer',
		username: 'string',
		score: 'float'
	}],
	country: {
		code: 'string',
		name: 'string'
	},
	married: 'boolean',
	tags:['string'],
	inserted_date: 'timestamp',
	deleted_date: 'timestamp'
}

userTbl.schema.isDiff(newSchema)
	.then(yes => yes
		? Promise.resolve(console.log(`Schema changes detected. Updating now...`))
			.then(() => userTbl.schema.update(newSchema))
			.then(() => console.log(`Schema successfully updated.`))
		: console.log(`No schema updates found`)
	)
```

## Extra Precautions To Making Robust Queries
### Avoiding Schema Errors When Inserting Data

BigQuery casting capabilities are quite limited. When a type does not fit into the table, that row will either crashes the entire insert, or will be completely be ignored (we're using that last setting). To make sure that as much data is being inserted as possible, we've added an option called `forcedSchema` in the `db.table('some-table').insert.values` api:

```js
userTbl.insert.values({
	data:{
		id: '123.34',
		username: { hello: 'world' },
		inserted_date: new Date(2018,10,14)
	},
	forcedSchema:{
		id: 'integer',
		username: 'string',
		inserted_date: 'timestamp'
	}
})
```

Under the hood, this code will transform the data payload to the following:

```js
{
	id: 123,
	username: 'Object',
	inserted_date: '2018-11-13T13:00:00.000Z'
}
```

This object is guaranteed to comply to the schema. This will guarantee that all the data is inserted.

> Notice the usage of the `bigQuery.job.get` to check the status of the job. The signature of that api is as follow:
>	`bigQuery.job.get({ projectId: 'your-project-id', location: 'asia-northeast1', jobId: 'a-job-id' })`

### Avoiding Network Errors

Networks errors (e.g. socket hang up, connect ECONNREFUSED) are a fact of life. To deal with those undeterministic errors, this library uses a simple exponential back off retry strategy, which will reprocess your read or write request for 10 seconds by default. You can increase that retry period as follow:

```js
// Retry timeout for QUERIES
db.query.execute({ 
	sql:`select * from ${db.name}.${userTbl.name} where id = @id`, 
	params: { id: 2 },
	timeout: 30000		// 30 seconds retry period timeout
})

// Retry timeout for INSERTS
userTbl.insert.values({
	data: users,
	timeout: 30000 		// 30 seconds retry period timeout
})
```

## Snippets To Put It All Together
### Indempotent Script To Keep Your DB Tables In Sync

The code snippet below shows how you can create a new tables if they don't exist yet and update their schema if their schema has changed when compared with the local version. 

```js
const { join } = require('path')
const { client } = require('google-cloud-bigquery')
// The line below assumes you have a file 'schema.js' located under 'path-to-your-schema-file'
// organised in a way where the 'schema' object below is structured as follow:
// 	schema.table_01 	This is the schema of 'table_01'
//	schema.table_02 	This is the schema of 'table_02'
const schema = require('path-to-your-schema-file/schema.js')

const bigQuery = client.new({ jsonKeyFile: join(__dirname, './service-account.json') })
const db = bigQuery.db.get('your-dataset-id')

const tbl_01 = db.table('table_01')
const tbl_02 = db.table('table_02')

const maintainTablesScript = () => {
	console.log('\nChecking for BigQuery tables updates...')
	return [tbl_01, tbl_02].map(table => ({ table, schema: schema[table.name] })).reduce((job, { table, schema }) => job
		.then(() => 
			table.exists()
				.then(tableExists => tableExists
					? console.log(`  - Table '${table.name}': Table already exists in DB '${db.name}'.`)
					: Promise.resolve(console.log(`  - Table '${table.name}': Table not found. Creating it now...`))
						.then(() => table.create.new({ schema }))
						.then(() => console.log(`  - Table '${table.name}': Table successfully created.`))
				)
				.then(() => table.schema.isDiff(schema))
				.then(schemaHasChanged => schemaHasChanged
					? Promise.resolve(console.log(`  - Table '${table.name}': Schema changes detected in table. Updating now...`))
						.then(() => table.schema.update(schema))
						.then(() => console.log(`  - Table '${table.name}': Schema successfully updated.`))
					: console.log(`  - Table '${table.name}': No schema updates found.`)
				)
		)
		.catch(err => {
			console.log(`  - Table '${table.name}': Oops... An error occured: ${err.message}`)
		}), 
	Promise.resolve(null))
}

maintainTablesScript()
```

# This Is What We re Up To
We are Neap, an Australian Technology consultancy powering the startup ecosystem in Sydney. We simply love building Tech and also meeting new people, so don't hesitate to connect with us at [https://neap.co](https://neap.co).

Our other open-sourced projects:
#### GraphQL
* [__*graphql-serverless*__](https://github.com/nicolasdao/graphql-serverless): GraphQL (incl. a GraphiQL interface) middleware for [webfunc](https://github.com/nicolasdao/webfunc).
* [__*schemaglue*__](https://github.com/nicolasdao/schemaglue): Naturally breaks down your monolithic graphql schema into bits and pieces and then glue them back together.
* [__*graphql-s2s*__](https://github.com/nicolasdao/graphql-s2s): Add GraphQL Schema support for type inheritance, generic typing, metadata decoration. Transpile the enriched GraphQL string schema into the standard string schema understood by graphql.js and the Apollo server client.
* [__*graphql-authorize*__](https://github.com/nicolasdao/graphql-authorize.git): Authorization middleware for [graphql-serverless](https://github.com/nicolasdao/graphql-serverless). Add inline authorization straight into your GraphQl schema to restrict access to certain fields based on your user's rights.

#### React & React Native
* [__*react-native-game-engine*__](https://github.com/bberak/react-native-game-engine): A lightweight game engine for react native.
* [__*react-native-game-engine-handbook*__](https://github.com/bberak/react-native-game-engine-handbook): A React Native app showcasing some examples using react-native-game-engine.

#### Tools
* [__*aws-cloudwatch-logger*__](https://github.com/nicolasdao/aws-cloudwatch-logger): Promise based logger for AWS CloudWatch LogStream.

# License
Copyright (c) 2018, Neap Pty Ltd.
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
* Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
* Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
* Neither the name of Neap Pty Ltd nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL NEAP PTY LTD BE LIABLE FOR ANY
DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

<p align="center"><a href="https://neap.co" target="_blank"><img src="https://neap.co/img/neap_color_horizontal.png" alt="Neap Pty Ltd logo" title="Neap" height="89" width="200"/></a></p>
