# SQL Wizard

Library that helps generate SQL queries and Express REST routes.


## SQL helpers functions

	const { sql: { sqlFind, sqlCreate, sqlFindOrCreate, sqlUpdate, sqlDelete, sqlPopulate } } = require('sql-wizard')

### Find/search

	const people = await sqlFind(pool, 'person', { id: person.id, sort: 'name' })

Greater/less than:

	await sqlFind(pool, 'person', { age: '>25' })

Wildcard text search:

	// You can replace `contains` with `startsWith` or `endsWith`
	await sqlFind(pool, 'person', { name: 'Sam' }, { contains: true })

Sort and limit:

	await sqlFind(pool, 'person', { sort: 'name' })
	await sqlFind(pool, 'person', { limit: 100 })

Single and double joins:

	await sqlFind(pool, 'company', { join: 'person' })
	await sqlFind(pool, 'company', { join: ['company_person', 'person'] })

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


## Creating REST routes with Express

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

* `list(pool, tableName, options, customHandlers, req)`, `beforeList(pool, req.body)`, `afterList(pool, result)`, `listFilter(req)`, `listSort(req)`
* `get(pool, tableName, options, customHandlers, req)`, `beforeGet(pool, req.body)`, `afterGet(pool, result)`
* `create(pool, tableName, options, customHandlers, req)`, `beforeCreate(pool, req.body)`, `afterCreate(pool, result)`
* `update(pool, tableName, options, customHandlers, req)`, `beforeUpdate(pool, req.body)`, `afterUpdate(pool, result)`
* `delete(pool, tableName, options, customHandlers, req)`, `beforeDelete(pool, req.body)`, `afterDelete(pool, result)`
