const { applyToAllAsync } = require('./helpers')
const { sqlFind, sqlCreate, sqlUpdate, sqlDelete } = require('./sql')

// Set up CRUD routes: createSqlRestRoutes(server, pool, '/api/items', 'item', { create: (pool, tableName, options, customHandlers, req) => {} }, options)
module.exports.createSqlRestRoutes = function (server, pool, rootRoute, tableName, customHandlers = {}, options = {}) {
  const list = async (pool, tableName, options, customHandlers, req) => {
    const sqlString = `SELECT * FROM ${tableName}
    ${customHandlers.listFilter ? `WHERE ${customHandlers.listFilter(req)}` : ''}
    ${customHandlers.listSort ? `ORDER BY ${customHandlers.listSort(req)}` : ''};`
    const { rows } = await pool.query(sqlString)
    return rows
  }

  const get = async function (pool, tableName, options, customHandlers, req) {
    const rows = await sqlFind(pool, tableName, req.params)
    if (!rows[0]) { throw new Error('Not found') }
    if (customHandlers.afterGet) rows[0] = await customHandlers.afterGet(pool, rows[0])
    return rows[0]
  }

  const create = async function (pool, tableName, options, customHandlers, req) {
    const createOne = rowData => new Promise(async (resolve, reject) => {
      try {
        if (customHandlers.beforeCreate) rowData = await customHandlers.beforeCreate(pool, rowData)
        resolve(await sqlCreate(pool, tableName, rowData, { findRowByField: 'name' }))
      } catch (err) {
        reject(err)
      }
    })
    const results = await applyToAllAsync(createOne, req.body)
    return results.values
  }

  const update = async function (pool, tableName, options, customHandlers, req) {
    if (customHandlers.beforeUpdate) req.body = await customHandlers.beforeUpdate(pool, req.body)
    const query = { id: parseInt(req.params.id) }
    await sqlUpdate(pool, tableName, query, req.body)
    return req.body
  }

  const deleteRow = async function (pool, tableName, options, customHandlers, req) {
    const query = { id: parseInt(req.params.id) }
    await sqlDelete(pool, tableName, query)
    return query
  }

  const processAndRespond = async (pool, tableName, options, customHandlers, handlerFunction, req, res, next) => {
    try {
      const results = await handlerFunction(pool, tableName, options, customHandlers, req)
      res.json(results)
    } catch (err) {
      console.error('SQL:', err)
      const code = 400
      res.status(code).json({ code, message: err.message })
    }
  }

  // Set up routes
  server.get(`${rootRoute}`, processAndRespond.bind(this, pool, tableName, options, customHandlers, customHandlers.list || list))
  server.get(`${rootRoute}/:id`, processAndRespond.bind(this, pool, tableName, options, customHandlers, customHandlers.get || get))
  server.post(`${rootRoute}`, processAndRespond.bind(this, pool, tableName, options, customHandlers, customHandlers.create || create))
  server.put(`${rootRoute}/:id`, processAndRespond.bind(this, pool, tableName, options, customHandlers, customHandlers.update || update))
  server.delete(`${rootRoute}/:id`, processAndRespond.bind(this, pool, tableName, options, customHandlers, customHandlers.delete || deleteRow))
}
