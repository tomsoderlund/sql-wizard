const { queryObjectToWhereClause, sqlFind, sqlUpdate, sqlDelete } = require('./sql')

describe('sql.js helpers', function () {
  it('should queryObjectToWhereClause with AND', async function () {
    expect(
      queryObjectToWhereClause({ name: 'Tom', email: 'Tom', limit: 1000 })
    ).toEqual(
      `WHERE name ILIKE 'Tom' AND email ILIKE 'Tom'`
    )
  })

  it('should queryObjectToWhereClause with startsWith and AND', async function () {
    expect(
      queryObjectToWhereClause({ startsWith: true, name: 'Tom', email: 'Tom', limit: 1000 })
    ).toEqual(
      `WHERE name ILIKE 'Tom%' AND email ILIKE 'Tom%'`
    )
  })

  it('should queryObjectToWhereClause with startsWith and OR', async function () {
    expect(
      queryObjectToWhereClause({ startsWith: true, name: 'Tom', email: 'Tom', any: true, limit: 1000 })
    ).toEqual(
      `WHERE name ILIKE 'Tom%' OR email ILIKE 'Tom%'`
    )
  })

  it('should queryObjectToWhereClause with contains', async function () {
    expect(
      queryObjectToWhereClause({ contains: true, name: 'Tom' })
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
})

describe('sql.js', function () {
  it('should sqlFind with <', async function () {
    const pool = jasmine.createSpyObj('pool', ['query'])
    pool.query.and.callFake((pool, tableName, query, options) => ({ rows: pool }))
    expect(
      await sqlFind(pool, 'people', { age: '>25' })
    ).toEqual(
      'SELECT * FROM people  WHERE age > 25;'
    )
  })

  it('should sqlFind with `contains`', async function () {
    const pool = jasmine.createSpyObj('pool', ['query'])
    pool.query.and.callFake((pool, tableName, query, options) => ({ rows: pool }))
    expect(
      await sqlFind(pool, 'people', { name: 'Sam' }, { contains: true })
    ).toEqual(
      'SELECT * FROM people  WHERE name ILIKE \'%Sam%\';'
    )
  })

  it('should sqlFind to sort', async function () {
    const pool = jasmine.createSpyObj('pool', ['query'])
    pool.query.and.callFake((pool, tableName, query, options) => ({ rows: pool }))
    expect(
      await sqlFind(pool, 'people', { id: 5, sort: 'name' })
    ).toEqual(
      'SELECT * FROM people  WHERE id=5 ORDER BY name NULLS LAST;'
    )
  })

  it('should sqlFind with a limit', async function () {
    const pool = jasmine.createSpyObj('pool', ['query'])
    pool.query.and.callFake((pool, tableName, query, options) => ({ rows: pool }))
    expect(
      await sqlFind(pool, 'people', { limit: 100 })
    ).toEqual(
      'SELECT * FROM people    LIMIT 100;'
    )
  })

  it('should sqlFind with a single join', async function () {
    const pool = jasmine.createSpyObj('pool', ['query'])
    pool.query.and.callFake((pool, tableName, query, options) => ({ rows: pool }))
    expect(
      await sqlFind(pool, 'company', { join: 'people' })
    ).toEqual(
      'SELECT * FROM company LEFT JOIN people ON (people.company_id = company.id);'
    )
  })

  it('should sqlFind with a double join', async function () {
    const pool = jasmine.createSpyObj('pool', ['query'])
    pool.query.and.callFake((pool, tableName, query, options) => ({ rows: pool }))
    expect(
      await sqlFind(pool, 'company', { join: ['company_people', 'people'] })
    ).toEqual(
      'SELECT * FROM company LEFT JOIN company_people ON (company_people.company_id = company.id) LEFT JOIN people ON (people.id = company_people.people_id);'
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
      await sqlDelete(pool, 'people', { person_id: 5, company_id: 12 }, { debug: true })
    ).toEqual(
      { person_id: 5, company_id: 12 }
    )
  })
})
