# SQL Wizard

Library that helps generate SQL queries and Express REST routes.


## SQL helpers functions

	const { sql: { sqlFind, sqlCreate, sqlFindOrCreate, sqlUpdate, sqlDelete, sqlPopulate } } = require('sql-wizard')

These functions are primarily designed for the `pg` Postgres library. `pool.query` is a function that takes an SQL string as first argument.

### Find/search

	const people = await sqlFind(pool, 'person', { id: person.id }, { sort: 'name' })

> **Note:** from version 1.5.0, you should place these in `options` instead of `query`: `limit`, `sort`, `group`, `join`, `fields`, `any`, `startsWith`, `endsWith`, `contains`

Do an `OR` search (match _any_, instead of _all_):

	await sqlFind(pool, 'person', { name: 'Tom', email: 'Tom' }, { any: true })

Greater/less than:

	await sqlFind(pool, 'person', { date_published: '>2020-09-25' })

Wildcard text search:

	// You can replace `contains` with `startsWith` or `endsWith`
	await sqlFind(pool, 'person', { name: 'Sam' }, { contains: true })

Sort and limit:

	await sqlFind(pool, 'person', undefined, { sort: 'name' })
	await sqlFind(pool, 'person', undefined, { limit: 100 })

Single and double joins:

	await sqlFind(pool, 'company', undefined, { join: 'person' })
	await sqlFind(pool, 'company', undefined, { join: ['company_person', 'person'] })

Custom fields and `GROUP BY`:

	await sqlFind(pool, 'company', undefined, { join: 'person', fields: ['company.name', 'count(person.id)'], group: 'company.name' })

### (Find or) Create

	const person = await sqlCreate(pool, 'person', { person values... })
	const person = await sqlFindOrCreate(pool, 'person', { id: person.id }, { person values... })

### Update

	const { rowCount } = await sqlUpdate(pool, 'person', { id: person.id }, { person values... })

### Delete

	await sqlDelete(pool, 'person', { id: person.id })

### Populate (add related data)

	await sqlPopulate(pool, company, 'people', 'company', 'person') --> company.people = [person1, person2...]

### Options

Use `debug: true` to print SQL string:

	await sqlUpdate(pool, 'person', { id: 5 }, { name: 'Charlie' }, { debug: true })


## Creating REST routes serverless (e.g. for Next.js and Vercel)

This is a great way of using a Postgres database (you can get a free database from [ElephantSQL](https://www.elephantsql.com/?ref=tomsoderlund)) in a serverless way.

Next.js example: set up a folder structure in `/pages/api` with a file (or folder) for each endpoint, e.g:

- 📁 `/pages/api`
	- 📁 `articles`
		- 📄 `index.js`
		- 📄 `[id].js`
	- 📁 `users`
		- 📄 `index.js`
		- 📄 `[id].js`

Then, for each endpoint, you need to use `createSqlRestRoutesServerless` like in this example endpoint for `articles`:

`/pages/api/articles.js`:

	import { createSqlRestRoutesServerless } from 'sql-wizard'
	const { config: { connectionString, allowedDomainsList } } = require('config/config')

	const articleRoutes = createSqlRestRoutesServerless.bind(undefined, 'article', undefined, { connectionString, allowedDomainsList })
	export default articleRoutes

And just like that, you have the following [CRUD](https://en.wikipedia.org/wiki/Create,_read,_update_and_delete) actions working:

- `GET /api/articles`: list rows (see also `listFilter`/`listSort` below)
- `GET /api/articles/[id]` (or `GET /api/articles?id=[id]`): get one row
- `POST /api/articles`: create new row
- `PUT`/`PATCH /api/articles`: update row `{ id }`
- `DELETE /api/articles`: delete row `{ id }`

### `customHandlers` parameter:

	const articleRoutes = createSqlRestRoutesServerless.bind(undefined, 'article', { beforeGet, afterCreate }, { connectionString, allowedDomainsList })

Allowed methods:

- `before[ActionName](pgClient, req.body) => newReqBody`
- `after[ActionName](pgClient, resultJson) => newResultJson`
- For list/`GET`:
	- `listFilter(req) => WHERE string`
	- `listSort(req) => ORDER BY string`

## Creating REST routes with a server (Express)

In `server.js`:

	// Express
	const server = require('express')()

	// Postgres (pg)
	const pool = new Pool({ connectionString: '...' })

	require('routes/kittens.js')(server, pool)

In e.g. `routes/kittens.js`:

	const { routes: { createSqlRestRoutes } } = require('sql-wizard')

	module.exports = (server, pool) => {
	  createSqlRestRoutes(server, pool, '/api/kittens', 'kitten', { /* place custom REST handlers here */ })
	}

### Custom REST handlers

- `list(pool, tableName, options, customHandlers, req)`, `beforeList(pool, req.body)`, `afterList(pool, result)`, `listFilter(req)`, `listSort(req)`
- `get(pool, tableName, options, customHandlers, req)`, `beforeGet(pool, req.body)`, `afterGet(pool, result)`
- `create(pool, tableName, options, customHandlers, req)`, `beforeCreate(pool, req.body)`, `afterCreate(pool, result)`
- `update(pool, tableName, options, customHandlers, req)`, `beforeUpdate(pool, req.body)`, `afterUpdate(pool, result)`
- `delete(pool, tableName, options, customHandlers, req)`, `beforeDelete(pool, req.body)`, `afterDelete(pool, result)`
