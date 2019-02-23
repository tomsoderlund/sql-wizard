# SQL Wizard

Library that helps generate SQL queries and Express REST routes.

## SQL helpers functions

	const { sql: { sqlFind, sqlCreate, sqlFindOrCreate, sqlUpdate, sqlDelete, sqlPopulate } } = require('sql-wizard')

	const [person] = await sqlFind(pool, 'person', { id: person.id })
	const person = await sqlFindOrCreate(pool, 'person', { id: person.id }, { person values... })

	const person = await sqlCreate(pool, 'person', { person values... })
	const { rowCount } = await sqlUpdate(pool, 'person', { id: person.id }, { person values... })
	await sqlDelete(pool, 'person', { id: person.id })

	await sqlPopulate(pool, company, 'people', 'company', 'person') --> company.people = [person1, person2...]


## Creating REST routes with Express

	const { routes: { createSqlRestRoutes } } = require('sql-wizard')

	module.exports = (server, pool) => {
	  createSqlRestRoutes(server, pool, '/api/kittens', 'kitten', { /* place custom REST handlers here */ })
	}
