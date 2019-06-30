const { queryObjectToWhereClause, sqlFind } = require('./sql')

describe('sql.js', function () {
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

  it('should sqlFind to sort', async function () {
    const pool = jasmine.createSpyObj('pool', ['query'])
    pool.query.and.callFake((pool, tableName, query, options) => ({ rows: pool }))
    expect(
      await sqlFind(pool, 'people', { id: 5, sort: 'name' })
    ).toEqual(
      'SELECT * FROM people WHERE id=5 ORDER BY name NULLS LAST;'
    )
  })
})
