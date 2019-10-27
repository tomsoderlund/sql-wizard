//
// Name:    sql.js
// Purpose: Library for SQL functions
// Creator: Tom Söderlund
//

'use strict'

const { nullAllEmptyFields } = require('./helpers')

// ----- Helpers -----

const wrapIfString = value => isNaN(value) ? `'${value}'` : value

const queryObjectToWhereClause = (queryObject, options = { startsWith: false, endsWith: false, contains: false }) => Object.keys(queryObject).reduce(
  (result, key) => {
    // Special keys
    if (['limit', 'sort', 'any', 'startsWith', 'endsWith', 'contains'].includes(key)) return result
    // Options
    const copyOptions = ['startsWith', 'endsWith', 'contains']
    for (let o in copyOptions) {
      if (queryObject[copyOptions[o]]) options[copyOptions[o]] = true
    }
    // Normal value
    const value = queryObject[key]
    const valueFirstChar = value ? value[0] : undefined
    const combiner = queryObject.any ? ' OR ' : ' AND '
    const operatorAndValue = isNaN(value)
      ? (valueFirstChar === '<' || valueFirstChar === '>') // e.g. { age: '<42' }
        ? { operator: ` ${valueFirstChar} `, value: wrapIfString(value.slice(1)) }
        : value.toLowerCase() === 'null' // e.g. { age: 'null' }
          ? { operator: ' IS ', value: 'NULL' }
          : value.toLowerCase() === '!null' // e.g. { age: '!null' }
            ? { operator: ' IS NOT ', value: 'NULL' }
            : { operator: ' ILIKE ', value: `'${options.endsWith || options.contains ? '%' : ''}${value}${options.startsWith || options.contains ? '%' : ''}'` } // e.g. { name: 'Tom' }
      : { operator: '=', value } // is a number, e.g. { age: 42 }
    return result + (value !== undefined && value !== ''
      ? (result.length ? combiner : 'WHERE ') + key + operatorAndValue.operator + operatorAndValue.value
      : '')
  },
  ''
)

const queryObjectToOrderClause = (queryObject, defaultValue) => `ORDER BY ${queryObject.sort || defaultValue} NULLS LAST`

// ----- SQL functions -----

// const [person] = await sqlFind(pool, 'person', { id: person.id })
const sqlFind = async (pool, tableName, query, options = {}) => {
  const whereClause = query ? queryObjectToWhereClause(query, options) : ''
  const orderClause = (query && query.sort) ? queryObjectToOrderClause(query) : ''
  const sqlString = `SELECT * FROM ${tableName} ${whereClause} ${orderClause};`
  if (options && options.debug) console.log(sqlString)
  const { rows } = await pool.query(sqlString)
  return rows
}

// const person = await sqlFindOrCreate(pool, 'person', { id: person.id }, { person values... })
const sqlFindOrCreate = async (pool, tableName, query, newValues, options = {}) => {
  const existing = await sqlFind(pool, tableName, query, options)
  return existing && existing[0] ? existing[0] : sqlCreate(pool, tableName, newValues, options)
}

// const person = await sqlCreate(pool, 'person', { person values... })
const sqlCreate = (pool, tableName, newValues, options = { findRowByField: undefined }) => new Promise(async (resolve, reject) => {
  const fieldNames = Object.keys(newValues).join(', ')
  const fieldCounters = Object.keys(newValues).map((fieldName, index) => `$${index + 1}`).join(', ')
  nullAllEmptyFields(newValues)
  const insertQuery = {
    // findRowByField can actually be multiple comma-separated values here
    text: `INSERT INTO ${tableName}(${fieldNames}) VALUES(${fieldCounters})${options.findRowByField ? ` RETURNING ${options.findRowByField}` : ''};`,
    values: Object.values(newValues)
  }
  if (options && options.debug) console.log(insertQuery)
  try {
    // Create a new row
    const insertResults = await pool.query(insertQuery)
    // Current limitation: Can only find the new row if 1 findRowByField - if multiple: process 'rows' manually.
    if (options.findRowByField && !options.findRowByField.includes(',')) {
      // Find the newly created row
      const newRowId = insertResults.rows[0][options.findRowByField]
      const searchQuery = `SELECT * FROM ${tableName} WHERE ${options.findRowByField}=($1);`
      if (options && options.debug) console.log(searchQuery)
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
const sqlUpdate = async (pool, tableName, query, newValues, options = {}) => {
  const fieldDefinitions = Object.keys(newValues).map((fieldName, index) => `${fieldName} = ($${index + 2})`).join(', ')
  const queryField = Object.keys(query)[0]
  const queryValue = Object.values(query)[0]
  nullAllEmptyFields(newValues)
  const updateQuery = {
    text: `UPDATE ${tableName} SET ${fieldDefinitions} WHERE ${queryField}=($1);`,
    values: [queryValue, ...Object.values(newValues)]
  }
  if (options && options.debug) console.log(updateQuery)
  const updateResults = await pool.query(updateQuery)
  return updateResults
}

// await sqlDelete(pool, 'person', { id: person.id })
const sqlDelete = async (pool, tableName, query, options = {}) => {
  const queryField = Object.keys(query)[0]
  const queryValue = Object.values(query)[0]
  const sqlString = `DELETE FROM ${tableName} WHERE ${queryField}=($1);`
  if (options && options.debug) console.log(sqlString)
  await pool.query(sqlString, [queryValue])
  return query
}

// await sqlPopulate(pool, company, 'people', 'company', 'person') --> company.people = [person1, person2...]
// NOTE: assumes existence of a table 'parentTableName_childTableName'
const sqlPopulate = async (pool, object, key, parentTableName, childTableName, options = { sort: undefined, reverse: false, extraFields: [] }) => {
  const dataTable = options.reverse ? parentTableName : childTableName
  const sourceTable = options.reverse ? childTableName : parentTableName
  const sqlString = `SELECT DISTINCT ON (${dataTable})
${[`${dataTable}.*`, ...(options.extraFields || [])].join()}
FROM ${childTableName}
LEFT JOIN ${parentTableName}_${childTableName} ON (${childTableName}.id = ${parentTableName}_${childTableName}.${childTableName}_id)
LEFT JOIN ${parentTableName} ON (${parentTableName}.id = ${parentTableName}_id)
WHERE ${sourceTable}.id = ${object.id}
AND ${dataTable}.id IS NOT NULL
${options.sort ? `ORDER BY ${options.sort}` : ''};`
  if (options && options.debug) console.log(sqlString)
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
