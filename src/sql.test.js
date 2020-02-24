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
  it('should sqlFind to sort', async function () {
    const pool = jasmine.createSpyObj('pool', ['query'])
    pool.query.and.callFake((pool, tableName, query, options) => ({ rows: pool }))
    expect(
      await sqlFind(pool, 'people', { id: 5, sort: 'name' })
    ).toEqual(
      'SELECT * FROM people WHERE id=5 ORDER BY name NULLS LAST;'
    )
  })

  it('should sqlUpdate to update', async function () {
    const pool = jasmine.createSpyObj('pool', ['query'])
    pool.query.and.callFake((pool, tableName, query, options) => ({ rows: pool }))
    expect(
      await sqlUpdate(pool, 'person', { id: 5 }, { name: 'Charlie' }, { debug: true })
    ).toEqual(
      ''
    )
  })

  it('should sqlDelete to delete with multiple', async function () {
    const pool = jasmine.createSpyObj('pool', ['query'])
    pool.query.and.callFake((pool, tableName, query, options) => ({ rows: pool }))
    expect(
      await sqlDelete(pool, 'people', { person_id: 5, company_id: 12 }, { debug: true })
    ).toEqual(
      ''
    )
  })
})
