//
// Name:    sql.js
// Purpose: Library for SQL functions
// Creator: Tom Söderlund
//

'use strict'

const { nullAllEmptyFields } = require('./helpers')

// ----- Helpers -----

const queryObjectToWhereClause = (queryObject, options = { startsWith: false }) => Object.keys(queryObject).reduce(
  (result, key) => {
    // Special keys
    if (['limit', 'sort', 'any', 'startsWith'].includes(key)) return result
    // Normal value
    const value = queryObject[key]
    const combiner = queryObject.any ? ' OR ' : ' AND '
    if (queryObject.startsWith) options.startsWith = true
    const opValue = isNaN(value)
      ? (value[0] === '<' || value[0] === '>') // e.g. { age: '<42' }
        ? { operator: value[0], value: value.slice(1) }
        : value.toLowerCase() === 'null' // e.g. { age: 'null' }
          ? { operator: ' IS ', value: 'NULL' }
          : value.toLowerCase() === '!null' // e.g. { age: '!null' }
            ? { operator: ' IS NOT ', value: 'NULL' }
            : { operator: ' ILIKE ', value: `'${value}${options.startsWith ? '%' : ''}'` } // e.g. { name: 'Tom' }
      : { operator: '=', value } // is a number, e.g. { age: 42 }
    return result + (value !== undefined && value !== ''
      ? (result.length ? combiner : 'WHERE ') + key + opValue.operator + opValue.value
      : '')
  },
  ''
)

const queryObjectToOrderClause = (queryObject, defaultValue = 'name') => (queryObject.sort || defaultValue) + ' NULLS LAST'

// ----- SQL functions -----

// const [person] = await sqlFind(pool, 'person', { id: person.id })
const sqlFind = async (pool, tableName, query, options) => {
  let whereClause = query ? queryObjectToWhereClause(query) : ''
  const sqlString = `SELECT * FROM ${tableName} ${whereClause};`
  const { rows } = await pool.query(sqlString)
  return rows
}

// const person = await sqlFindOrCreate(pool, 'person', { id: person.id }, { person values... })
const sqlFindOrCreate = async (pool, tableName, query, newValues, options) => {
  const existing = await sqlFind(pool, tableName, query, options)
  return existing && existing[0] ? existing[0] : sqlCreate(pool, tableName, newValues, options)
}

// const person = await sqlCreate(pool, 'person', { person values... })
const sqlCreate = (pool, tableName, newValues, options = { findRowByField: undefined }) => new Promise(async (resolve, reject) => {
  const fieldNames = Object.keys(newValues).join(', ')
  const fieldCounters = Object.keys(newValues).map((fieldName, index) => `$${index + 1}`).join(', ')
  nullAllEmptyFields(newValues)
  const insertQuery = {
    text: `INSERT INTO ${tableName}(${fieldNames}) VALUES(${fieldCounters})${options.findRowByField ? ` RETURNING ${options.findRowByField}` : ''};`,
    values: Object.values(newValues)
  }
  try {
    // Create a new row
    const insertResults = await pool.query(insertQuery)
    if (options.findRowByField) {
      // Find the newly created row
      const newRowId = insertResults.rows[0][options.findRowByField]
      const searchQuery = `SELECT * FROM ${tableName} WHERE ${options.findRowByField}=($1);`
      const { rows } = await pool.query(searchQuery, [newRowId])
      // Add id to row
      const completeRow = Object.assign({}, rows[0], insertResults.rows[0])
      resolve(completeRow)
    } else {
      resolve(insertResults)
    }
  } catch (err) {
    reject(err)
  }
})

// const { rowCount } = await sqlUpdate(pool, 'person', { id: person.id }, { person values... })
const sqlUpdate = async (pool, tableName, query, newValues) => {
  const fieldDefinitions = Object.keys(newValues).map((fieldName, index) => `${fieldName} = ($${index + 2})`).join(', ')
  const queryField = Object.keys(query)[0]
  const queryValue = Object.values(query)[0]
  nullAllEmptyFields(newValues)
  const updateQuery = {
    text: `UPDATE ${tableName} SET ${fieldDefinitions} WHERE ${queryField}=($1);`,
    values: [queryValue, ...Object.values(newValues)]
  }
  const updateResults = await pool.query(updateQuery)
  return updateResults
}

// await sqlDelete(pool, 'person', { id: person.id })
const sqlDelete = async (pool, tableName, query) => {
  const queryField = Object.keys(query)[0]
  const queryValue = Object.values(query)[0]
  const sqlString = `DELETE FROM ${tableName} WHERE ${queryField}=($1);`
  await pool.query(sqlString, [queryValue])
  return query
}

// await sqlPopulate(pool, company, 'people', 'company', 'person') --> company.people = [person1, person2...]
// NOTE: assumes existence of a table 'parentTableName_childTableName'
const sqlPopulate = async (pool, object, key, parentTableName, childTableName, options = { reverse: false, extraFields: [] }) => {
  const dataTable = options.reverse ? parentTableName : childTableName
  const sourceTable = options.reverse ? childTableName : parentTableName
  const sqlString = `SELECT DISTINCT ON (${dataTable})
${[`${dataTable}.*`, ...(options.extraFields || [])].join()}
FROM ${childTableName}
LEFT JOIN ${parentTableName}_${childTableName} ON (${childTableName}.id = ${parentTableName}_${childTableName}.${childTableName}_id)
LEFT JOIN ${parentTableName} ON (${parentTableName}.id = ${parentTableName}_id)
WHERE ${sourceTable}.id = ${object.id}
AND ${dataTable}.id IS NOT NULL;`
  const { rows } = await pool.query(sqlString)
  object[key] = rows
}

module.exports = {
  queryObjectToWhereClause,
  queryObjectToOrderClause,

  sqlFind,
  sqlCreate,
  sqlFindOrCreate,
  sqlUpdate,
  sqlDelete,
  sqlPopulate
}
