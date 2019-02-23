// applyToAll(func, obj1) or applyToAll(func, [obj1, obj2, ...])
module.exports.applyToAll = (func, objectOrArray) => objectOrArray.constructor === Array ? objectOrArray.map(func) : func(objectOrArray)

// applyToAllAsync(promiseFunction, obj1) or applyToAllAsync(promiseFunction, [obj1, obj2, ...])
module.exports.applyToAllAsync = async (promiseFunction, objectOrArray) => new Promise(async (resolve, reject) => {
  const objects = objectOrArray.constructor === Array ? objectOrArray : [objectOrArray]
  let errors, values
  for (let i = 0; i < objects.length; i++) {
    try {
      values = values || []
      values.push(await promiseFunction(objects[i]))
    } catch (err) {
      errors = errors || []
      errors.push(err)
    }
  }
  resolve({ errors, values })
})

module.exports.nullAllEmptyFields = obj => {
  for (var key in obj) {
    if (obj[key] === '') obj[key] = null
  }
}
