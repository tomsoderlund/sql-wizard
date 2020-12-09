const { queryObjectToWhereClause, queryObjectToOrderClause, sqlFind, sqlUpdate, sqlDelete } = require('./sql')

describe('sql.js helpers', function () {
  it('should queryObjectToWhereClause with AND', async function () {
    expect(
      queryObjectToWhereClause({ name: 'Tom', email: 'Tom' }, { limit: 1000 })
    ).toEqual(
      `WHERE name ILIKE 'Tom' AND email ILIKE 'Tom'`
    )
  })

  it('should queryObjectToWhereClause with startsWith and AND', async function () {
    expect(
      queryObjectToWhereClause({ name: 'Tom', email: 'Tom' }, { startsWith: true, limit: 1000 })
    ).toEqual(
      `WHERE name ILIKE 'Tom%' AND email ILIKE 'Tom%'`
    )
  })

  it('should queryObjectToWhereClause with startsWith and OR', async function () {
    expect(
      queryObjectToWhereClause({ name: 'Tom', email: 'Tom' }, { any: true, startsWith: true, limit: 1000 })
    ).toEqual(
      `WHERE name ILIKE 'Tom%' OR email ILIKE 'Tom%'`
    )
  })

  it('should queryObjectToWhereClause with contains', async function () {
    expect(
      queryObjectToWhereClause({ name: 'Tom' }, { contains: true })
    ).toEqual(
      `WHERE name ILIKE '%Tom%'`
    )
  })

  it('should queryObjectToWhereClause with date larger than', async function () {
    expect(
      queryObjectToWhereClause({ start_date: '>2019-01-01' })
    ).toEqual(
      `WHERE start_date > '2019-01-01'`
    )
  })

  it('should queryObjectToOrderClause with date_created', async function () {
    expect(
      queryObjectToOrderClause({}, { sort: 'date_created' })
    ).toEqual(
      `ORDER BY date_created NULLS LAST`
    )
  })

  it('should queryObjectToOrderClause old parameters', async function () {
    expect(
      queryObjectToOrderClause({}, 'name')
    ).toEqual(
      'ORDER BY name NULLS LAST'
    )
  })
})

describe('sql.js', function () {
  it('should sqlFind with <', async function () {
    const pool = jasmine.createSpyObj('pool', ['query'])
    pool.query.and.callFake((pool, tableName, query, options) => ({ rows: pool }))
    expect(
      await sqlFind(pool, 'person', { age: '>25' })
    ).toEqual(
      'SELECT * FROM person WHERE age > 25;'
    )
  })

  it('should sqlFind with `contains` in options', async function () {
    const pool = jasmine.createSpyObj('pool', ['query'])
    pool.query.and.callFake((pool, tableName, query, options) => ({ rows: pool }))
    expect(
      await sqlFind(pool, 'person', { name: 'Sam' }, { contains: true })
    ).toEqual(
      'SELECT * FROM person WHERE name ILIKE \'%Sam%\';'
    )
  })

  it('should sqlFind with `contains` in query (legacy)', async function () {
    const pool = jasmine.createSpyObj('pool', ['query'])
    pool.query.and.callFake((pool, tableName, query, options) => ({ rows: pool }))
    expect(
      await sqlFind(pool, 'person', { name: 'Sam', contains: true })
    ).toEqual(
      'SELECT * FROM person WHERE name ILIKE \'%Sam%\';'
    )
  })

  it('should sqlFind to sort', async function () {
    const pool = jasmine.createSpyObj('pool', ['query'])
    pool.query.and.callFake((pool, tableName, query, options) => ({ rows: pool }))
    expect(
      await sqlFind(pool, 'person', { id: 5 }, { sort: 'name' })
    ).toEqual(
      'SELECT * FROM person WHERE id=5 ORDER BY name NULLS LAST;'
    )
  })

  it('should sqlFind with a limit', async function () {
    const pool = jasmine.createSpyObj('pool', ['query'])
    pool.query.and.callFake((pool, tableName, query, options) => ({ rows: pool }))
    expect(
      await sqlFind(pool, 'person', undefined, { limit: 100 })
    ).toEqual(
      'SELECT * FROM person   LIMIT 100;'
    )
  })

  it('should sqlFind with a single join', async function () {
    const pool = jasmine.createSpyObj('pool', ['query'])
    pool.query.and.callFake((pool, tableName, query, options) => ({ rows: pool }))
    expect(
      await sqlFind(pool, 'company', {}, { join: 'person' })
    ).toEqual(
      'SELECT * FROM company LEFT JOIN person ON (person.company_id = company.id);'
    )
  })

  it('should sqlFind with a double join', async function () {
    const pool = jasmine.createSpyObj('pool', ['query'])
    pool.query.and.callFake((pool, tableName, query, options) => ({ rows: pool }))
    expect(
      await sqlFind(pool, 'company', {}, { join: ['company_person', 'person'] })
    ).toEqual(
      'SELECT * FROM company LEFT JOIN company_person ON (company_person.company_id = company.id) LEFT JOIN person ON (person.id = company_person.person_id);'
    )
  })

  it('should sqlFind with a single join and custom fields', async function () {
    const pool = jasmine.createSpyObj('pool', ['query'])
    pool.query.and.callFake((pool, tableName, query, options) => ({ rows: pool }))
    expect(
      await sqlFind(pool, 'company', undefined, { join: 'person', fields: ['company.name', 'count(person.id)'], group: 'company.name' })
    ).toEqual(
      'SELECT company.name, count(person.id) FROM company LEFT JOIN person ON (person.company_id = company.id) GROUP BY company.name;'
    )
  })

  it('should sqlUpdate to update', async function () {
    const pool = jasmine.createSpyObj('pool', ['query'])
    pool.query.and.callFake((pool, tableName, query, options) => ({ rows: pool }))
    expect(
      await sqlUpdate(pool, 'person', { id: 5 }, { name: 'Charlie' }, { debug: true })
    ).toEqual(
      { rows: { text: 'UPDATE person SET name = ($1) WHERE id=5;', values: [ 'Charlie' ] } }
    )
  })

  it('should sqlDelete to delete with multiple', async function () {
    const pool = jasmine.createSpyObj('pool', ['query'])
    pool.query.and.callFake((pool, tableName, query, options) => ({ rows: pool }))
    expect(
      await sqlDelete(pool, 'person', { person_id: 5, company_id: 12 }, { debug: true })
    ).toEqual(
      { person_id: 5, company_id: 12 }
    )
  })
})
