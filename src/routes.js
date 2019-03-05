const { applyToAllAsync, titleCase } = require('./helpers')
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
    const result = rows[0]
    if (!result) { throw new Error('Not found') }
    return result
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
    const query = { id: parseInt(req.params.id) }
    await sqlUpdate(pool, tableName, query, req.body)
    return req.body
  }

  const deleteRow = async function (pool, tableName, options, customHandlers, req) {
    const query = { id: parseInt(req.params.id) }
    await sqlDelete(pool, tableName, query)
    return query
  }

  const processAndRespond = async (pool, tableName, options, customHandlers, actionName, handlerFunction, req, res, next) => {
    try {
      const beforeActionName = `before${titleCase(actionName)}`
      if (customHandlers[beforeActionName] && beforeActionName !== 'beforeCreate') req.body = await customHandlers[beforeActionName](pool, req.body)

      let results = await handlerFunction(pool, tableName, options, customHandlers, req)

      const afterActionName = `after${titleCase(actionName)}`
      if (customHandlers[afterActionName]) results = await customHandlers[afterActionName](pool, results)

      res.json(results)
    } catch (err) {
      console.error('SQL:', err)
      const code = 400
      res.status(code).json({ code, message: err.message })
    }
  }

  // Set up routes
  server.get(`${rootRoute}`, processAndRespond.bind(this, pool, tableName, options, customHandlers, 'list', customHandlers.list || list))
  server.get(`${rootRoute}/:id`, processAndRespond.bind(this, pool, tableName, options, customHandlers, 'get', customHandlers.get || get))
  server.post(`${rootRoute}`, processAndRespond.bind(this, pool, tableName, options, customHandlers, 'create', customHandlers.create || create))
  server.put(`${rootRoute}/:id`, processAndRespond.bind(this, pool, tableName, options, customHandlers, 'update', customHandlers.update || update))
  server.delete(`${rootRoute}/:id`, processAndRespond.bind(this, pool, tableName, options, customHandlers, 'delete', customHandlers.delete || deleteRow))
}
