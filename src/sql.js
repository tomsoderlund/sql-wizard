//
// Name:    sql.js
// Purpose: Library for SQL functions
// Creator: Tom Söderlund
//

'use strict'

const { nullAllEmptyFields } = require('./helpers')

// ----- Helpers -----

const OPTION_KEYS = ['limit', 'sort', 'group', 'join', 'fields', 'any', 'startsWith', 'endsWith', 'contains']

const wrapIfString = value => isNaN(value) ? `'${value}'` : value

const includesSome = (collection1, collection2) => collection2.filter(childObj => collection1.includes(childObj))

const queryObjectToWhereClause = (queryObject, options = { startsWith: false, endsWith: false, contains: false }) => {
  // Check if options in search query
  const optionsInQuery = includesSome(Object.keys(queryObject), OPTION_KEYS)
  if (optionsInQuery.length) {
    console.warn(`[sql-wizard] Warning: Place these in 'options' parameter instead of 'query': ${optionsInQuery}`)
    for (const optionKey of OPTION_KEYS) {
      if (queryObject[optionKey]) options[optionKey] = true
    }
  }
  // Loop through all search query keys
  return Object.keys(queryObject).reduce(
    (result, key) => {
      // 'key' is an option (legacy), not a search query
      if (OPTION_KEYS.includes(key)) return result
      const combiner = options.any ? ' OR ' : ' AND '
      // Normal value
      const value = queryObject[key]
      const valueFirstChar = value ? value[0] : undefined
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
}

const queryObjectToOrderClause = (queryObject, options, { defaultValue = '' } = {}) => `ORDER BY ${options.sort || defaultValue} NULLS LAST`

// ----- SQL functions -----

// const [person] = await sqlFind(pool, 'person', { id: person.id })
const sqlFind = async (pool, tableName, query = {}, options = {}) => {
  const fields = options.fields ? options.fields.join(', ') : '*'
  const joinClause = options.join
    ? typeof options.join === 'string'
      ? `LEFT JOIN ${options.join} ON (${options.join}.${tableName}_id = ${tableName}.id)`
      : `LEFT JOIN ${options.join[0]} ON (${options.join[0]}.${tableName}_id = ${tableName}.id) LEFT JOIN ${options.join[1]} ON (${options.join[1]}.id = ${options.join[0]}.${options.join[1]}_id)`
    : ''
  const whereClause = queryObjectToWhereClause(query, options)
  const groupByClause = options.group ? `GROUP BY ${options.group}` : ''
  const orderClause = options.sort ? queryObjectToOrderClause(query, options) : ''
  const limitClause = options.limit ? `LIMIT ${options.limit}` : ''
  // Put it all together
  const sqlString = `SELECT ${fields} FROM ${tableName} ${joinClause} ${whereClause} ${groupByClause} ${orderClause} ${limitClause}`.replace(/ {2}/g, ' ').trim() + ';'
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
const sqlCreate = (pool, tableName, newValues, options = {}) => new Promise(async (resolve, reject) => {
  const fieldNames = Object.keys(newValues).join(', ')
  const fieldCounters = Object.keys(newValues).map((fieldName, index) => `$${index + 1}`).join(', ')
  nullAllEmptyFields(newValues)
  const insertQuery = {
    text: `INSERT INTO ${tableName} (${fieldNames}) VALUES (${fieldCounters}) RETURNING *;`,
    values: Object.values(newValues)
  }
  if (options && options.debug) console.log(insertQuery)
  try {
    // Create a new row
    const insertResults = await pool.query(insertQuery)
    resolve(insertResults.rows && insertResults.rows[0])
  } catch (err) {
    reject(err)
  }
})

// const { rowCount } = await sqlUpdate(pool, 'person', { id: person.id }, { person values... })
const sqlUpdate = async (pool, tableName, query, newValues, options = {}) => {
  const fieldDefinitions = Object.keys(newValues).map((fieldName, index) => `${fieldName} = ($${index + 1})`).join(', ')
  const whereClause = query ? queryObjectToWhereClause(query, options) : ''
  nullAllEmptyFields(newValues)
  const updateQuery = {
    text: `UPDATE ${tableName} SET ${fieldDefinitions} ${whereClause};`,
    values: [...Object.values(newValues)]
  }
  if (options && options.debug) console.log(updateQuery)
  const updateResults = await pool.query(updateQuery)
  return updateResults
}

// await sqlDelete(pool, 'person', { id: person.id })
const sqlDelete = async (pool, tableName, query, options = {}) => {
  const whereClause = query ? queryObjectToWhereClause(query, options) : ''
  const sqlString = `DELETE FROM ${tableName} ${whereClause};`
  if (options && options.debug) console.log(sqlString)
  await pool.query(sqlString)
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
