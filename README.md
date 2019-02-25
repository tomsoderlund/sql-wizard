# SQL Wizard

Library that helps generate SQL queries and Express REST routes.

## SQL helpers functions

	const { sql: { sqlFind, sqlCreate, sqlFindOrCreate, sqlUpdate, sqlDelete, sqlPopulate } } = require('sql-wizard')

### Find/search

	const people = await sqlFind(pool, 'person', { id: person.id })

### (Find or) Create

	const person = await sqlFindOrCreate(pool, 'person', { id: person.id }, { person values... })
	const person = await sqlCreate(pool, 'person', { person values... })

### Update

	const { rowCount } = await sqlUpdate(pool, 'person', { id: person.id }, { person values... })

### Delete

	await sqlDelete(pool, 'person', { id: person.id })

### Populate (add related data)

	await sqlPopulate(pool, company, 'people', 'company', 'person') --> company.people = [person1, person2...]


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

* `list`, `beforeList`, `afterList`
* `get`, `beforeGet`, `afterGet`
* `create`, `beforeCreate`, `afterCreate`
* `update`, `beforeUpdate`, `afterUpdate`
* `delete`, `beforeDelete`, `afterDelete`
