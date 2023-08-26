const { Client } = require('pg')
const { sqlFind, sqlCreate, sqlUpdate, sqlDelete } = require('./sql')

const { handleRestRequest, CustomError } = require('./handleRestRequest')

// const articleRoutes = createSqlRestRoutesServerless.bind(undefined, 'article', {}, { connectionString, allowedHostsList })
module.exports = function createSqlRestRoutesServerless (tableName, customHandlers = {}, options = {}, req, res) {
  const getResponseForAction = (actionName, actionFunctionName) => {
    const currentActionFunctionName = actionFunctionName || actionName
    const currentActionFunction = customHandlers[currentActionFunctionName] ||
      (options.useDefaultHandlers !== false ? defaultHandlers[currentActionFunctionName] : throwErrorHandler)
    return runDatabaseFunctionAndSendResponse(
      pool => currentActionFunction(pool, tableName, options, customHandlers, req),
      { req, res, customHandlers, options, actionName }
    )
  }

  if (options.allowedHostsList !== undefined && !options.allowedHostsList.includes(req.headers.host)) throw new CustomError('Request not authorized', 401, { host: req.headers.host })

  return handleRestRequest(async (req, res) => {
    switch (req.method) {
      case 'GET': return Object.prototype.hasOwnProperty.call(req.query, 'id')
        ? getResponseForAction('get')
        : getResponseForAction('list')
      case 'POST': return getResponseForAction('create')
      case 'PUT': return getResponseForAction('update')
      case 'PATCH': return getResponseForAction('update')
      case 'DELETE': return getResponseForAction('delete', 'deleteRow')
      default: throw new CustomError('Method not allowed', 405)
    }
  }, { req, res })
}

// const results = await runDatabaseFunctionAndSendResponse(async (pool) => { ... })
const runDatabaseFunctionAndSendResponse = async function (functionToRun, { req, res, customHandlers, options, actionName }) {
  // Connect db
  const postgresOptions = {
    // connectionString: options.databaseUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
    ...options // should contain 'connectionString'
  }
  const client = new Client(postgresOptions)
  await client.connect()
  // SQL: customHandlers.before[ActionName]
  const beforeActionName = `before${titleCase(actionName)}`
  if (customHandlers[beforeActionName]) req.body = await customHandlers[beforeActionName](client, req.body)
  // Run function
  const resultsBeforeFix = await functionToRun(client)
  // SQL: customHandlers.after[ActionName]
  const afterActionName = `after${titleCase(actionName)}`
  const results = customHandlers[afterActionName]
    ? await customHandlers[afterActionName](client, resultsBeforeFix)
    : resultsBeforeFix
  // Release db
  await client.end()
  // return results
  res.statusCode = 200
  res.json(results)
}

const titleCase = str => str.replace(/(?:^|\s|[-"'([{])+\S/g, (c) => c.toUpperCase())

const remapCatchAllId = reqQuery => ({ ...reqQuery, id: parseInt(reqQuery.id) })

const defaultHandlers = {
  create: async function create (pool, tableName, options, customHandlers, req) {
    const rowData = customHandlers.beforeCreate
      ? await customHandlers.beforeCreate(pool, req.body)
      : req.body
    const results = await sqlCreate(pool, tableName, rowData)
    return results
  },

  list: async function list (pool, tableName, options, customHandlers, req) {
    const sqlString = `SELECT * FROM ${tableName}
    ${customHandlers.listFilter ? `WHERE ${customHandlers.listFilter(req)}` : ''}
    ${customHandlers.listSort ? `ORDER BY ${customHandlers.listSort(req)}` : ''};`
    const { rows } = await pool.query(sqlString)
    return rows
  },

  get: async function get (pool, tableName, options, customHandlers, req) {
    const query = remapCatchAllId(req.query)
    const [result] = await sqlFind(pool, tableName, query)
    if (!result) { throw new Error('Not found') }
    return result
  },

  update: async function update (pool, tableName, options, customHandlers, req) {
    const query = remapCatchAllId(req.query)
    await sqlUpdate(pool, tableName, query, req.body)
    return req.body
  },

  deleteRow: async function deleteRow (pool, tableName, options, customHandlers, req) {
    const query = remapCatchAllId(req.query)
    await sqlDelete(pool, tableName, query)
    return query
  }
}

const throwErrorHandler = (pool, tableName, options, customHandlers, req) => {
  throw new Error('API action is not allowed')
}
